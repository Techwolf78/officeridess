import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Car, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const phoneSchema = z.object({
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
});

const otpSchema = z.object({
  otp: z.string().length(4, "OTP must be 4 digits"),
});

export default function Login() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const { login, verify, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  if (user) {
    setLocation("/");
    return null;
  }

  const phoneForm = useForm<{ phoneNumber: string }>({
    resolver: zodResolver(phoneSchema),
  });

  const otpForm = useForm<{ otp: string }>({
    resolver: zodResolver(otpSchema),
  });

  const onSendOtp = (data: { phoneNumber: string }) => {
    login.mutate(data, {
      onSuccess: () => {
        setPhone(data.phoneNumber);
        setStep("otp");
        toast({ title: "OTP Sent", description: "Use 1234 to verify" });
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  };

  const onVerifyOtp = (data: { otp: string }) => {
    verify.mutate(
      { phoneNumber: phone, otp: data.otp },
      {
        onError: (err) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="app-container flex flex-col justify-center px-8 bg-[#FAF9F4]">
      <div className="mb-12 text-center">
        <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-3">
          <Car size={40} className="text-primary" />
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">Commute<span className="text-primary">Sync</span></h1>
        <p className="text-muted-foreground">Share rides, save costs, travel better.</p>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl shadow-primary/5 border border-border/50">
        {step === "phone" ? (
          <form onSubmit={phoneForm.handleSubmit(onSendOtp)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Phone Number</label>
              <input
                type="tel"
                placeholder="Enter your mobile number"
                {...phoneForm.register("phoneNumber")}
                className="w-full px-4 py-3.5 bg-secondary rounded-xl border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              />
              {phoneForm.formState.errors.phoneNumber && (
                <p className="text-red-500 text-xs ml-1">{phoneForm.formState.errors.phoneNumber.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={login.isPending}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {login.isPending ? <Loader2 className="animate-spin" /> : <>Continue <ArrowRight size={18} /></>}
            </button>
          </form>
        ) : (
          <form onSubmit={otpForm.handleSubmit(onVerifyOtp)} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground ml-1">Enter Verification Code</label>
              <input
                type="text"
                placeholder="1234"
                maxLength={4}
                {...otpForm.register("otp")}
                className="w-full px-4 py-3.5 bg-secondary rounded-xl border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-center tracking-[1em] font-mono text-lg"
              />
              {otpForm.formState.errors.otp && (
                <p className="text-red-500 text-xs ml-1">{otpForm.formState.errors.otp.message}</p>
              )}
              <p className="text-xs text-center text-muted-foreground mt-2">
                Sent to {phone}. <button type="button" onClick={() => setStep("phone")} className="text-primary font-medium hover:underline">Change?</button>
              </p>
            </div>

            <button
              type="submit"
              disabled={verify.isPending}
              className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {verify.isPending ? <Loader2 className="animate-spin" /> : "Verify & Login"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
