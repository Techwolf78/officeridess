import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useBookingRealtime } from "@/hooks/use-booking-realtime";
import { useRideStatus } from "@/hooks/use-ride-status";
import { Link, useRoute } from "wouter";
import { CheckCircle, AlertCircle, MapPin, Clock, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function RideCompletion() {
  const { user } = useAuth();
  const [, params] = useRoute("/ride/:bookingId/complete");
  const bookingId = params?.bookingId;

  // Real-time Firebase listener
  const { booking, loading, error } = useBookingRealtime(bookingId || "");
  const { rideState, confirmCompletion, isUpdating } = useRideStatus(bookingId || "", "completed");

  const isDriver = user?.role === "driver";
  const isPassenger = user?.role === "passenger";

  const [confirmationCountdown, setConfirmationCountdown] = useState(60);
  const [confirmed, setConfirmed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  // Auto-confirm after 60 seconds if passenger doesn't respond
  useEffect(() => {
    if (isPassenger && !confirmed && confirmationCountdown > 0) {
      const timer = setTimeout(() => {
        setConfirmationCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (confirmationCountdown === 0 && !confirmed) {
      setTimedOut(true);
      setConfirmed(true);
    }
  }, [confirmationCountdown, confirmed, isPassenger]);

  const handleConfirm = () => {
    confirmCompletion();
    setConfirmed(true);
  };

  const handleDispute = () => {
    // Would navigate to dispute/report screen
    console.log("Dispute initiated");
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

  if (isDriver) {
    return (
      <Layout headerTitle="Destination Reached" showNav={false}>
        <div className="px-4 py-6 pb-24 max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-4">
            <h2 className="text-2xl font-bold text-foreground">You've Arrived! 🎉</h2>

            {/* Destination */}
            <div className="flex gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <MapPin size={20} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="text-xs text-green-700">Destination</p>
                <p className="font-semibold text-foreground">{booking?.ride?.destination || "Destination"}</p>
              </div>
            </div>

            {/* Passenger Info */}
            <div className="bg-secondary/30 rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2">Passenger</p>
              <p className="font-bold text-foreground">{booking.passenger?.firstName || "Passenger"}</p>
            </div>

            {/* Waiting for Passenger */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">Waiting for passenger confirmation...</p>
              <p className="text-xs text-blue-800">They have 60 seconds to confirm the ride completion</p>
            </div>

            {/* Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                Once confirmed, you can proceed to rate the passenger
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isPassenger) {
    return (
      <Layout headerTitle="Ride Complete?" showNav={false}>
        <div className="px-4 py-6 pb-24 max-w-2xl mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-4">
            {confirmed ? (
              <>
                <div className="flex justify-center mb-4">
                  <CheckCircle size={64} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-foreground text-center">Ride Complete!</h2>
                <p className="text-center text-muted-foreground">
                  Thank you for riding with OFFICERIDES
                </p>

                {/* Next: Rating */}
                <Link href={`/ride/${bookingId}/rating`}>
                  <button className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors">
                    Rate Your Experience
                  </button>
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-foreground">Confirm Ride Completion</h2>

                {/* Destination */}
                <div className="flex gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
                  <MapPin size={20} className="text-green-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-green-700">Destination</p>
                    <p className="font-semibold text-foreground">{booking?.ride?.destination || "Destination"}</p>
                  </div>
                </div>

                {/* Driver Info */}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <p className="text-xs text-muted-foreground mb-2">Driver</p>
                  <p className="font-bold text-foreground">{booking.ride?.driver?.firstName || "Driver"}</p>
                </div>

                {/* Countdown */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-primary mb-1">{confirmationCountdown}s</p>
                  <p className="text-sm text-blue-800">
                    {confirmationCountdown > 10
                      ? "Auto-confirms in"
                      : confirmationCountdown > 0
                      ? "Auto-confirming soon..."
                      : "Auto-confirmed"}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={handleConfirm}
                    disabled={isUpdating}
                    className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {isUpdating ? "Confirming..." : "✓ Confirm Completion"}
                  </button>
                  <button
                    onClick={handleDispute}
                    className="w-full py-2 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                  >
                    ✗ Dispute / Report Issue
                  </button>
                </div>

                {/* Info */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>Note:</strong> If there's an issue with the ride, please report it now
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </Layout>
    );
  }

  return null;
}
