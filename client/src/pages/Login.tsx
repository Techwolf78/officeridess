import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Car, ArrowRight, Loader2, AlertCircle, CheckCircle2, ShieldCheck, MapPin, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";

const isValidIndianMobileNumber = (phoneNumber: string): boolean => {
  if (!phoneNumber || phoneNumber.length !== 10) return false;
  const firstDigit = parseInt(phoneNumber[0]);
  return [6, 7, 8, 9].includes(firstDigit);
};

const phoneSchema = z.object({
  phoneNumber: z.string()
    .regex(/^\d{10}$/, "Please enter a valid phone number")
    .refine(isValidIndianMobileNumber, "Please enter a valid phone number")
    .transform((val) => `+91${val}`),
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
    mode: "onChange",
  });

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 10) value = value.slice(0, 10);
    setPhoneValue(value);
    phoneForm.setValue("phoneNumber", value);
    phoneForm.trigger("phoneNumber");
  };

  const isPhoneValid = isValidIndianMobileNumber(phoneValue);
  const phoneError = phoneForm.formState.errors.phoneNumber;

  const onSubmit = (data: PhoneForm) => {
    setShowError(false);
    mockLogin.mutate(data, {
      onSuccess: () => {
        toast({ title: "Welcome back!", description: "Authentication successful." });
      },
      onError: (err) => {
        const errorMsg = err instanceof Error ? err.message : "Login failed. Please try again.";
        setErrorMessage(errorMsg);
        setShowError(true);
        toast({ title: "Error", description: errorMsg, variant: "destructive" });
      },
    });
  };

  if (isLoading && user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FAF9F4]">
        <div className="flex flex-col items-center gap-6 animate-pulse">
           <div className="w-16 h-16 bg-[#15803D]/10 rounded-full flex items-center justify-center">
              <Loader2 className="animate-spin text-[#15803D]" size={32} />
           </div>
           <p className="text-[#15803D] font-black text-xl tracking-tighter uppercase">Authenticating...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF9F4] flex flex-col p-6">
      <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full">
        
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-8">
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                <Car size={24} className="text-[#15803D]" />
             </div>
             <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tighter leading-none">OFFICE<span className="text-[#15803D]">RIDES</span></h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Premium Corporate Commuting</p>
             </div>
          </div>

          <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-[0.9] mb-4">
             Unlock Your <br/>Better <span className="text-[#15803D]">Commute.</span>
          </h2>
          <p className="text-slate-500 font-bold text-lg leading-snug">
             Join thousands of verified corporate employees sharing rides daily.
          </p>
        </div>

        <div className="bg-white rounded-[3rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#15803D]/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          
          <form onSubmit={phoneForm.handleSubmit(onSubmit)} className="space-y-6 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Phone Number</label>
              <div className="relative group">
                 <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#15803D] transition-colors">
                    <span className="text-sm font-black">+91</span>
                 </div>
                 <input 
                    type="tel"
                    value={phoneValue}
                    onChange={handlePhoneChange}
                    placeholder="Enter 10-digit number"
                    className="w-full h-16 bg-slate-50 rounded-2xl pl-14 pr-4 text-lg font-black text-slate-900 border-none focus:ring-4 focus:ring-[#15803D]/10 transition-all placeholder:text-slate-300"
                 />
              </div>
              {phoneError && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest ml-1">{phoneError.message}</p>}
            </div>

            <Button 
               type="submit"
               disabled={!isPhoneValid || mockLogin.isPending}
               className="w-full h-18 bg-[#15803D] hover:bg-[#166534] text-white rounded-[2rem] font-black text-lg shadow-xl shadow-[#15803D]/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-between px-6"
            >
               <span>{mockLogin.isPending ? "Connecting..." : "Continue with OTP"}</span>
               {mockLogin.isPending ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} strokeWidth={3} />}
            </Button>
          </form>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-12">
           <div className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                 <ShieldCheck size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-900 uppercase leading-tight">Verified <br/>Network</p>
           </div>
           <div className="bg-white p-4 rounded-[2rem] border border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
                 <Sparkles size={20} />
              </div>
              <p className="text-[10px] font-black text-slate-900 uppercase leading-tight">Eco <br/>Friendly</p>
           </div>
        </div>

        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           By continuing, you agree to our <br/> 
           <Link href="/terms" className="text-slate-900 underline underline-offset-4">Terms</Link> & <Link href="/privacy" className="text-slate-900 underline underline-offset-4">Privacy</Link>
        </p>
      </div>
    </div>
  );
}
