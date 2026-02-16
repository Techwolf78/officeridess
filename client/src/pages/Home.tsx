import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useRidesRealtime } from "@/hooks/use-rides-realtime";
import { useBookings } from "@/hooks/use-bookings";
import { RideCard } from "@/components/RideCard";
import { RideCardSkeleton } from "@/components/RideCardSkeleton";
import { Loader2, MapPin, Calendar, Search } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Home() {
  const { user } = useAuth();
  const { rides, loading } = useRidesRealtime(user?.role === 'driver' ? { driverId: user?.uid } : undefined);
  const { data: bookings } = useBookings();
  
  const isDriver = user?.role === 'driver';

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
    <Layout headerTitle="OFFICERIDES">
      <div className="px-4 py-6 space-y-8">
        {/* Welcome Section */}
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Hello, {user?.firstName || "Traveler"} 👋
          </h2>
          <p className="text-muted-foreground mt-1">Where do you want to go today?</p>
        </div>

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
              activeRides.map(ride => <RideCard key={ride.id} ride={ride} />)
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
