import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Car, ArrowRight, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Login() {
  const { googleLogin, user, isLoading } = useAuth();
  const { toast } = useToast();

  const handleGoogleLogin = () => {
    googleLogin.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "Welcome!", description: "Authenticated with Google." });
      },
      onError: (err) => {
        toast({ title: "Login Failed", description: err.message, variant: "destructive" });
      }
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

        <div className="space-y-4 mb-16">
          <Button
            onClick={handleGoogleLogin}
            disabled={googleLogin.isPending}
            className="w-full h-18 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-100 rounded-[2rem] font-black text-lg shadow-xl shadow-slate-200/50 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-4 px-6"
          >
            {googleLogin.isPending ? (
              <Loader2 className="animate-spin text-[#15803D]" size={24} />
            ) : (
              <div className="flex items-center gap-4">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </div>
            )}
          </Button>
          <p className="text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest">
            Corporate email authentication required
          </p>
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
