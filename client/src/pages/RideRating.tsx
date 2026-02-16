import { Layout } from "@/components/ui/Layout";
import { useRideRating } from "@/hooks/use-ride-rating";
import { useBookingRealtime } from "@/hooks/use-booking-realtime";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute } from "wouter";
import { Star, Send, AlertCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import { doc, updateDoc, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function RideRating() {
  const { user } = useAuth();
  const [, params] = useRoute("/ride/:bookingId/rating");
  const bookingId = params?.bookingId;

  // Real-time Firebase listener
  const { booking, loading, error } = useBookingRealtime(bookingId || "");
  const { ratingData, submitted, setRating, setReview, setCategoryRating, submitRating, reset } = useRideRating();
  const [showCategories, setShowCategories] = useState(false);
  const [reviewText, setReviewText] = useState("");

  const isDriver = user?.role === "driver";
  const isPassenger = user?.role === "passenger";

  const handleSubmit = async () => {
    const toUserId = isDriver ? booking?.passenger?.uid || "" : booking?.ride?.driverId || "";
    const rating = submitRating(bookingId || "", user?.uid || "", toUserId);

    try {
      // Save rating to firestore
      await addDoc(collection(db, "ratings"), rating);
      // Update booking status to 'rated' and add rating
      const updateData: any = { status: "rated" };
      if (isPassenger) {
        updateData.passengerRating = ratingData.rating;
      } else {
        updateData.driverRating = ratingData.rating;
      }
      await updateDoc(doc(db, "bookings", bookingId || ""), updateData);
    } catch (error) {
      console.error("Error submitting rating:", error);
      // TODO: Show error toast
    }
  };

  // Loading state
  if (loading) {
    return (
      <Layout headerTitle="Loading..." showNav={false}>
        <div className="px-4 py-6 pb-24 max-w-2xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin text-primary mx-auto" size={40} />
            <p className="text-muted-foreground">Loading ride information...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error || !booking) {
    return (
      <Layout headerTitle="Error" showNav={false}>
        <div className="px-4 py-6 pb-24 max-w-2xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-4">
            <div className="flex gap-3">
              <AlertCircle size={24} className="text-red-600 flex-shrink-0" />
              <div>
                <h2 className="font-bold text-red-900">Error Loading Ride</h2>
                <p className="text-red-800 text-sm mt-1">{error || "Ride not found"}</p>
              </div>
            </div>
            <Link href="/rides">
              <button className="w-full py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Back to My Rides
              </button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  if (submitted) {
    return (
      <Layout headerTitle="Thank You!" showNav={false}>
        <div className="px-4 py-6 pb-24 max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-4 text-center">
            <div className="text-5xl mb-4">⭐</div>
            <h2 className="text-2xl font-bold text-foreground">Thank You for Rating!</h2>
            <p className="text-muted-foreground">
              Your feedback helps us improve OFFICERIDES
            </p>

            {/* Rating Summary */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-800 font-semibold mb-2">Your Rating</p>
              <div className="flex justify-center gap-1 mb-3">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={24}
                    className={i < (ratingData.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}
                  />
                ))}
              </div>
              {reviewText && (
                <p className="text-xs text-green-700 italic">"{reviewText}"</p>
              )}
            </div>

            {/* Next Steps */}
            <div className="space-y-2 border-t border-border/50 pt-4">
              <Link href="/rides">
                <button className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors">
                  Back to My Rides
                </button>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout headerTitle="Rate Your Experience" showNav={false}>
      <div className="px-4 py-6 pb-24 max-w-2xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-4">
          {/* Ride Summary */}
          <div className="bg-secondary/30 rounded-xl p-4 mb-6">
            <p className="text-xs text-muted-foreground mb-3">Trip Details</p>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Duration:</span>
                <span className="font-semibold">~20 mins</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Distance:</span>
                <span className="font-semibold">15.3 km</span>
              </div>
            </div>
          </div>

          {/* Who to Rate */}
          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Rate Your Experience</p>
            <p className="text-xs text-muted-foreground">
              You're rating {isDriver ? booking.passenger?.firstName || "the passenger" : booking.ride?.driver?.firstName || "the driver"}
            </p>
          </div>

          {/* Star Rating */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
            <p className="text-center text-sm font-semibold text-foreground mb-4">How was your ride?</p>
            <div className="flex justify-center gap-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={40}
                    className={
                      star <= (ratingData.rating || 0)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    }
                  />
                </button>
              ))}
            </div>
            {ratingData.rating > 0 && (
              <p className="text-center text-sm font-semibold text-amber-800 mt-3">
                {ratingData.rating === 5 && "Excellent! 🎉"}
                {ratingData.rating === 4 && "Great experience!"}
                {ratingData.rating === 3 && "Good"}
                {ratingData.rating === 2 && "Could be better"}
                {ratingData.rating === 1 && "Poor experience"}
              </p>
            )}
          </div>

          {/* Category Ratings (Optional) */}
          {ratingData.rating >= 3 && (
            <div>
              <button
                onClick={() => setShowCategories(!showCategories)}
                className="text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {showCategories ? "Hide detailed ratings" : "Add detailed ratings (optional)"}
              </button>

              {showCategories && (
                <div className="mt-4 space-y-4 p-4 bg-secondary/20 rounded-lg">
                  {[
                    { key: "cleanliness" as const, label: "🧹 Cleanliness" },
                    { key: "behaviour" as const, label: "👤 Behaviour" },
                    { key: "communication" as const, label: "💬 Communication" },
                    { key: "punctuality" as const, label: "⏰ Punctuality" },
                  ].map(({ key, label }) => (
                    <div key={key}>
                      <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(rating => (
                          <button
                            key={rating}
                            onClick={() => setCategoryRating(key, rating)}
                            className="flex-1 py-1 px-2 rounded text-xs font-semibold transition-colors"
                            style={{
                              backgroundColor:
                                (ratingData.categories?.[key] || 0) >= rating
                                  ? "#15803D"
                                  : "#E5E7EB",
                              color:
                                (ratingData.categories?.[key] || 0) >= rating
                                  ? "white"
                                  : "#6B7280",
                            }}
                          >
                            {rating}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Review Text */}
          <div>
            <label className="text-sm font-semibold text-foreground mb-2 block">Add a Comment (Optional)</label>
            <textarea
              value={reviewText}
              onChange={(e) => {
                setReviewText(e.target.value);
                setReview(e.target.value);
              }}
              placeholder="Share your experience..."
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg outline-none text-sm focus:border-primary transition-colors resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">{reviewText.length}/500</p>
          </div>

          {/* Report Button if Low Rating */}
          {ratingData.rating < 3 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <button className="text-sm text-red-600 font-semibold hover:text-red-700">
                Report a problem with this ride
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={ratingData.rating === 0}
            className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send size={20} />
            Submit Rating
          </button>

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex gap-2">
            <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-800">
              Your rating is <strong>private</strong> until both passengers rate each other
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
