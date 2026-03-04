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
  Leaf,
  Users,
  Zap,
  Calendar,
  Navigation
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function RideCompletion() {
  const { user } = useAuth();
  const [, params] = useRoute("/ride/:bookingId/complete");
  const bookingId = params?.bookingId;

  const { booking, loading, error } = useBookingRealtime(bookingId || "");
  const { rideState, confirmCompletion, isUpdating } = useRideStatus(bookingId || "", "completed");

  const isDriver = user?.role === "driver";
  const [confirmationCountdown, setConfirmationCountdown] = useState(60);
  const [confirmed, setConfirmed] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

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

  // Calculate CO2 saved (0.15 kg per km)
  // Use booking.co2SavedKg if available (calculated on server/at completion), 
  // otherwise fallback to client calculation
  const co2SavedValue = booking?.co2SavedKg || (booking?.ride?.distance ? booking.ride.distance * 0.15 : 0);
  const co2Saved = Number(co2SavedValue).toFixed(1);
  const distance = booking?.ride?.distance?.toFixed(1) || "0.0";
  const duration = booking?.ride?.eta ? Math.round(booking.ride.eta) : 0;
  const rideName = isDriver ? booking?.passenger?.firstName : booking?.ride?.driver?.firstName;

  if (loading) {
    return (
      <Layout headerTitle="Completing Trip" showNav={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <Loader2 className="animate-spin text-green-600 w-12 h-12" />
          <p className="mt-6 text-lg font-bold text-slate-900 tracking-tight">Finalizing your achievement...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Journey Complete" showNav={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-green-50 pb-40 overflow-hidden">
        {/* Animated confetti background */}
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none">
            {[...Array(30)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10px`,
                  backgroundColor: ['#F97316', '#10B981', '#3B82F6', '#EC4899'][i % 4],
                  animation: `fall ${2 + Math.random() * 1}s linear forwards`,
                  animationDelay: `${Math.random() * 0.5}s`,
                  opacity: 0.6,
                }}
              />
            ))}
          </div>
        )}

        <style>{`
          @keyframes fall {
            to {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }
          @keyframes scaleInBounce {
            0% { transform: scale(0); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes pulse-grow {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
        `}</style>

        {/* Header with celebration */}
        <div className="relative pt-8 pb-12 px-4 text-center">
          <div 
            className="relative w-32 h-32 mx-auto mb-8"
            style={{ animation: 'scaleInBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <div className="absolute inset-0 bg-green-100/40 rounded-full animate-pulse blur-2xl"></div>
            <div className="relative w-32 h-32 bg-gradient-to-br from-green-500 to-green-600 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-green-500/30 border-4 border-white">
              <Trophy size={64} className="drop-shadow-lg" />
            </div>
          </div>
          
          <h1 className="text-5xl font-black text-slate-900 tracking-tighter mb-3">Destination Reached!</h1>
          <p className="text-lg text-slate-500 font-medium">
            Great job completing your commute with <span className="text-green-700 font-bold">{rideName}</span>
          </p>
        </div>

        {/* Main Content - Premium Cards */}
        <div className="px-4 max-w-md mx-auto space-y-4">
          
          {/* CO2 Achievement Card - Highlighted */}
          <div 
            className="relative bg-gradient-to-br from-green-50 to-emerald-50 rounded-[2.5rem] p-8 border-2 border-green-200 shadow-lg overflow-hidden"
            style={{ animation: 'slideUp 0.6s ease-out 0.2s both' }}
          >
            <div className="absolute top-0 right-0 w-40 h-40 bg-green-400/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            
            <div className="relative flex items-center justify-between mb-6">
              <div>
                <p className="text-sm font-bold text-green-600 uppercase tracking-widest mb-2">🌱 CO2 Saved</p>
                <p className="text-5xl font-black text-green-700" style={{ animation: 'pulse-grow 2s ease-in-out infinite' }}>
                  {co2Saved}<span className="text-2xl">kg</span>
                </p>
                <p className="text-xs text-green-600 font-medium mt-1">Carbon offset from carpooling</p>
              </div>
              <Leaf className="w-16 h-16 text-green-400 opacity-30" />
            </div>

            <div className="bg-white/40 backdrop-blur rounded-xl p-3 space-y-2 border border-white/50">
              <p className="text-xs text-green-700 font-semibold">Environmental Impact:</p>
              <p className="text-sm text-green-600">Equivalent to planting <span className="font-bold">{(parseFloat(co2Saved) / 0.021).toFixed(0)}</span> trees 🌳</p>
            </div>
          </div>

          {/* Trip Stats */}
          <div 
            className="bg-white rounded-[2.5rem] p-6 shadow-md border border-slate-200/60 space-y-5"
            style={{ animation: 'slideUp 0.6s ease-out 0.3s both' }}
          >
            {/* Distance & Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Navigation className="w-4 h-4 text-blue-600" />
                  <p className="text-10px font-bold text-blue-600 uppercase tracking-widest">Distance</p>
                </div>
                <p className="text-3xl font-black text-slate-900">{distance}<span className="text-base text-slate-400">km</span></p>
              </div>
              
              <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <p className="text-10px font-bold text-purple-600 uppercase tracking-widest">Duration</p>
                </div>
                <p className="text-3xl font-black text-slate-900">{duration}<span className="text-base text-slate-400">m</span></p>
              </div>
            </div>

            {/* Route Info */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-green-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-10px font-bold text-slate-400 uppercase tracking-widest">From</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{booking?.ride?.origin || "Pickup"}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-10px font-bold text-slate-400 uppercase tracking-widest">To</p>
                  <p className="text-sm font-bold text-slate-700 truncate">{booking?.ride?.destination || "Destination"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Passenger Info Card */}
          <div 
            className="bg-white rounded-[2.5rem] p-6 shadow-md border border-slate-200/60"
            style={{ animation: 'slideUp 0.6s ease-out 0.4s both' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md">
                  {rideName?.[0] || "?"}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Co-Commuter</p>
                  <p className="text-lg font-black text-slate-900">{rideName || "Unknown"}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-full border border-green-200">
                <Star className="w-4 h-4 text-green-600 fill-green-600" />
                <span className="text-xs font-bold text-green-700">Verified</span>
              </div>
            </div>
          </div>

          {/* Confirmation Card for Passengers */}
          {!isDriver && !confirmed && (
            <div 
              className="bg-gradient-to-br from-green-600 to-green-700 rounded-[2.5rem] p-6 text-white shadow-xl shadow-green-600/30 border border-green-500"
              style={{ animation: 'slideUp 0.6s ease-out 0.5s both' }}
            >
              <div className="text-center space-y-4">
                <p className="text-sm font-bold uppercase tracking-widest opacity-90">✓ Final Step</p>
                <h3 className="text-2xl font-black">Confirm Arrival</h3>
                <p className="text-sm text-green-100">Please confirm you've reached your destination</p>
                
                <div className="flex gap-3 pt-2">
                  <button 
                    onClick={handleConfirm}
                    className="flex-1 h-14 bg-white text-orange-600 rounded-2xl font-black text-base hover:bg-orange-50 transition-all shadow-lg active:scale-95"
                  >
                    ✓ Yes, Arrived
                  </button>
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center font-black text-lg">
                    {confirmationCountdown}s
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Achievement Badge */}
          <div 
            className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-[2.5rem] p-4 border border-blue-100 flex items-center justify-between"
            style={{ animation: 'slideUp 0.6s ease-out 0.6s both' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-10px font-bold text-blue-600 uppercase tracking-widest">Eco-Score</p>
                <p className="text-sm font-black text-slate-900">+{(parseFloat(co2Saved) * 10).toFixed(0)} XP</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-10px font-bold text-blue-600 uppercase">Achievement</p>
              <p className="font-bold text-blue-600">Unlocked ✓</p>
            </div>
          </div>
        </div>

        {/* Bottom Action Button */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 z-50 rounded-t-[3rem] shadow-2xl">
          <div className="max-w-md mx-auto px-4">
            {(isDriver || confirmed) && (
              <Link href={`/ride/${bookingId}/rating`}>
                <button className="w-full h-16 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-green-600/30 active:scale-95 transition-all flex items-center justify-center gap-3 border border-green-500">
                  <Star size={24} className="fill-white" />
                  Rate Your Experience
                </button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
