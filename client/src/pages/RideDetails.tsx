import { useParams, useLocation } from "wouter";
import { useRide } from "@/hooks/use-rides";
import { useAuth } from "@/hooks/use-auth";
import { useCreateBooking } from "@/hooks/use-bookings";
import { Layout } from "@/components/ui/Layout";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, Users, Shield, CreditCard, User as UserIcon } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function RideDetails() {
  const { id } = useParams<{ id: string }>();
  const { data: ride, isLoading } = useRide(Number(id));
  const { user } = useAuth();
  const { mutate: bookRide, isPending: isBooking } = useCreateBooking();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [seats, setSeats] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!ride) {
    return (
      <Layout headerTitle="Ride Details">
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold">Ride not found</h2>
          <Link href="/" className="text-primary mt-4 block">Go Home</Link>
        </div>
      </Layout>
    );
  }

  const isDriver = user?.id === ride.driverId;
  const totalPrice = ride.pricePerSeat * seats;

  const handleBook = () => {
    bookRide({ rideId: ride.id, seats }, {
      onSuccess: () => {
        setShowConfirm(false);
        toast({
          title: "Ride Booked!",
          description: "Your seat has been confirmed.",
          variant: "default",
          className: "bg-green-50 border-green-200 text-green-900",
        });
        setLocation("/rides");
      },
      onError: (err) => {
        setShowConfirm(false);
        toast({
          title: "Booking Failed",
          description: err.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background relative pb-24">
      {/* Header Image/Map Placeholder */}
      <div className="h-48 bg-primary/10 w-full relative overflow-hidden">
        {/* Abstract pattern or map placeholder */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent"></div>
        <div className="absolute top-6 left-6 z-10">
          <Link href="/">
            <button className="bg-white/90 backdrop-blur rounded-full p-2 shadow-sm hover:bg-white transition-colors">
              <ArrowLeft size={20} className="text-foreground" />
            </button>
          </Link>
        </div>
      </div>

      <div className="-mt-6 bg-background rounded-t-3xl relative px-6 py-8 min-h-[calc(100vh-160px)]">
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full mb-2 inline-block">
              {ride.status === 'scheduled' ? 'Scheduled' : ride.status.replace('_', ' ')}
            </span>
            <h1 className="text-2xl font-display font-bold text-foreground">Ride Details</h1>
          </div>
          <div className="text-right">
            <p className="text-2xl font-display font-bold text-primary">${(ride.pricePerSeat / 100).toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">per seat</p>
          </div>
        </div>

        {/* Route Details */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="flex flex-col items-center gap-1 mt-1">
              <div className="w-3 h-3 rounded-full border-2 border-primary bg-white"></div>
              <div className="w-0.5 h-10 bg-border/50"></div>
              <div className="w-3 h-3 rounded-full bg-primary"></div>
            </div>
            <div className="flex-1 space-y-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Pickup</p>
                <p className="font-semibold text-foreground">{ride.origin}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{format(new Date(ride.departureTime), "h:mm a, MMM d")}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Dropoff</p>
                <p className="font-semibold text-foreground">{ride.destination}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Driver Info */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 mb-6">
          <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Driver</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-lg font-bold text-muted-foreground">
              {ride.driver.fullName?.[0] || <UserIcon size={20} />}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">{ride.driver.fullName || "Driver"}</h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Shield size={12} className="text-primary" />
                <span>Verified Driver</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{ride.vehicle.model}</p>
              <p className="text-xs text-muted-foreground uppercase">{ride.vehicle.plateNumber}</p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        {!isDriver && ride.status === 'scheduled' && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-6 max-w-md mx-auto">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-3">
                 <span className="text-sm font-medium text-muted-foreground">Seats:</span>
                 <div className="flex items-center gap-3 bg-secondary rounded-lg px-2 py-1">
                   <button 
                     onClick={() => setSeats(Math.max(1, seats - 1))}
                     className="w-6 h-6 flex items-center justify-center rounded-md bg-white shadow-sm disabled:opacity-50"
                     disabled={seats <= 1}
                   >
                     -
                   </button>
                   <span className="font-semibold w-4 text-center">{seats}</span>
                   <button 
                     onClick={() => setSeats(Math.min(ride.availableSeats, seats + 1))}
                     className="w-6 h-6 flex items-center justify-center rounded-md bg-white shadow-sm disabled:opacity-50"
                     disabled={seats >= ride.availableSeats}
                   >
                     +
                   </button>
                 </div>
               </div>
               <div className="text-right">
                 <p className="text-xs text-muted-foreground">Total</p>
                 <p className="font-bold text-lg text-primary">${(totalPrice / 100).toFixed(2)}</p>
               </div>
            </div>
            
            <button
              onClick={() => setShowConfirm(true)}
              disabled={ride.availableSeats === 0}
              className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {ride.availableSeats === 0 ? "Ride Full" : "Book Ride"}
            </button>
          </div>
        )}
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Booking</DialogTitle>
            <DialogDescription>
              You are about to book {seats} seat(s) for a total of ${(totalPrice / 100).toFixed(2)}.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-secondary/50 p-4 rounded-xl space-y-2 text-sm my-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wallet Balance</span>
              <span className="font-medium">${(user?.walletBalance || 0) / 100}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Ride Cost</span>
              <span className="font-medium text-primary">-${(totalPrice / 100).toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setShowConfirm(false)}
              className="px-4 py-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBook}
              disabled={isBooking}
              className="px-6 py-2 bg-primary text-white rounded-lg font-semibold shadow-md hover:bg-primary/90 flex items-center gap-2"
            >
              {isBooking && <Loader2 className="animate-spin" size={16} />}
              Confirm Payment
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
