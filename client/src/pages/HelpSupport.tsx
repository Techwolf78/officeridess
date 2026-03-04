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

        <div className="space-y-4">
          {/* Quick Support Options - compact */}
          <div className="bg-white rounded-2xl shadow-sm border border-border/50 p-3 grid grid-cols-2 gap-3">
            <a href="tel:+1800OFFICERIDES" className="flex flex-col items-start gap-1 p-3 rounded-lg hover:bg-secondary/20 transition-colors">
              <div className="w-8 h-8 rounded-md bg-primary/5 flex items-center justify-center text-primary">
                <Phone size={16} />
              </div>
              <p className="text-sm font-medium">Call Us</p>
              <p className="text-xs text-muted-foreground">+1-800-OFFICE-RIDES</p>
            </a>
            <a href="mailto:support@officerides.com" className="flex flex-col items-start gap-1 p-3 rounded-lg hover:bg-secondary/20 transition-colors">
              <div className="w-8 h-8 rounded-md bg-primary/5 flex items-center justify-center text-primary">
                <Mail size={16} />
              </div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-xs text-muted-foreground">support@officerides.com</p>
            </a>
          </div>

          {/* Support Ticket Form - compact card */}
          <div className="bg-white rounded-2xl shadow-sm border border-border/50 p-4">
            <h2 className="text-sm font-semibold text-foreground mb-1">Create Support Ticket</h2>
            <p className="text-xs text-muted-foreground mb-4">Describe your issue and we'll help you out</p>

            {submitted ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="flex justify-center mb-3">
                  <CheckCircle size={36} className="text-green-600" />
                </div>
                <h3 className="text-sm font-semibold text-green-900 mb-1">Ticket Submitted</h3>
                <p className="text-xs text-green-800">Our support team will review your issue and get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Issue Type <span className="text-red-500">*</span></label>
                  <select
                    value={formData.issueType}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueType: e.target.value as any }))}
                    className="w-full px-2 py-2 border border-border rounded-lg outline-none text-sm bg-white focus:border-primary transition-colors"
                  >
                    <option value="">Select an issue type</option>
                    {issueTypes.map(type => (
                      <option key={type.value} value={type.value}>{type.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Subject <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Brief summary"
                    maxLength={100}
                    className={`w-full px-2 py-2 border rounded-lg outline-none text-sm transition-colors ${
                      fieldErrors.subject ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{fieldErrors.subject || `${formData.subject.length}/100`}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Description <span className="text-red-500">*</span></label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Detailed information..."
                    rows={4}
                    maxLength={5000}
                    className={`w-full px-2 py-2 border rounded-lg outline-none text-sm transition-colors resize-none ${
                      fieldErrors.description ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
                    }`}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{fieldErrors.description || `${formData.description.length}/5000`}</p>
                </div>

                <div className="flex gap-2">
                  {(['low', 'medium', 'high', 'urgent'] as const).map(level => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, priority: level }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
                        formData.priority === level
                          ? 'bg-primary text-white'
                          : 'bg-secondary/50 text-foreground hover:bg-secondary'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>

                <div className="text-right mt-2">
                  <button
                    type="submit"
                    disabled={createTicket.isPending}
                    className="px-4 py-2 bg-primary text-white text-sm font-semibold rounded-lg disabled:opacity-50"
                  >
                    {createTicket.isPending ? 'Creating…' : 'Create Ticket'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground mt-1">You can also email <span className="text-primary font-medium">support@officerides.com</span> or call <span className="text-primary font-medium">+1-800-OFFICE-RIDES</span></div>
        </div>
      </div>
    </Layout>
  );
}
