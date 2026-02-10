import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Car, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const phoneSchema = z.object({
  phoneNumber: z.string()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
    .transform((val) => `+91${val}`), // Always add +91 prefix
});

type PhoneForm = z.infer<typeof phoneSchema>;

export default function Login() {
  const { mockLogin, user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
  });

  const onSubmit = (data: PhoneForm) => {
    mockLogin.mutate(data, {
      onSuccess: () => {
        toast({ title: "Welcome!", description: "Login successful" });
        // Navigation will be handled by ProtectedRoute
      },
      onError: (err) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
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
        <form onSubmit={phoneForm.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground ml-1">Phone Number</label>
            <input
              type="tel"
              placeholder="Enter 10 digit mobile number"
              maxLength={10}
              {...phoneForm.register("phoneNumber")}
              className="w-full px-4 py-3.5 bg-secondary rounded-xl border-transparent focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
            />
            {phoneForm.formState.errors.phoneNumber && (
              <p className="text-red-500 text-xs ml-1">{phoneForm.formState.errors.phoneNumber.message}</p>
            )}
            <p className="text-xs text-muted-foreground ml-1">We'll register you with +91{phoneForm.watch("phoneNumber") || "XXXXXXXXXX"}</p>
          </div>

          <button
            type="submit"
            disabled={mockLogin.isPending}
            className="w-full py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {mockLogin.isPending ? <Loader2 className="animate-spin" /> : <>Continue <ArrowRight size={18} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}
