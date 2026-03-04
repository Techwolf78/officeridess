import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Loader2, Car, ArrowRight, User, MapPin, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { LocationInput } from "@/components/LocationInput";

const step1Schema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  gender: z.enum(["male", "female", "other"], { required_error: "Please select your gender" }),
});

const step2Schema = z.object({
  homeAddress: z.string().min(5, "Home address must be at least 5 characters"),
  officeAddress: z.string().min(5, "Office address must be at least 5 characters"),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;

export default function Register() {
  const { user, updateProfile, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
  });

  const step2Form = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
  });

  // Redirect if already registered or not logged in
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        setLocation("/login");
      } else if (user.firstName) {
        setLocation("/home");
      }
    }
  }, [user, isLoading, setLocation]);

  const onStep1Submit = (data: Step1Form) => {
    // Store step 1 data temporarily and move to step 2
    localStorage.setItem('registration_step1', JSON.stringify(data));
    setCurrentStep(2);
  };

  const onStep2Submit = (data: Step2Form) => {
    setShowError(false);
    const step1Data = JSON.parse(localStorage.getItem('registration_step1') || '{}');

    const completeProfile = {
      firstName: step1Data.firstName,
      lastName: step1Data.lastName,
      email: step1Data.email,
      gender: step1Data.gender,
      homeAddress: data.homeAddress,
      officeAddress: data.officeAddress,
      phoneNumber: user?.phoneNumber,
    };

    updateProfile.mutate(completeProfile, {
      onSuccess: () => {
        localStorage.removeItem('registration_step1'); // Clean up
        toast({
          title: "Welcome to OFFICE RIDES!",
          description: "Your profile has been set up successfully.",
        });
        // Navigation will happen automatically when user state updates
        setLocation("/home");
      },
      onError: (err) => {
        const errorMsg = err instanceof Error ? err.message : "Failed to complete profile setup. Please try again.";
        setErrorMessage(errorMsg);
        setShowError(true);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
      },
    });
  };

  // Show loading while checking auth status
  if (isLoading) {
    return (
      <Layout headerTitle="Complete Your Profile">
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 py-8">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-primary font-medium">Loading please wait...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle={`Complete Your Profile (${currentStep}/2)`}>
      <div className="px-4 py-8">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3 ${
            currentStep === 1 ? 'bg-primary/10' : 'bg-green-500/10'
          }`}>
            {currentStep === 1 ? (
              <User size={40} className="text-primary" />
            ) : (
              <MapPin size={40} className="text-green-600" />
            )}
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground mb-2">
            {currentStep === 1 ? "Personal Information" : "Location Details"}
          </h1>
          <p className="text-muted-foreground">
            {currentStep === 1
              ? "Tell us about yourself"
              : "Where do you commute from and to?"
            }
          </p>
        </div>

        {currentStep === 1 ? (
          <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">First Name</label>
                  <input
                    type="text"
                    placeholder="John"
                    {...step1Form.register("firstName")}
                    className="w-full px-4 py-3.5 bg-secondary rounded-xl border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                  {step1Form.formState.errors.firstName && (
                    <p className="text-red-500 text-xs ml-1">{step1Form.formState.errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground ml-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="Doe"
                    {...step1Form.register("lastName")}
                    className="w-full px-4 py-3.5 bg-secondary rounded-xl border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                  />
                  {step1Form.formState.errors.lastName && (
                    <p className="text-red-500 text-xs ml-1">{step1Form.formState.errors.lastName.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Email Address</label>
                <input
                  type="email"
                  placeholder="john.doe@example.com"
                  {...step1Form.register("email")}
                  className="w-full px-4 py-3.5 bg-secondary rounded-xl border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                />
                {step1Form.formState.errors.email && (
                  <p className="text-red-500 text-xs ml-1">{step1Form.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Gender</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "other", label: "Other" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => step1Form.setValue("gender", option.value as any)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        step1Form.watch("gender") === option.value
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-secondary text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
                {step1Form.formState.errors.gender && (
                  <p className="text-red-500 text-xs ml-1">{step1Form.formState.errors.gender.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2"
            >
              Continue <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
            {showError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-800 font-medium text-sm">Profile Setup Failed</p>
                  <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
                  <button
                    type="button"
                    onClick={() => setShowError(false)}
                    className="text-red-600 text-xs mt-2 underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <LocationInput
                value={step2Form.watch("homeAddress")}
                onChange={(address, lat, lng) => {
                  step2Form.setValue("homeAddress", address);
                  step2Form.trigger("homeAddress");
                }}
                placeholder="Search or select your home address"
                label="Home Address"
              />
              {step2Form.formState.errors.homeAddress && (
                <p className="text-red-500 text-xs ml-1">{step2Form.formState.errors.homeAddress.message}</p>
              )}

              <LocationInput
                value={step2Form.watch("officeAddress")}
                onChange={(address, lat, lng) => {
                  step2Form.setValue("officeAddress", address);
                  step2Form.trigger("officeAddress");
                }}
                placeholder="Search or select your office address"
                label="Office Address"
              />
              {step2Form.formState.errors.officeAddress && (
                <p className="text-red-500 text-xs ml-1">{step2Form.formState.errors.officeAddress.message}</p>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                disabled={updateProfile.isPending}
                className="flex-1 py-3.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={updateProfile.isPending}
                className="flex-1 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {updateProfile.isPending ? <Loader2 className="animate-spin" /> : <>Complete Setup <ArrowRight size={18} /></>}
              </button>
            </div>
          </form>
        )}

        {/* Footer Links */}
        <div className="text-center py-6 border-t border-border/50 mt-8">
          <p className="text-xs text-muted-foreground">
            <Link href="/">
              <span className="text-primary hover:text-primary/80 cursor-pointer transition-colors">Home</span>
            </Link>
            <span className="mx-2">•</span>
            <Link href="/privacy">
              <span className="text-primary hover:text-primary/80 cursor-pointer transition-colors">Privacy Policy</span>
            </Link>
            <span className="mx-2">•</span>
            <Link href="/terms">
              <span className="text-primary hover:text-primary/80 cursor-pointer transition-colors">Terms of Service</span>
            </Link>
          </p>
        </div>
      </div>
    </Layout>
  );
}