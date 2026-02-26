import { Layout } from "@/components/ui/Layout";
import { useRideStatus } from "@/hooks/use-ride-status";
import { useBookingRealtime } from "@/hooks/use-booking-realtime";
import { useAuth } from "@/hooks/use-auth";
import { Link, useRoute, useLocation } from "wouter";
import { MapPin, Clock, AlertCircle, MessageCircle, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { GoogleMap, Polyline } from "@react-google-maps/api";
import { decodePolyline } from "@/lib/utils";
import { format } from "date-fns";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { FirebaseRide } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function RideTracking() {
  const { user } = useAuth();
  const [, params] = useRoute("/ride/:bookingId/tracking");
  const [, setLocation] = useLocation();
  const bookingId = params?.bookingId;

  // Real-time Firebase listener
  const { booking, loading, error } = useBookingRealtime(bookingId || "");
  const { rideState, markCompleted, markCompletedWithCO2, isUpdating, cancelRide } = useRideStatus(bookingId || "", "in_progress");
  
  // Cancel dialog state
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("emergency");
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Fetch ride data separately since booking.ride might not be populated
  const [ride, setRide] = useState<FirebaseRide | null>(null);
  const [rideLoading, setRideLoading] = useState(false);

  useEffect(() => {
    if (!booking?.rideId) return;
    
    const fetchRide = async () => {
      try {
        setRideLoading(true);
        console.log("📍 Fetching ride data for rideId:", booking.rideId);
        const rideRef = doc(db, "rides", booking.rideId);
        const rideSnap = await getDoc(rideRef);
        
        if (rideSnap.exists()) {
          const rideData = rideSnap.data() as FirebaseRide;
          console.log("✅ Ride data fetched successfully:", rideData);
          setRide(rideData);
        } else {
          console.error("❌ Ride document not found!");
        }
      } catch (err) {
        console.error("❌ Error fetching ride:", err);
      } finally {
        setRideLoading(false);
      }
    };

    fetchRide();
  }, [booking?.rideId]);
  
  // Decode route polyline
  const routePath = ride?.routePolyline ? decodePolyline(ride.routePolyline) : [];

  // Calculate times - handle Firestore Timestamp conversion
  const etaMinutes = ride?.eta || 18;
  const departureDate = ride?.departureTime instanceof Date 
    ? ride.departureTime 
    : (ride?.departureTime as any)?.toDate?.() || new Date();
  const rideTime = format(departureDate, 'h:mm a');
  const etaTime = format(new Date(departureDate.getTime() + etaMinutes * 60 * 1000), 'h:mm a');

  // Auto-redirect when ride is completed (with a small delay to allow CO2 update)
  useEffect(() => {
    if (booking?.status === "completed") {
      console.log("🔀 Ride status changed to completed, redirecting...");
      // Small delay to ensure CO2 updates are processed
      const timer = setTimeout(() => {
        setLocation(`/ride/${bookingId}/complete`);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [booking?.status, bookingId, setLocation]);

  const isDriver = user?.role === "driver";
  const isPassenger = user?.role === "passenger";

  const handleEmergencyCancel = async () => {
    setIsCancelling(true);
    try {
      console.log("🚨 Emergency cancel initiated - Reason:", cancelReason);
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

  if (loading || rideLoading) {
    return (
      <Layout headerTitle="Loading..." showNav={false}>
        <div className="px-4 py-6 pb-24 max-w-2xl mx-auto flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <Loader2 className="animate-spin text-primary mx-auto" size={40} />
            <p className="text-muted-foreground">{loading ? "Loading booking..." : "Loading ride details..."}</p>
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
        {/* Route Map - Fixed z-index to not cover buttons */}
        <div className="relative z-0">
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
        </div>

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
                <p className="text-sm font-semibold">{ride?.origin || "Pickup location"}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-primary font-bold">🎯</div>
              <div>
                <p className="text-xs text-muted-foreground">To</p>
                <p className="text-sm font-semibold">{ride?.destination || "Destination"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button - Driver Only - Positioned above with higher z-index */}
        {isDriver && (
          <div className="space-y-2">
            <button
              onClick={() => {
                console.log("🔵 Button clicked!");
                console.log("📋 Booking:", booking);
                console.log("🚗 Ride:", ride);
                
                if (!booking) {
                  console.error("❌ Booking is null or undefined!");
                  return;
                }
                if (!ride) {
                  console.error("❌ Ride is null or undefined! (still loading?)");
                  return;
                }
                
                console.log("✅ All data valid, calling markCompletedWithCO2...");
                markCompletedWithCO2(booking, ride);
              }}
              disabled={isUpdating || !booking || !ride}
              className="relative z-20 w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
            >
              {isUpdating ? "⏳ Updating..." : "✅ Arrived at Destination"}
            </button>
            {!booking && <p className="text-xs text-red-600">⚠️ Loading booking data...</p>}
            {booking && !ride && <p className="text-xs text-amber-600">⏳ Loading ride details...</p>}
          </div>
        )}

        {/* Safety Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
          <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">
            <strong>Safety:</strong> Don't cancel unless it's an emergency
          </p>
        </div>

        {/* Emergency Cancel */}
        <button 
          onClick={() => setShowCancelDialog(true)}
          className="w-full py-2 text-red-600 font-semibold hover:bg-red-50 rounded-lg transition-colors text-sm border border-red-200"
        >
          🚨 Emergency Cancel
        </button>

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
                  <option value="emergency">Emergency Situation</option>
                  <option value="driver_issue">Driver Issue</option>
                  <option value="passenger_issue">Passenger Issue</option>
                  <option value="traffic">Heavy Traffic</option>
                  <option value="other">Other Reason</option>
                </select>
              </div>
            </AlertDialogDescription>
            <div className="flex gap-2">
              <AlertDialogCancel disabled={isCancelling}>Don't Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleEmergencyCancel}
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
