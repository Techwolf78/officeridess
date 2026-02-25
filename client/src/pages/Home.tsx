import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useRidesRealtime } from "@/hooks/use-rides-realtime";
import { useDriverRidesRealtime } from "@/hooks/use-driver-rides-realtime";
import { useBookings } from "@/hooks/use-bookings";
import { useBookingsRealtime } from "@/hooks/use-bookings-realtime";
import { RideCard } from "@/components/RideCard";
import { RideCardSkeleton } from "@/components/RideCardSkeleton";
import { Loader2, MapPin, Calendar, Search, Star } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseRide } from "@/lib/types";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Use dedicated driver rides hook for drivers
  const { rides: driverRides, loading: driverLoading } = useDriverRidesRealtime();
  const { rides: passengerRides, loading: passengerLoading } = useRidesRealtime();
  
  const { data: bookings } = useBookings();
  const { bookings: realtimeBookings } = useBookingsRealtime();
  const [rideBookingMap, setRideBookingMap] = useState<{ [rideId: string]: string }>({});
  
  const isDriver = user?.role === 'driver';
  
  // Select rides based on user role
  const rides = isDriver ? driverRides : passengerRides;
  const loading = isDriver ? driverLoading : passengerLoading;

  // Helper function to determine if "I've Arrived" button should appear
  const shouldShowArrivedButton = (ride: FirebaseRide, hasBooking: boolean): boolean => {
    // Rules for showing the button:
    // 1. User must be a driver (handled by parent condition)
    // 2. Ride status must be 'scheduled' or 'in_progress'
    if (!['scheduled', 'in_progress'].includes(ride.status)) return false;

    // 3. Ride must have at least one confirmed booking
    if (!hasBooking) return false;

    // 4. Current date must match ride departure date
    const now = new Date();
    const rideDate = new Date(ride.departureTime);
    
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    
    const rideDateOnly = new Date(rideDate);
    rideDateOnly.setHours(0, 0, 0, 0);
    
    if (rideDateOnly.getTime() !== todayStart.getTime()) return false;

    // 5. Current time must be within 1 hour before or after ride departure
    const timeDiffMinutes = Math.abs(now.getTime() - rideDate.getTime()) / (1000 * 60);
    if (timeDiffMinutes > 60) return false;

    return true;
  };

  // Fetch first booking ID for each ride (for drivers)
  useEffect(() => {
    if (!isDriver || !rides) return;

    const fetchBookingIds = async () => {
      const map: { [rideId: string]: string } = {};
      
      for (const ride of rides) {
        try {
          const q = query(
            collection(db, "bookings"),
            where("rideId", "==", ride.id),
            where("status", "==", "confirmed")
          );
          const snapshot = await getDocs(q);
          if (snapshot.docs.length > 0) {
            map[ride.id] = snapshot.docs[0].id;
          }
        } catch (err) {
          console.error(`Failed to fetch booking for ride ${ride.id}:`, err);
        }
      }
      
      setRideBookingMap(map);
    };

    fetchBookingIds();
  }, [isDriver, rides]);

  // Helper function to check if user has booked a ride
  const hasUserBooked = (rideId: string) => {
    return bookings?.some(b => b.rideId === rideId && b.passengerId === user?.uid && b.status === 'confirmed');
  };

  // Active rides filtering
  const now = new Date();
  let activeRides = [];
  if (isDriver) {
    activeRides = rides?.filter(ride => {
      const expiry = new Date(ride.departureTime.getTime() + (ride.eta + 30) * 60 * 1000);
      return now < expiry;
    }) || [];
  } else {
    const bookedRides = rides?.filter(ride => hasUserBooked(ride.id)) || [];
    activeRides = bookedRides.filter(ride => {
      const expiry = new Date(ride.departureTime.getTime() + (ride.eta + 30) * 60 * 1000);
      return now < expiry;
    });
  }

  return (
    <Layout
      headerTitle="OFFICERIDES"
      headerExtra={
        <>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Hello, {user?.firstName || "Traveler"} 👋
          </h2>
          <p className="text-muted-foreground mt-1">Where do you want to go today?</p>
        </>
      }
    >
      <div className="px-4 py-6 space-y-8">
        {/* Quick Search Widget */}
        {!isDriver && (
          <div className="bg-primary rounded-3xl p-6 shadow-xl shadow-primary/20 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10" />
            
            <h3 className="text-lg font-semibold mb-4 relative z-10">Find a ride</h3>
            
            <Link href="/search">
              <div className="space-y-3 relative z-10">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                  <MapPin className="text-white/70" size={18} />
                  <span className="text-white/50 text-sm">To Office / Home...</span>
                </div>
                
                <div className="flex gap-3">
                  <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center gap-3 border border-white/10 hover:bg-white/20 transition-colors cursor-pointer">
                    <Calendar className="text-white/70" size={18} />
                    <span className="text-white/50 text-sm">Today</span>
                  </div>
                  <div className="bg-white text-primary font-bold rounded-xl px-4 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                    <Search size={20} />
                  </div>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* Active Rides Section */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            {isDriver ? "Your Posted Rides" : "Your Booked Rides"}
          </h3>
          <div className="space-y-3">
            {loading ? (
              // Show skeleton loaders while loading
              <>
                <RideCardSkeleton />
                <RideCardSkeleton />
                <RideCardSkeleton />
              </>
            ) : activeRides.length > 0 ? (
              activeRides.map((ride) => {
                // Get corresponding booking for this ride (for passengers)
                const booking = !isDriver ? realtimeBookings?.find(b => b.rideId === ride.id && b.status !== 'cancelled') : null;
                const hasBooking = !!rideBookingMap[ride.id];
                
                return (
                  <div key={ride.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-border/50 hover:shadow-md transition-all">
                    <div className="p-4">
                      <RideCard ride={ride} />
                    </div>

                    {/* Driver Action Panel - I've Arrived Button */}
                    {isDriver && shouldShowArrivedButton(ride, hasBooking) && (
                      <div className="border-t border-border/50 p-3">
                        <button
                          onClick={() => setLocation(`/ride/${rideBookingMap[ride.id]}/waiting`)}
                          className="w-full py-2 text-xs bg-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
                        >
                          ✓ I've Arrived
                        </button>
                      </div>
                    )}

                    {/* Passenger Status & Actions Panel */}
                    {!isDriver && booking && booking.status !== 'confirmed' && (
                      <div className="border-t border-border/50 p-3 space-y-2">
                        {/* Status Badge */}
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-muted-foreground font-medium">Status: {booking.status.replace('_', ' ').toUpperCase()}</span>
                        </div>

                        {/* Status-specific buttons */}
                        {booking.status === 'waiting' && (
                          <button 
                            onClick={() => setLocation(`/ride/${booking.id}/waiting`)}
                            className="w-full py-2 text-xs bg-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
                            View Driver Location
                          </button>
                        )}

                        {booking.status === 'in_progress' && (
                          <button 
                            onClick={() => setLocation(`/ride/${booking.id}/tracking`)}
                            className="w-full py-2 text-xs bg-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
                            Track Ride
                          </button>
                        )}

                        {booking.status === 'completed' && (
                          <button 
                            onClick={() => setLocation(`/ride/${booking.id}/rating`)}
                            className="w-full py-2 text-xs bg-primary text-white font-semibold rounded-lg hover:opacity-90 transition-opacity">
                            Rate Driver
                          </button>
                        )}

                        {booking.status === 'rated' && (
                          <div className="text-center py-0.5">
                            <p className="text-xs text-muted-foreground">Thanks for rating <span className="font-semibold text-foreground">{booking.passengerRating}</span> ⭐</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">
                  {isDriver ? "No active rides posted yet" : "No active bookings yet"}
                </p>
                {!isDriver && (
                  <Link href="/search" className="text-primary hover:underline text-sm mt-2 block">
                    Find a ride →
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </Layout>
  );
}
