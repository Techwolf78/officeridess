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
  Clock,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  CheckCircle2,
  ThumbsUp
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
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const isDriver = user?.role === "driver";

  const ratingMessages = {
    5: { emoji: "🌟", text: "Perfect Journey!" },
    4: { emoji: "😊", text: "Great Experience!" },
    3: { emoji: "👍", text: "Good Enough" },
    2: { emoji: "😐", text: "Could be Better" },
    1: { emoji: "😞", text: "Poor Experience" },
    0: { emoji: "⭐", text: "Select a Rating" }
  };

  const quickTags = [
    { id: 'on-time', label: "On Time", icon: Clock },
    { id: 'clean', label: "Clean Car", icon: Sparkles },
    { id: 'safe', label: "Safe Driver", icon: ShieldCheck },
    { id: 'friendly', label: "Friendly", icon: Heart },
    { id: 'good-music', label: "Good Playlist", icon: MessageSquare },
    { id: 'smooth', label: "Smooth Ride", icon: ThumbsUp }
  ];

  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
  };

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
      <Layout headerTitle="Rate Your Trip" showNav={false}>
        <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
          <Loader2 className="animate-spin text-orange-500 w-12 h-12" />
          <p className="mt-6 text-lg font-bold text-slate-900">Loading...</p>
        </div>
      </Layout>
    );
  }

  if (submitted) {
    return (
      <Layout headerTitle="Thank You" showNav={false}>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 flex flex-col items-center justify-center px-6 pb-24 text-center">
          <style>{`
            @keyframes scaleInBounce {
              0% { transform: scale(0); }
              50% { transform: scale(1.1); }
              100% { transform: scale(1); }
            }
          `}</style>
          <div 
            className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-500 rounded-[2.5rem] shadow-2xl shadow-orange-400/30 flex items-center justify-center text-white mb-8 border-4 border-white"
            style={{ animation: 'scaleInBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
          >
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-3">Feedback Shared!</h2>
          <p className="text-slate-500 font-medium mb-12 max-w-xs mx-auto leading-relaxed">
            Thank you for helping improve the <span className="text-orange-600 font-bold">Office Commute Mate</span> community with your honest feedback.
          </p>
          <Link href="/rides" className="w-full max-w-sm">
            <button className="w-full h-16 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-orange-500/30 active:scale-95 transition-all border border-orange-400">
              Back to Rides
            </button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Rate Your Trip" showNav={false}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 pb-40">
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes starPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.15); }
          }
        `}</style>

        {/* Header */}
        <div className="bg-white px-4 pt-6 pb-12 rounded-b-[3rem] shadow-lg border-b border-slate-200/60">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-500 rounded-[2rem] flex items-center justify-center mb-6 text-white shadow-lg font-bold text-2xl border-4 border-white">
              {(isDriver ? booking?.passenger?.firstName : booking?.ride?.driver?.firstName)?.[0] || "?"}
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">How Was Your Trip?</h1>
            <p className="text-slate-500 font-medium text-sm mt-2">
              with <span className="text-orange-600 font-bold">{isDriver ? booking?.passenger?.firstName : booking?.ride?.driver?.firstName}</span>
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 -mt-6 max-w-md mx-auto space-y-6">
          
          {/* Star Rating - Interactive */}
          <div 
            className="bg-white rounded-[2.5rem] p-10 shadow-lg border border-slate-200/60 text-center"
            style={{ animation: 'slideUp 0.6s ease-out 0.1s both' }}
          >
            <div className="flex justify-center gap-3 mb-8">
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= (ratingData.rating ||hoverRating || 0);
                return (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-all duration-200 active:scale-90"
                  >
                    <Star
                      size={52}
                      className={cn(
                        "transition-all duration-200 cursor-pointer",
                        isActive
                          ? "fill-orange-400 text-orange-400 drop-shadow-[0_0_12px_rgba(249,115,22,0.3)]"
                          : "text-slate-200 fill-slate-100"
                      )}
                      style={
                        isActive 
                          ? { animation: 'starPulse 0.6s ease-in-out infinite' }
                          : {}
                      }
                    />
                  </button>
                );
              })}
            </div>

            <div className="text-center">
              <p className="text-4xl font-black mb-2">
                {ratingMessages[(ratingData.rating || hoverRating || 0) as 0 | 1 | 2 | 3 | 4 | 5].emoji}
              </p>
              <p className="text-xl font-black text-slate-900">
                {ratingMessages[(ratingData.rating || hoverRating || 0) as 0 | 1 | 2 | 3 | 4 | 5].text}
              </p>
            </div>
          </div>

          {/* Quick Feedback Tags */}
          {ratingData.rating > 0 && (
            <div 
              className="space-y-3"
              style={{ animation: 'slideUp 0.6s ease-out 0.2s both' }}
            >
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest px-2">Thanks! What stood out?</p>
              <div className="grid grid-cols-2 gap-3">
                {quickTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={cn(
                        "p-4 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center gap-2 group active:scale-95",
                        isSelected
                          ? "bg-orange-100 border-orange-400 shadow-md"
                          : "bg-white border-slate-200 hover:border-orange-300 shadow-sm"
                      )}
                    >
                      <tag.icon className={cn(
                        "w-6 h-6 transition-colors",
                        isSelected ? "text-orange-600" : "text-slate-400 group-hover:text-orange-500"
                      )} />
                      <span className={cn(
                        "text-xs font-bold transition-colors whitespace-nowrap",
                        isSelected ? "text-orange-700" : "text-slate-600"
                      )}>
                        {tag.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comment Box */}
          {ratingData.rating > 0 && (
            <div 
              className="space-y-3"
              style={{ animation: 'slideUp 0.6s ease-out 0.3s both' }}
            >
              <p className="text-sm font-bold text-slate-600 uppercase tracking-widest px-2">Extra thoughts? (optional)</p>
              <textarea
                placeholder="What made this trip special..."
                value={reviewText}
                onChange={(e) => {
                  setReviewText(e.target.value);
                  setReview(e.target.value);
                }}
                className="w-full bg-white rounded-[1.5rem] p-5 border-2 border-slate-200 shadow-sm focus:border-orange-400 focus:ring-4 focus:ring-orange-100 outline-none text-sm font-medium min-h-[100px] transition-all resize-none"
              />
            </div>
          )}

          {/* XP Info */}
          {ratingData.rating === 5 && (
            <div 
              className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-2xl p-4 flex items-center gap-3"
              style={{ animation: 'slideUp 0.6s ease-out 0.4s both' }}
            >
              <div className="w-10 h-10 rounded-xl bg-orange-200 flex items-center justify-center flex-shrink-0">
                <Star className="w-5 h-5 text-orange-600 fill-orange-600" />
              </div>
              <p className="text-sm font-bold text-orange-900">
                ✨ Giving a 5-star rating awards your mate <span className="text-lg">+50 XP</span>
              </p>
            </div>
          )}
        </div>

        {/* Bottom Action */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-200 p-4 z-50 rounded-t-[3rem] shadow-2xl">
          <div className="max-w-md mx-auto px-4">
            <button
              onClick={handleSubmit}
              disabled={!ratingData.rating || isSubmitting}
              className={cn(
                "w-full h-16 rounded-[1.5rem] font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 border",
                ratingData.rating 
                  ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white border-orange-400 shadow-orange-500/30"
                  : "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  <Send size={20} />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

