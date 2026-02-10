import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useBookings } from "@/hooks/use-bookings";
import { useRides } from "@/hooks/use-rides";
import { RideCard } from "@/components/RideCard";
import { Loader2, Ticket, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function MyRides() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';

  if (isDriver) {
    // Driver View: Show rides created by me
    const { data: rides, isLoading } = useRides(); 
    // Note: A real implementation would filter by driverId on backend, 
    // but for this MVP we might get all and filter locally or add a param.
    // Assuming backend returns all for now, we filter:
    const myPublishedRides = rides?.filter(r => r.driverId === user?.uid);

    return (
      <Layout headerTitle="My Posted Rides" showNav={true}>
        <div className="px-6 py-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : myPublishedRides && myPublishedRides.length > 0 ? (
            <div className="space-y-4">
              {myPublishedRides.map(ride => (
                <RideCard key={ride.id} ride={ride} showStatus={true} />
              ))}
            </div>
          ) : (
             <div className="text-center py-16">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Calendar size={24} />
              </div>
              <h3 className="font-semibold mb-2">No rides published</h3>
              <p className="text-muted-foreground text-sm mb-6">You haven't posted any rides yet.</p>
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Passenger View: Show my bookings
  const { data: bookings, isLoading } = useBookings();

  return (
    <Layout headerTitle="My Bookings" showNav={true}>
      <div className="px-6 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Ticket size={16} />
                    <span>Booking #{booking.id}</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    booking.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                  }`}>
                    {booking.status.toUpperCase()}
                  </span>
                </div>
                
                <RideCard ride={booking.ride} />

                <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                   <span className="text-muted-foreground">{booking.seatsBooked} Seat(s)</span>
                   <span className="font-bold">${(booking.totalPrice / 100).toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
              <Ticket size={24} />
            </div>
            <h3 className="font-semibold mb-2">No bookings yet</h3>
            <p className="text-muted-foreground text-sm mb-6">You haven't booked any rides yet.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
