import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useRides } from "@/hooks/use-rides";
import { useBookings } from "@/hooks/use-bookings";
import { RideCard } from "@/components/RideCard";
import { Loader2, MapPin, Calendar, Search } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Home() {
  const { user } = useAuth();
  const { data: rides, isLoading } = useRides(user?.role === 'driver' ? { driverId: user?.uid } : undefined);
  const { data: bookings } = useBookings();
  
  const isDriver = user?.role === 'driver';

  // Helper function to check if user has booked a ride
  const hasUserBooked = (rideId: string) => {
    return bookings?.some(b => b.rideId === rideId && b.passengerId === user?.uid && b.status === 'confirmed');
  };

  return (
    <Layout headerTitle="CommuteSync">
      <div className="px-6 py-6 space-y-8">
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

        {/* Upcoming Rides Section */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <h3 className="text-lg font-display font-bold">
              {isDriver ? "Your Posted Rides" : "Available Rides"}
            </h3>
            <Link href={isDriver ? "/rides" : "/search"} className="text-sm text-primary font-medium hover:underline">
              View all
            </Link>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : rides && rides.length > 0 ? (
            <div className="space-y-4">
              {rides.slice(0, 3).map((ride) => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  userBooking={!isDriver && hasUserBooked(ride.id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-border">
              <div className="w-12 h-12 bg-secondary rounded-full flex items-center justify-center mx-auto mb-3 text-muted-foreground">
                <Search size={20} />
              </div>
              <p className="text-muted-foreground text-sm">No rides found at the moment.</p>
              {isDriver && (
                <Link href="/create-ride" className="text-primary font-medium text-sm mt-2 block">
                  Post a ride now
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
