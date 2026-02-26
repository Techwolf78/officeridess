import { FirebaseRide } from "@/lib/types";
import { format, addMinutes } from "date-fns";
import { MapPin, Clock, Users, ChevronRight, Calendar, CheckCircle, X, Star, Shield, Zap, Cigarette, PawPrint, Music, Wind, Route, Flag } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { DriverBadge } from "@/components/DriverBadge";
import { minDistanceToPolyline, decodePolyline, getDistanceAlongPolyline } from "@/lib/utils";

interface RideCardProps {
  ride: FirebaseRide;
  showStatus?: boolean;
  userBooking?: boolean; // Whether current user has booked this ride
  isDriverRide?: boolean; // Whether current user is the driver of this ride
  onCancelRide?: (rideId: string) => void; // Callback for cancelling ride
  passengerOrigin?: { lat: number; lng: number }; // Passenger's search origin
  passengerDest?: { lat: number; lng: number }; // Passenger's search destination
}

export function RideCard({ ride, showStatus, userBooking, isDriverRide, onCancelRide, passengerOrigin, passengerDest }: RideCardProps) {
  const isFull = ride.availableSeats === 0;

  // Get the route polyline
  const routePolyline = ride.route && ride.route.length > 0 ? ride.route : (ride.routePolyline ? decodePolyline(ride.routePolyline) : []);

  // Calculate distances if passenger points provided
  let originDistance: number | null = null;
  let destDistance: number | null = null;
  if (passengerOrigin && routePolyline.length > 0) {
    originDistance = minDistanceToPolyline(passengerOrigin, routePolyline);
  }
  if (passengerDest && routePolyline.length > 0) {
    destDistance = minDistanceToPolyline(passengerDest, routePolyline);
  }

  // Calculate pickup time if passenger origin provided
  let pickupTime: Date | null = null;
  if (passengerOrigin && routePolyline.length > 0 && ride.distance > 0 && ride.eta) {
    const distToPickup = getDistanceAlongPolyline(passengerOrigin, routePolyline);
    const timeOffsetMinutes = (distToPickup / ride.distance) * ride.eta;
    pickupTime = addMinutes(new Date(ride.departureTime), Math.round(timeOffsetMinutes));
  }

  // Format distance for display
  const formatDistance = (dist: number): string => {
    if (dist < 1000) {
      return `${Math.round(dist)}m`;
    } else {
      return `${(dist / 1000).toFixed(1)} km`;
    }
  };

  const handleCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCancelRide) {
      onCancelRide(ride.id);
    }
  };

  return (
    <div className="block relative">
      <Link href={`/ride/${ride.id}`} className="block">
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-200 cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
              {ride.driver?.firstName?.[0] || "D"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">{ride.driver ? `${ride.driver.firstName} ${ride.driver.lastName || ''}`.trim() || "Driver" : "Driver"}</h3>
                {ride.driver?.verificationStatus && (
                  <DriverBadge verificationStatus={ride.driver.verificationStatus} size="sm" simplifiedDisplay={true} />
                )}
                {ride.instantBooking && (
                  <Zap className="w-4 h-4 text-green-500" aria-label="Instant Booking" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {ride.driverRating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">{ride.driverRating.toFixed(1)}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{ride.vehicle?.color} {ride.vehicle?.model}</p>
              </div>
            </div>
          </div>
          <div className="text-right">
            {(showStatus || userBooking) && (
              <div className="flex gap-1 justify-end">
                {showStatus && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    ride.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                    ride.status === 'in_progress' ? 'bg-green-50 text-green-600' :
                    ride.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                    'bg-red-50 text-red-500'
                  }`}>
                    {ride.status.replace('_', ' ')}
                  </span>
                )}
                {userBooking && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-50 text-green-600">
                    Booked
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3 relative">
          {/* Connecting line */}
          <div className="absolute left-[7px] top-2 bottom-6 w-[2px] bg-border/50" />

          <div className="flex items-start gap-3 relative z-10">
            <div className="w-4 h-4 rounded-full border-2 border-primary bg-white mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight">{ride.originDisplayName || ride.origin}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {ride.departureTime && !isNaN(new Date(ride.departureTime).getTime()) ? format(new Date(ride.departureTime), "h:mm a") : "Invalid time"}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 relative z-10">
            <div className="w-4 h-4 rounded-full bg-primary mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight">{ride.destDisplayName || ride.destination}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Approx. arrival depending on traffic
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t">
          {/* Ride Preferences */}
          {ride.preferences && (
            <div className="flex items-center gap-2 mb-3 pt-3">
              {ride.preferences.smoking && <Cigarette className="w-4 h-4 text-muted-foreground" aria-label="Smoking allowed" />}
              {ride.preferences.pets && <PawPrint className="w-4 h-4 text-muted-foreground" aria-label="Pets allowed" />}
              {ride.preferences.music && <Music className="w-4 h-4 text-muted-foreground" aria-label="Music allowed" />}
              {ride.preferences.ac && <Wind className="w-4 h-4 text-muted-foreground" aria-label="AC available" />}
            </div>
          )}

          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar size={14} />
              <span>{ride.departureTime && !isNaN(new Date(ride.departureTime).getTime()) ? format(new Date(ride.departureTime), "MMM d, yyyy") : "Invalid date"}</span>
            </div>
            <div className="px-3 py-1.5">
              <div className="text-base font-display font-bold text-primary text-center">
                ₹{ride.pricePerSeat}<span className="text-xs text-primary/70">/seat</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Users size={14} className="text-muted-foreground" />
              <span className={`font-medium ${isFull ? "text-red-500" : "text-muted-foreground"}`}>
                {isFull ? "Full" : `${ride.availableSeats} left`}
              </span>
              {userBooking && (
                <CheckCircle className="w-3.5 h-3.5 text-green-600 ml-1" />
              )}
            </div>
          </div>
          {isDriverRide && ride.status === 'scheduled' && (
            <>
              <div className="border-t border-border/50 mt-2 mb-2"></div>
              <div className="flex justify-center">
                <button
                  onClick={handleCancelClick}
                  className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel Ride
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer with ETA and Distance */}
        <div className="border-t border-border/50 mt-3 pt-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock size={14} />
              <span>{ride.eta ? `approx. ${Math.round(ride.eta)} min` : "ETA unknown"}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin size={14} />
              <span>{ride.distance ? `${ride.distance.toFixed(1)} km` : "Distance unknown"}</span>
            </div>
          </div>
        </div>

        {/* Passenger distance info */}
        {(originDistance !== null || destDistance !== null) && (
          <div className="border-t border-border/50 mt-2 pt-2">
            <div className="flex justify-between items-center text-xs text-muted-foreground px-0">
              <div className="flex items-center gap-0.5" title="Distance from your pickup to the ride route">
                <span className="text-[10px] font-medium">Pickup</span>
                <MapPin size={10} />
                <span className="flex items-center gap-1 text-[10px]">
                  {originDistance !== null ? formatDistance(originDistance) : "—"}
                  {pickupTime && (
                    <span className="text-primary font-bold">(approx. {format(pickupTime, "h:mm a")})</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-0.5" title="Total ride distance">
                <span className="text-[10px] font-medium">Ride</span>
                <Route size={10} />
                <span className="text-[10px]">{ride.distance ? `${ride.distance.toFixed(1)} km` : "—"}</span>
              </div>
              <div className="flex items-center gap-0.5" title="Distance from your destination to the ride route">
                <span className="text-[10px] font-medium">Drop</span>
                <Flag size={10} />
                <span className="text-[10px]">{destDistance !== null ? formatDistance(destDistance) : "—"}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Link>
    </div>
  );
}
