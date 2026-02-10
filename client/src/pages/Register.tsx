import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Loader2, Car, ArrowRight, User, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

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
  const { user, updateProfile } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
  });

  const step2Form = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
  });

  // Redirect if already registered or not logged in
  useEffect(() => {
    if (!user) {
      setLocation("/login");
    } else if (user.firstName) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const onStep1Submit = (data: Step1Form) => {
    // Store step 1 data temporarily and move to step 2
    localStorage.setItem('registration_step1', JSON.stringify(data));
    setCurrentStep(2);
  };

  const onStep2Submit = (data: Step2Form) => {
    const step1Data = JSON.parse(localStorage.getItem('registration_step1') || '{}');

    const completeProfile = {
      firstName: step1Data.firstName,
      lastName: step1Data.lastName,
      email: step1Data.email,
      gender: step1Data.gender,
      homeAddress: data.homeAddress,
      officeAddress: data.officeAddress,
      phoneNumber: user?.phoneNumber, // Store the phone number
    };

    updateProfile.mutate(completeProfile, {
      onSuccess: () => {
        localStorage.removeItem('registration_step1'); // Clean up
        toast({
          title: "Welcome to CommuteSync!",
          description: "Your profile has been set up successfully.",
        });
        setLocation("/");
      },
      onError: (err) => {
        toast({
          title: "Error",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <Layout headerTitle={`Complete Your Profile (${currentStep}/2)`}>
      <div className="px-6 py-8">
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
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Home Address</label>
                <input
                  type="text"
                  placeholder="Enter your complete home address"
                  {...step2Form.register("homeAddress")}
                  className="w-full px-4 py-3.5 bg-secondary rounded-xl border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                />
                {step2Form.formState.errors.homeAddress && (
                  <p className="text-red-500 text-xs ml-1">{step2Form.formState.errors.homeAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground ml-1">Office Address</label>
                <input
                  type="text"
                  placeholder="Enter your complete office address"
                  {...step2Form.register("officeAddress")}
                  className="w-full px-4 py-3.5 bg-secondary rounded-xl border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                />
                {step2Form.formState.errors.officeAddress && (
                  <p className="text-red-500 text-xs ml-1">{step2Form.formState.errors.officeAddress.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="flex-1 py-3.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-semibold transition-all"
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
      </div>
    </Layout>
  );
}