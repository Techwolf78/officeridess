import { Layout } from "@/components/ui/Layout";
import { useRideStatus } from "@/hooks/use-ride-status";
import { useBookingRealtime } from "@/hooks/use-booking-realtime";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute, useLocation } from "wouter";
import { MapPin, Clock, Phone, MessageCircle, AlertCircle, ArrowLeft, Loader2, AlertTriangle, ShieldCheck } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RideWaiting() {
  const { user } = useAuth();
  const [, params] = useRoute("/ride/:bookingId/waiting");
  const [, setLocation] = useLocation();
  const bookingId = params?.bookingId;

  // Real-time Firebase listener for booking data
  const { booking, loading, error } = useBookingRealtime(bookingId || "");
  const { rideState, markArrived, startRide, cancelRide, isUpdating } = useRideStatus(bookingId || "", "confirmed");
  
  const [waitingMinutes, setWaitingMinutes] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("change_of_plans");
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Calculate if passenger can manually start (e.g. 5 minutes after scheduled time)
  const canPassengerStart = useMemo(() => {
    if (!booking?.ride?.departureTime) return false;
    const departure = new Date(booking.ride.departureTime);
    const fiveMinutesAfter = new Date(departure.getTime() + 5 * 60 * 1000);
    return new Date() > fiveMinutesAfter;
  }, [booking?.ride?.departureTime]);

  // Auto-redirect when ride starts
  useEffect(() => {
    if (booking?.status === "in_progress") {
      setLocation(`/ride/${bookingId}/tracking`);
    }
  }, [booking?.status, bookingId, setLocation]);

  // Simulate driver arriving - driven by both local state and Firestore booking status
  useEffect(() => {
    if (rideState.status === "waiting" || booking?.status === "waiting") {
      const interval = setInterval(() => {
        setWaitingMinutes(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [rideState.status, booking?.status]);

  const isDriver = user?.role === "driver";
  const isPassenger = user?.role === "passenger";

  const handleCancelRide = async () => {
    setIsCancelling(true);
    try {
      console.log("🚨 Cancellation initiated - Reason:", cancelReason);
      await new Promise((resolve) => setTimeout(resolve, 500)); // Ensure Firestore update
      cancelRide(cancelReason, isDriver ? "driver" : "passenger");
      setShowCancelDialog(false);
      // Redirect after a brief delay
      setTimeout(() => {
        setLocation("/rides");
      }, 1000);
    } catch (err) {
      console.error("❌ Error cancelling ride:", err);
    } finally {
      setIsCancelling(false);
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

  if (rideState.status === "waiting" || booking?.status === "waiting") {
    return (
      <Layout headerTitle="Driver Arriving..." showNav={false}>
        <div className="px-4 py-6 pb-24 max-w-2xl mx-auto space-y-6">
          <Link href={`/ride/${bookingId}`}>
            <button className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
              <ArrowLeft size={20} />
              <span className="text-sm font-medium">Back</span>
            </button>
          </Link>

          {isPassenger && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Driver Arriving</h2>
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <p className="text-2xl font-bold text-primary text-center">{waitingMinutes}s</p>
                  <p className="text-center text-sm text-muted-foreground mt-1">Driver arrived</p>
                </div>

                {/* Driver Info Card */}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                    <p className="font-bold text-foreground">{booking.ride?.driver?.firstName || "Driver"}</p>
                    <p className="text-sm text-muted-foreground">⭐ 4.8</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">{booking.ride?.vehicle?.plateNumber || "Vehicle"}</p>
                    <p className="text-xs text-muted-foreground">{booking.ride?.vehicle?.model || "Car"}</p>
                    </div>
                  </div>
                </div>

                {/* Location Pin */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <MapPin size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-blue-900 mb-1">Driver Location (Real-Time)</p>
                    <p className="text-sm text-blue-800">Now listening to live updates</p>
                    <p className="text-xs text-blue-700 mt-2 font-medium">📍 100 meters away from pickup</p>
                  </div>
                </div>

                {/* Estimated Time */}
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border/50">
                  <Clock size={20} className="text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Estimated arrival</p>
                    <p className="font-semibold text-foreground">2-3 minutes</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-3">
                  <button className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
                    <MessageCircle size={20} />
                    Chat with Driver
                  </button>
                  <button onClick={() => setShowCancelDialog(true)} className="w-full py-2 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors">
                    Cancel Ride
                  </button>
                </div>

                {/* Info */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    <strong>Tip:</strong> Confirm with driver about exact pickup location via chat
                  </p>
                </div>
              </div>
            </>
          )}

          {isDriver && (
            <>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-4">
                <h2 className="text-2xl font-bold text-foreground">Ready to Start?</h2>

                {/* Passenger Info */}
                <div className="bg-secondary/30 rounded-xl p-4">
                  <p className="font-bold text-foreground mb-1">Passenger</p>
                  <p className="text-sm text-muted-foreground">{booking.passenger?.firstName || "Passenger"}</p>
                </div>

                {/* Route Info */}
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="text-primary font-bold">📍</div>
                    <div>
                      <p className="text-xs text-muted-foreground">From</p>
                      <p className="font-semibold">{booking.ride?.origin || "Pickup location"}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-primary font-bold">🎯</div>
                    <div>
                      <p className="text-xs text-muted-foreground">To</p>
                      <p className="font-semibold">{booking.ride?.destination || "Destination"}</p>
                    </div>
                  </div>
                </div>

                {/* Start Button */}
                <Link href={`/ride/${bookingId}/tracking`}>
                  <button
                    onClick={startRide}
                    disabled={isUpdating}
                    className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors text-lg disabled:opacity-50"
                  >
                    {isUpdating ? "Starting..." : "Start Ride"}
                  </button>
                </Link>

                <button onClick={() => setShowCancelDialog(true)} className="w-full py-2 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors">
                  Cancel Ride
                </button>
              </div>
            </>
          )}
        </div>
      </Layout>
    );
  }

  // Before driver arrives - show "I'm on my way"
  return (
    <Layout headerTitle="Ride Confirmed" showNav={false}>
      <div className="px-4 py-6 pb-24 max-w-2xl mx-auto space-y-6">
        <Link href={`/ride/${bookingId}`}>
          <button className="flex items-center gap-2 text-primary hover:text-primary/80 transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-medium">Back</span>
          </button>
        </Link>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 space-y-4">
          {isDriver ? (
            <>
              <h2 className="text-2xl font-bold text-foreground">You're On Your Way</h2>
              <p className="text-muted-foreground">Head to the pickup location</p>
              <button
                onClick={markArrived}
                disabled={isUpdating}
                className="w-full py-3 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-colors text-lg disabled:opacity-50"
              >
                {isUpdating ? "Updating..." : "I've Arrived"}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-foreground">Waiting for Driver</h2>
              <p className="text-muted-foreground">Driver is on the way to your pickup location</p>
              <div className="bg-secondary/30 rounded-xl p-4">
                <div className="animate-pulse flex gap-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                </div>
              </div>

              {/* Emergency Override for Passenger */}
              {canPassengerStart && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                      <strong>Driver phone issues?</strong> If you're already in the car but the driver can't start the ride, you can start it yourself now.
                    </p>
                  </div>
                  <button
                    onClick={startRide}
                    disabled={isUpdating}
                    className="w-full py-2 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <ShieldCheck size={18} />
                    {isUpdating ? "Starting..." : "Start Ride Now (Passenger Override)"}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Cancel Confirmation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent className="max-w-sm">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <AlertDialogTitle>Cancel This Ride?</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-4">
              <p>Are you sure you want to cancel this ride? This action cannot be undone.</p>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Reason for cancellation:</label>
                <select 
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="change_of_plans">Change of Plans</option>
                  <option value="emergency">Emergency Situation</option>
                  <option value="driver_issue">Driver Issue</option>
                  <option value="late_driver">Driver Running Late</option>
                  <option value="found_ride">Found Another Ride</option>
                  <option value="other">Other Reason</option>
                </select>
              </div>
            </AlertDialogDescription>
            <div className="flex gap-2">
              <AlertDialogCancel disabled={isCancelling}>Keep Ride</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleCancelRide}
                disabled={isCancelling}
                className="bg-red-600 hover:bg-red-700"
              >
                {isCancelling ? "Cancelling..." : "Cancel Ride"}
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
