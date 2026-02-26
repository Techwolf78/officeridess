import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useBookingRealtime } from "@/hooks/use-booking-realtime";
import { useRideStatus } from "@/hooks/use-ride-status";
import { Link, useRoute } from "wouter";
import { 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Clock, 
  Loader2,
  Trophy,
  Star,
  ArrowRight,
  ShieldCheck,
  MessageSquareQuote,
  Zap
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RideCompletion() {
  const { user } = useAuth();
  const [, params] = useRoute("/ride/:bookingId/complete");
  const bookingId = params?.bookingId;

  const { booking, loading, error } = useBookingRealtime(bookingId || "");
  const { rideState, confirmCompletion, isUpdating } = useRideStatus(bookingId || "", "completed");

  const isDriver = user?.role === "driver";
  const [confirmationCountdown, setConfirmationCountdown] = useState(60);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (user?.role === "passenger" && !confirmed && confirmationCountdown > 0) {
      const timer = setTimeout(() => {
        setConfirmationCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (confirmationCountdown === 0 && !confirmed) {
      setConfirmed(true);
    }
  }, [confirmationCountdown, confirmed, user?.role]);

  const handleConfirm = () => {
    confirmCompletion();
    setConfirmed(true);
  };

  if (loading) {
    return (
      <Layout headerTitle="Completing Trip" showNav={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <Loader2 className="animate-spin text-[#15803D] w-12 h-12" />
          <p className="mt-6 text-lg font-bold text-slate-900 tracking-tight">Finalizing ride details...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Journey Complete" showNav={false}>
      <div className="min-h-screen bg-[#FAF9F4] pb-32">
        {/* Success Header */}
        <div className="bg-white px-4 pt-8 pb-16 rounded-b-[3.5rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border-b border-slate-100 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20 scale-125"></div>
            <div className="relative w-24 h-24 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center text-[#15803D] border border-emerald-100">
              <Trophy size={48} />
            </div>
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Destination Reached!</h1>
          <p className="text-slate-400 font-medium text-sm px-12 leading-relaxed">
            Youve successfully completed your commute on <span className="text-[#15803D] font-bold">Office Commute Mate</span>
          </p>
        </div>

        <div className="px-4 -mt-10 max-w-md mx-auto space-y-4">
          {/* Trip Summary Card */}
          <div className="bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-50">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Distance</p>
                <p className="text-lg font-black text-slate-900">12.4 Km</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                <p className="text-lg font-black text-slate-900">24 Mins</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                  <MapPin size={20} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Final Destination</p>
                  <p className="text-sm font-bold text-slate-700 leading-tight">{booking?.ride?.destination}</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-[#15803D]">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Co-Commuter</p>
                    <p className="text-sm font-black text-slate-900">
                      {isDriver ? booking.passenger?.firstName : booking.ride?.driver?.firstName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                  <Star size={12} className="text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-amber-700">Official Mate</span>
                </div>
              </div>
            </div>
          </div>

          {!isDriver && !confirmed && (
            <div className="bg-[#15803D] rounded-[2rem] p-6 text-white text-center space-y-4 shadow-xl shadow-[#15803D]/20">
              <p className="text-xs font-bold uppercase tracking-0.2em opacity-80">Final Confirmation</p>
              <h3 className="text-xl font-black tracking-tight">Are you at your destination?</h3>
              <div className="flex gap-3">
                <Button 
                  onClick={handleConfirm}
                  className="flex-1 h-14 bg-white text-[#15803D] hover:bg-emerald-50 rounded-2xl font-black text-base transition-transform active:scale-95"
                >
                  Yes, Ive Arrived
                </Button>
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center font-black">
                  {confirmationCountdown}s
                </div>
              </div>
            </div>
          )}

          {/* Points Impact Section */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Eco-Commuter Impact</p>
                <p className="text-10px text-slate-400 font-medium">Saved 2.4kg of CO2 today</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[#15803D]">+150 XP</p>
            </div>
          </div>

          <button className="w-full flex items-center justify-between bg-white px-6 py-5 rounded-[2rem] border border-slate-100 shadow-sm transition-all hover:border-[#15803D]/30 group">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-[#15803D] group-hover:bg-[#15803D]/5 transition-colors">
                <MessageSquareQuote size={20} />
              </div>
              <span className="text-sm font-bold text-slate-700">Submit a Dispute</span>
            </div>
            <ArrowRight size={18} className="text-slate-300 group-hover:text-[#15803D] transition-all" />
          </button>
        </div>

        {/* Unified Bottom Action */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-6 z-50 rounded-t-[3rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="max-w-md mx-auto">
            {(isDriver || confirmed) && (
              <Link href={`/ride/${bookingId}/rating`}>
                <Button className="w-full h-16 bg-[#15803D] hover:bg-[#166534] text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-[#15803D]/20 active:scale-0.98 transition-all flex items-center justify-center gap-3">
                  <Star size={24} className="fill-white" />
                  Rate Experience
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
