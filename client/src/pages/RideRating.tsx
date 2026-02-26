import { Layout } from "@/components/ui/Layout";
import { useRideRating } from "@/hooks/use-ride-rating";
import { useBookingRealtime } from "@/hooks/use-booking-realtime";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute } from "wouter";
import { 
  Star, 
  Send, 
  AlertCircle, 
  Loader2, 
  Heart,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Award,
  Clock
} from "lucide-react";
import { useState } from "react";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function RideRating() {
  const { user } = useAuth();
  const [, params] = useRoute("/ride/:bookingId/rating");
  const bookingId = params?.bookingId;

  const { booking, loading, error } = useBookingRealtime(bookingId || "");
  const { ratingData, submitted, setRating, setReview, setCategoryRating, submitRating } = useRideRating();
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDriver = user?.role === "driver";

  const handleSubmit = async () => {
    if (!ratingData.rating) return;
    setIsSubmitting(true);
    
    const toUserId = isDriver ? booking?.passenger?.uid || "" : booking?.ride?.driverId || "";
    const rating = submitRating(bookingId || "", user?.uid || "", toUserId);

    try {
      await addDoc(collection(db, "ratings"), rating);
      const updateData: any = { status: "rated" };
      if (!isDriver) {
        updateData.passengerRating = ratingData.rating;
      } else {
        updateData.driverRating = ratingData.rating;
      }
      await updateDoc(doc(db, "bookings", bookingId || ""), updateData);
    } catch (error) {
      console.error("Error submitting rating:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout headerTitle="Final Steps" showNav={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <Loader2 className="animate-spin text-[#15803D] w-12 h-12" />
        </div>
      </Layout>
    );
  }

  if (submitted) {
    return (
      <Layout headerTitle="Success" showNav={false}>
        <div className="min-h-screen bg-[#FAF9F4] flex flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] shadow-xl flex items-center justify-center text-[#15803D] mb-8 border border-slate-100">
            <CheckCircle2 size={48} className="animate-in zoom-in duration-500" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Feedback Shared!</h2>
          <p className="text-slate-400 font-medium mb-12 max-w-xs mx-auto">
            Your anonymous rating helps improve the safety and quality of the <span className="text-[#15803D] font-bold">Mate Community</span>.
          </p>
          <Link href="/rides" className="w-full max-w-sm">
            <Button className="w-full h-16 bg-[#15803D] hover:bg-[#166534] text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-[#15803D]/20">
              Back to My Rides
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Rate Your Trip" showNav={false}>
      <div className="min-h-screen bg-[#FAF9F4] pb-32">
        <div className="bg-white px-4 pt-4 pb-12 rounded-b-[3rem] shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border-b border-slate-100">
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mb-6 overflow-hidden border-4 border-white shadow-sm">
              <span className="text-2xl font-black text-[#15803D]">
                {(isDriver ? booking?.passenger?.firstName : booking?.ride?.driver?.firstName)?.[0] || "?"}
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">How was your Trip?</h1>
            <p className="text-slate-400 font-medium text-sm mt-1">
              Rate your commute with {isDriver ? booking?.passenger?.firstName : booking?.ride?.driver?.firstName}
            </p>
          </div>
        </div>

        <div className="px-6 -mt-8 max-w-md mx-auto space-y-6">
          {/* Main Rating Card */}
          <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 text-center">
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform active:scale-90"
                >
                  <Star
                    size={42}
                    className={cn(
                      "transition-all duration-300",
                      star <= (ratingData.rating || 0)
                        ? "fill-amber-400 text-amber-400 scale-110 drop-shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                        : "text-slate-100 fill-slate-100"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-sm font-black text-slate-900 uppercase tracking-widest">
              {ratingData.rating === 5 && "Perfect Journey ??"}
              {ratingData.rating === 4 && "Great Experience!"}
              {ratingData.rating === 3 && "Good Enough"}
              {ratingData.rating === 2 && "Could be better"}
              {ratingData.rating === 1 && "Poor Experience"}
              {ratingData.rating === 0 && "Select a Rating"}
            </p>
          </div>

          {/* Feedback Categories */}
          {ratingData.rating > 0 && (
            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {[
                { label: "Punctuality", icon: Clock },
                { label: "Cleanliness", icon: Sparkles },
                { label: "Safe Driving", icon: ShieldCheck },
                { label: "Great Chat", icon: MessageSquare }
              ].map((cat) => (
                <button
                  key={cat.label}
                  className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center gap-2 group hover:border-[#15803D]/30 transition-all"
                >
                  <cat.icon size={20} className="text-slate-300 group-hover:text-[#15803D] transition-colors" />
                  <span className="text-[11px] font-bold text-slate-600">{cat.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Comment Box */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-2">Additional Comments</p>
            <textarea
              placeholder="What made this trip special?"
              value={reviewText}
              onChange={(e) => {
                setReviewText(e.target.value);
                setReview(e.target.value);
              }}
              className="w-full bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm focus:border-[#15803D]/20 focus:ring-4 focus:ring-[#15803D]/5 outline-none text-sm font-medium min-h-[120px] transition-all"
            />
          </div>

          <div className="bg-[#15803D]/5 border border-[#15803D]/10 rounded-2xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[#15803D] shadow-sm">
              <Award size={20} />
            </div>
            <p className="text-[11px] font-medium text-[#15803D]/90 leading-relaxed">
              Submitting a 5-star rating awards your mate 50 Commute XP.
            </p>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 p-6 z-50 rounded-t-[3rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          <div className="max-w-md mx-auto">
            <Button
              onClick={handleSubmit}
              disabled={!ratingData.rating || isSubmitting}
              className="w-full h-16 bg-[#15803D] hover:bg-[#166534] text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-[#15803D]/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <Send size={20} className="stroke-[2.5]" />
                  Submit Feedback
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

