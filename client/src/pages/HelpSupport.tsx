import { Layout } from "@/components/ui/Layout";
import { Link } from "wouter";
import { ArrowLeft, Phone, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useCreateSupportTicket } from "@/hooks/use-support-tickets";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { sanitizeInput, validateTicketForm, checkRateLimit } from "@/lib/security";

export default function HelpSupport() {
  const { user } = useAuth();
  const createTicket = useCreateSupportTicket();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    issueType: '' as 'account' | 'payment' | 'ride' | 'driver_verification' | 'technical' | 'other' | '',
    subject: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
  });

  const [submitted, setSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const issueTypes = [
    { value: 'account', label: 'Account Issues' },
    { value: 'payment', label: 'Payment Problems' },
    { value: 'ride', label: 'Ride Issues' },
    { value: 'driver_verification', label: 'Driver Verification' },
    { value: 'technical', label: 'Technical Issues' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});

    // Rate limiting check
    if (!checkRateLimit(user?.uid || '')) {
      toast({
        title: "Please wait",
        description: "You can only submit one ticket every 5 seconds",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    const validation = validateTicketForm(formData);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      toast({
        title: "Validation Error",
        description: "Please check the highlighted fields",
        variant: "destructive",
      });
      return;
    }

    // Sanitize inputs
    const sanitizedData = {
      issueType: formData.issueType,
      subject: sanitizeInput(formData.subject),
      description: sanitizeInput(formData.description),
      priority: formData.priority,
    };

    createTicket.mutate(
      {
        issueType: sanitizedData.issueType as any,
        subject: sanitizedData.subject,
        description: sanitizedData.description,
        priority: sanitizedData.priority,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setFormData({
            issueType: '',
            subject: '',
            description: '',
            priority: 'medium',
          });

          setTimeout(() => {
            setSubmitted(false);
          }, 5000);

          toast({
            title: "Support Ticket Created!",
            description: "We'll get back to you within 24 hours",
            className: "bg-green-50 border-green-200 text-green-900",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to create support ticket. Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <Layout headerTitle="Help & Support" showNav={true}>
      <div className="px-4 py-6 pb-24 max-w-2xl mx-auto">
        <Link href="/settings">
          <button className="flex items-center gap-2 text-primary hover:text-primary/80 mb-6 cursor-pointer transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back to Settings</span>
          </button>
        </Link>

        <div className="space-y-6">
          {/* Quick Support Options */}
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-white rounded-2xl p-4 border border-border/50 hover:shadow-md transition-shadow">
              <Phone size={24} className="text-primary mb-2" />
              <p className="text-sm font-semibold">Call Us</p>
              <p className="text-xs text-muted-foreground">+1-800-OFFICERIDES</p>
            </button>
            <button className="bg-white rounded-2xl p-4 border border-border/50 hover:shadow-md transition-shadow">
              <Mail size={24} className="text-primary mb-2" />
              <p className="text-sm font-semibold">Email</p>
              <p className="text-xs text-muted-foreground">support@officerides.com</p>
            </button>
          </div>

          {/* Support Ticket Form */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
            <h2 className="text-xl font-bold text-foreground mb-1">Create Support Ticket</h2>
            <p className="text-sm text-muted-foreground mb-6">Describe your issue and we'll help you out</p>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <div className="flex justify-center mb-4">
                  <CheckCircle size={48} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-green-900 mb-2">Ticket Submitted Successfully!</h3>
                <p className="text-sm text-green-800 mb-4">
                  Our support team will review your issue and get back to you within 24 hours.
                </p>
                <p className="text-xs text-green-700">
                  You can track your ticket status in your email.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Issue Type */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Issue Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.issueType}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-border rounded-lg outline-none text-sm bg-white focus:border-primary transition-colors"
                  >
                    <option value="">Select an issue type</option>
                    {issueTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Subject <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Brief summary of your issue"
                    maxLength={100}
                    className={`w-full px-3 py-2 border rounded-lg outline-none text-sm transition-colors ${
                      fieldErrors.subject ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${
                      fieldErrors.subject ? 'text-red-500 font-semibold' : 'text-muted-foreground'
                    }`}>
                      {fieldErrors.subject || `${formData.subject.length}/100`}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Please provide detailed information about your issue..."
                    rows={5}
                    maxLength={5000}
                    className={`w-full px-3 py-2 border rounded-lg outline-none text-sm transition-colors resize-none ${
                      fieldErrors.description ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className={`text-xs ${
                      fieldErrors.description ? 'text-red-500 font-semibold' : 'text-muted-foreground'
                    }`}>
                      {fieldErrors.description || `${formData.description.length}/5000`}
                    </p>
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-2">Priority</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['low', 'medium', 'high', 'urgent'] as const).map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, priority: level }))}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all capitalize ${
                          formData.priority === level
                            ? 'bg-primary text-white shadow-lg'
                            : 'bg-secondary/50 text-foreground hover:bg-secondary'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Info Message */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-3 mt-4">
                  <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1">Response Time</p>
                    <p className="text-xs text-blue-800">
                      We typically respond to <strong>urgent</strong> issues within 2-4 hours, <strong>high</strong> priority within 8 hours, and others within 24 hours.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={createTicket.isPending}
                  className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
                >
                  {createTicket.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating Ticket...
                    </>
                  ) : (
                    "Create Support Ticket"
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-secondary/30 rounded-2xl p-4">
            <p className="text-sm font-semibold text-foreground mb-2">Prefer direct contact?</p>
            <p className="text-xs text-muted-foreground">
              Email us at <span className="font-semibold text-primary">support@officerides.com</span> or call <span className="font-semibold text-primary">+1-800-OFFICERIDES</span>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
