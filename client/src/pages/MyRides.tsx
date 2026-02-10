import { Layout } from "@/components/ui/Layout";
import { useAuth } from "@/hooks/use-auth";
import { useBookings, useCancelBooking } from "@/hooks/use-bookings";
import { useRides, useCancelRide } from "@/hooks/use-rides";
import { RideCard } from "@/components/RideCard";
import { Loader2, Ticket, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

export default function MyRides() {
  const { user } = useAuth();
  const isDriver = user?.role === 'driver';
  const { toast } = useToast();
  const [cancelRideId, setCancelRideId] = useState<string | null>(null);
  const [cancelBookingData, setCancelBookingData] = useState<{ bookingId: string; rideTitle: string } | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");

  // Always call hooks at the top level
  const { data: rides, isLoading: ridesLoading } = useRides(isDriver ? { driverId: user?.uid, includeCancelled: true } : undefined);
  const { data: bookings, isLoading: bookingsLoading } = useBookings();
  const cancelRide = useCancelRide();
  const cancelBooking = useCancelBooking();

  const handleCancelRide = (rideId: string) => {
    setCancelRideId(rideId);
  };

  const confirmCancelRide = () => {
    if (!cancelRideId) return;

    cancelRide.mutate(cancelRideId, {
      onSuccess: () => {
        toast({
          title: "Ride Cancelled",
          description: "Your ride has been cancelled and all bookings have been refunded.",
          className: "bg-red-50 border-red-200 text-red-900",
        });
        setCancelRideId(null);
      },
      onError: (err) => {
        toast({
          title: "Failed to cancel ride",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleCancelBooking = (bookingId: string, rideTitle: string) => {
    setCancelBookingData({ bookingId, rideTitle });
    setCancelReason("");
  };

  const confirmCancelBooking = () => {
    if (!cancelBookingData || !cancelReason) return;

    cancelBooking.mutate(
      { bookingId: cancelBookingData.bookingId, reason: cancelReason },
      {
        onSuccess: () => {
          toast({
            title: "Booking Cancelled",
            description: "Your booking has been cancelled successfully.",
            className: "bg-red-50 border-red-200 text-red-900",
          });
          setCancelBookingData(null);
          setCancelReason("");
        },
        onError: (err) => {
          toast({
            title: "Failed to cancel booking",
            description: err.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  if (isDriver) {
    // Driver View: Show rides created by me
    return (
      <Layout headerTitle="My Posted Rides" showNav={true}>
        <div className="px-6 py-6">
          {ridesLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
          ) : rides && rides.length > 0 ? (
            <div className="space-y-4">
              {rides.map(ride => (
                <RideCard 
                  key={ride.id} 
                  ride={ride} 
                  showStatus={true}
                  isDriverRide={true}
                  onCancelRide={handleCancelRide}
                />
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

        <AlertDialog open={!!cancelRideId} onOpenChange={() => setCancelRideId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Ride</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this ride? This action cannot be undone.
                <br /><br />
                <strong>Important:</strong> All passenger bookings will be automatically cancelled and they will need to arrange refunds directly with you in cash.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Ride</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmCancelRide}
                disabled={cancelRide.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {cancelRide.isPending ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                Cancel Ride
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Layout>
    );
  }

  // Passenger View: Show my bookings
  return (
    <Layout headerTitle="My Bookings" showNav={true}>
      <div className="px-6 py-6">
        {bookingsLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" /></div>
        ) : bookings && bookings.length > 0 ? (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white rounded-2xl p-5 shadow-sm border border-border/50">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                    <Ticket size={16} />
                    <span>Booking #{booking.id.slice(-6)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => handleCancelBooking(booking.id, `${booking.ride?.origin} → ${booking.ride?.destination}`)}
                        className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      booking.status === 'confirmed' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }`}>
                      {booking.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                
                {booking.ride && <RideCard ride={booking.ride} />}

                <div className="mt-4 pt-4 border-t flex justify-between text-sm">
                   <div className="flex flex-col">
                     <span className="text-muted-foreground">{booking.seatsBooked} Seat(s)</span>
                     {booking.status === 'cancelled' && booking.cancelledAt && (
                       <span className="text-xs text-muted-foreground">
                         Cancelled {format(booking.cancelledAt, "MMM d, h:mm a")}
                       </span>
                     )}
                   </div>
                   <div className="text-right">
                     <span className="font-bold">{booking.status === 'confirmed' ? 'Confirmed' : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                     {booking.status === 'cancelled' && booking.cancelReason && (
                       <div className="text-xs text-muted-foreground mt-1">
                         {booking.cancelReason}
                       </div>
                     )}
                   </div>
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

      <Dialog open={!!cancelBookingData} onOpenChange={() => setCancelBookingData(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your booking for <strong>{cancelBookingData?.rideTitle}</strong>?
              <br /><br />
              This action cannot be undone. Your seats will be returned to the ride and become available for other passengers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Reason for cancellation *</label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="change_of_plans">Change of plans</SelectItem>
                  <SelectItem value="found_alternative_transport">Found alternative transport</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex gap-3">
            <button
              onClick={() => setCancelBookingData(null)}
              className="flex-1 px-4 py-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              Keep Booking
            </button>
            <button
              onClick={confirmCancelBooking}
              disabled={!cancelReason || cancelBooking.isPending}
              className="flex-1 px-6 py-2 bg-red-600 text-white rounded-lg font-semibold shadow-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {cancelBooking.isPending && <Loader2 className="animate-spin" size={16} />}
              Cancel Booking
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
