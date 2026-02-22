import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Car, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";

// Validate Indian mobile numbers: must start with 6, 7, 8, or 9 and be exactly 10 digits
const isValidIndianMobileNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber || phoneNumber.length !== 10) return false;
  const firstDigit = parseInt(phoneNumber[0]);
  // Indian mobile numbers must start with 6, 7, 8, or 9
  return [6, 7, 8, 9].includes(firstDigit);
};

const phoneSchema = z.object({
  phoneNumber: z.string()
    .regex(/^\d{10}$/, "Please enter a valid phone number")
    .refine(isValidIndianMobileNumber, "Please enter a valid phone number")
    .transform((val) => `+91${val}`), // Always add +91 prefix
});

type PhoneForm = z.infer<typeof phoneSchema>;

export default function Login() {
  const { mockLogin, user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [phoneValue, setPhoneValue] = useState("");

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    mode: "onChange", // Real-time validation
  });

  // Handle phone input - only allow digits and max 10
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
    
    if (value.length > 10) {
      value = value.slice(0, 10);
    }

    setPhoneValue(value);
    phoneForm.setValue("phoneNumber", value);
    phoneForm.trigger("phoneNumber"); // Trigger validation
  };

  const isPhoneValid = isValidIndianMobileNumber(phoneValue);
  const phoneError = phoneForm.formState.errors.phoneNumber;

  const onSubmit = (data: PhoneForm) => {
    setShowError(false);
    mockLogin.mutate(data, {
      onSuccess: () => {
        toast({ title: "Welcome!", description: "Login successful" });
        // Navigation will be handled by user state change above
      },
      onError: (err) => {
        const errorMsg = err instanceof Error ? err.message : "Login failed. Please try again.";
        setErrorMessage(errorMsg);
        setShowError(true);
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      },
    });
  };

  // Show loading while logging in or checking auth status
  if (isLoading && user) {
    return (
      <div className="app-container flex flex-col justify-center px-8 bg-[#FAF9F4]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={32} />
          <p className="text-primary font-medium">Loading please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container flex flex-col px-8 bg-[#FAF9F4] min-h-screen">
      {/* Centered Content */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="mb-12 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <Car size={40} className="text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">OFFICE<span className="text-primary">RIDES</span></h1>
          <p className="text-muted-foreground">Share rides, save costs, travel better.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-primary/5 border border-border/50">
        {showError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium text-sm">Login Failed</p>
              <p className="text-red-700 text-sm mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={phoneForm.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Phone Number</label>
            
            {/* Phone Input */}
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center text-muted-foreground font-medium">
                +91
              </div>
              <input
                type="tel"
                placeholder="Enter 10 digit mobile number"
                maxLength={10}
                value={phoneValue}
                onChange={handlePhoneChange}
                disabled={mockLogin.isPending}
                className={`w-full pl-12 pr-4 py-3.5 bg-secondary rounded-xl border-2 transition-all outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  phoneError 
                    ? "border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100" 
                    : isPhoneValid
                    ? "border-green-300 focus:border-green-500 focus:ring-4 focus:ring-green-100"
                    : "border-transparent focus:border-primary focus:ring-4 focus:ring-primary/10 focus:bg-white"
                }`}
              />
              {/* Validation Icon */}
              {isPhoneValid && (
                <CheckCircle2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-green-600" />
              )}
              {phoneError && (
                <AlertCircle size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600" />
              )}
            </div>

            {/* Error Message */}
            {phoneError && (
              <p className="text-red-500 text-xs ml-1 flex items-center gap-1">
                <span>•</span> {phoneError.message}
              </p>
            )}

            {/* Validation Helper Text */}
            {!phoneError && phoneValue.length > 0 && !isPhoneValid && (
              <p className="text-amber-600 text-xs ml-1 flex items-center gap-1">
                <span>•</span> Need {10 - phoneValue.length} more digit{10 - phoneValue.length !== 1 ? "s" : ""}
              </p>
            )}

            {/* Success Message */}
            {isPhoneValid && (
              <p className="text-green-600 text-xs ml-1 flex items-center gap-1">
                <CheckCircle2 size={14} /> Phone number valid
              </p>
            )}

            {/* Info Text */}
            {phoneValue.length === 0 && (
              <p className="text-xs text-muted-foreground ml-1">
                Format: +91{phoneForm.watch("phoneNumber") || "XXXXXXXXXX"}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={mockLogin.isPending || !isPhoneValid}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {mockLogin.isPending ? (
              <>
                <Loader2 className="animate-spin" size={18} /> Logging in...
              </>
            ) : (
              <>
                Continue <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>
        </div>
      </div>

      {/* Footer Links */}
      <div className="text-center py-6 border-t border-border/50">
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
  );
}
