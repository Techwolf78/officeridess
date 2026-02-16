import { Layout } from "@/components/ui/Layout";
import { useRideStatus } from "@/hooks/use-ride-status";
import { useBookingRealtime } from "@/hooks/use-booking-realtime";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute, useLocation } from "wouter";
import { MapPin, Clock, AlertCircle, MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { GoogleMap, Polyline } from "@react-google-maps/api";
import { decodePolyline } from "@/lib/utils";
import { format } from "date-fns";

export default function RideTracking() {
  const { user } = useAuth();
  const [, params] = useRoute("/ride/:bookingId/tracking");
  const [, setLocation] = useLocation();
  const bookingId = params?.bookingId;

  // Real-time Firebase listener
  const { booking, loading, error } = useBookingRealtime(bookingId || "");
  const { rideState, markCompleted, isUpdating } = useRideStatus(bookingId || "", "in_progress");
  
  // Decode route polyline
  const routePath = booking?.ride?.routePolyline ? decodePolyline(booking.ride.routePolyline) : [];

  // Calculate times
  const etaMinutes = booking?.ride?.eta || 18;
  const rideTime = booking?.ride?.departureTime ? format(booking.ride.departureTime, 'h:mm a') : '';
  const etaTime = booking?.ride?.departureTime ? format(new Date(booking.ride.departureTime.getTime() + etaMinutes * 60 * 1000), 'h:mm a') : '';

  // Auto-redirect when ride is completed
  useEffect(() => {
    if (booking?.status === "completed") {
      setLocation(`/ride/${bookingId}/complete`);
    }
  }, [booking?.status, bookingId, setLocation]);

  const isDriver = user?.role === "driver";
  const isPassenger = user?.role === "passenger";

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

  return (
    <Layout headerTitle="Ride in Progress" showNav={false}>
      <div className="px-4 py-6 pb-24 max-w-2xl mx-auto space-y-4">
        {/* Route Map */}
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '200px', borderRadius: '1rem' }}
          center={routePath.length > 0 ? routePath[0] : { lat: 0, lng: 0 }}
          zoom={13}
          options={{
            disableDefaultUI: true,
            zoomControl: false,
            scrollwheel: false,
            gestureHandling: 'none',
          }}
        >
          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#3B82F6',
                strokeOpacity: 0.8,
                strokeWeight: 4,
              }}
            />
          )}
        </GoogleMap>

        {/* Progress Info */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Ride Time */}
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <Clock size={20} className="text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">Ride Time</p>
              <p className="text-lg font-bold text-foreground">{rideTime}</p>
            </div>

            {/* ETA */}
            <div className="bg-secondary/30 rounded-lg p-3 text-center">
              <Clock size={20} className="text-primary mx-auto mb-1" />
              <p className="text-xs text-muted-foreground">ETA</p>
              <p className="text-lg font-bold text-foreground">{etaTime}</p>
            </div>
          </div>

          {/* Route Info */}
          <div className="space-y-2 border-t border-border/50 pt-3">
            <div className="flex gap-3">
              <div className="text-primary font-bold">📍</div>
              <div>
                <p className="text-xs text-muted-foreground">From</p>
                <p className="text-sm font-semibold">{booking.ride?.origin || "Pickup location"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary font-bold">🎯</div>
              <div>
                <p className="text-xs text-muted-foreground">To</p>
                <p className="text-sm font-semibold">{booking.ride?.destination || "Destination"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button - Driver Only */}
        {isDriver && (
          <Link href={`/ride/${bookingId}/complete`}>
            <button
              onClick={markCompleted}
              disabled={isUpdating}
              className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {isUpdating ? "Updating..." : "Arrived at Destination"}
            </button>
          </Link>
        )}

        {/* Safety Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <strong>Safety:</strong> Don't cancel unless it's an emergency
          </p>
        </div>

        {/* Emergency Cancel */}
        <button className="w-full py-2 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors text-sm">
          Emergency Cancel
        </button>
      </div>
    </Layout>
  );
}
