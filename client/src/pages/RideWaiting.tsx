import { Layout } from "@/components/ui/Layout";
import { useRideStatus } from "@/hooks/use-ride-status";
import { useBookingRealtime } from "@/hooks/use-booking-realtime";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute } from "wouter";
import { MapPin, Clock, Phone, MessageCircle, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function RideWaiting() {
  const { user } = useAuth();
  const [, params] = useRoute("/ride/:bookingId/waiting");
  const bookingId = params?.bookingId;

  // Real-time Firebase listener for booking data
  const { booking, loading, error } = useBookingRealtime(bookingId || "");
  const { rideState, markArrived, startRide, cancelRide, isUpdating } = useRideStatus(bookingId || "", "confirmed");
  
  const [waitingMinutes, setWaitingMinutes] = useState(0);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Simulate driver arriving
  useEffect(() => {
    if (rideState.status === "waiting") {
      const interval = setInterval(() => {
        setWaitingMinutes(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [rideState.status]);

  const isDriver = user?.role === "driver";
  const isPassenger = user?.role === "passenger";

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

  if (rideState.status === "waiting") {
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
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
