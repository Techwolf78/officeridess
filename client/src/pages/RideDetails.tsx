import { useParams, useLocation } from "wouter";
import { useRide } from "@/hooks/use-rides";
import { useAuth } from "@/hooks/use-auth";
import { useCreateBooking, useBookings, useRideBookings } from "@/hooks/use-bookings";
import { useChat } from "@/hooks/use-chat";
import { Layout } from "@/components/ui/Layout";
import { Loader2, ArrowLeft, Calendar, Clock, MapPin, Users, Shield, User as UserIcon, CheckCircle, X, MessageCircle, Phone } from "lucide-react";
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
  const { data: ride, isLoading } = useRide(id);
  const { user } = useAuth();
  const { mutate: bookRide, isPending: isBooking } = useCreateBooking();
  const { data: bookings } = useBookings();
  const { data: rideBookings, isLoading: isLoadingBookings } = useRideBookings(id!);
  const { chats, getOrCreateChat } = useChat();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [seats, setSeats] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);

  // Check if user already booked this ride
  const userBooking = bookings?.find(b => b.rideId === id && b.passengerId === user?.uid && b.status === 'confirmed');

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

  const isDriver = user?.uid === ride.driverId;

  const handleChat = async () => {
    if (!user?.uid || !ride.driverId) return;

    try {
      const chat = await getOrCreateChat.mutateAsync({
        rideId: ride.id,
        participants: [user.uid, ride.driverId]
      });
      setLocation(`/chat/${chat.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to open chat. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCall = (phoneNumber: string) => {
    window.open(`tel:${phoneNumber}`, '_self');
  };

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
    <div className="min-h-screen bg-background relative pb-36">
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
            <p className="text-2xl font-display font-bold text-primary">{ride.availableSeats} seats</p>
            <p className="text-xs text-muted-foreground">available</p>
          </div>
        </div>

        {/* Cancelled Ride Banner */}
        {ride.status === 'cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-red-900">Ride Cancelled</p>
                <p className="text-sm text-red-700">This ride has been cancelled by the driver. Contact the driver directly for refund arrangements.</p>
              </div>
            </div>
          </div>
        )}

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
                <p className="text-sm text-muted-foreground mt-0.5">{ride.departureTime && !isNaN(new Date(ride.departureTime).getTime()) ? format(new Date(ride.departureTime), "h:mm a, MMM d") : "Invalid time"}</p>
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
              {ride.driver?.firstName?.[0] || <UserIcon size={20} />}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-foreground">{ride.driver ? `${ride.driver.firstName} ${ride.driver.lastName || ''}`.trim() || "Driver" : "Driver"}</h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <Shield size={12} className="text-primary" />
                <span>Verified Driver</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{ride.vehicle?.model}</p>
              <p className="text-xs text-muted-foreground uppercase">{ride.vehicle?.plateNumber}</p>
            </div>
          </div>
          {!isDriver && (
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleChat}
                className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                disabled={getOrCreateChat.isPending}
              >
                <MessageCircle size={16} />
                Message Driver
              </button>
              {ride.driver?.phoneNumber && (
                <button
                  onClick={() => handleCall(ride.driver.phoneNumber!)}
                  className="flex items-center gap-2 px-3 py-2 bg-secondary text-foreground rounded-lg text-sm font-medium hover:bg-secondary/80 transition-colors"
                >
                  <Phone size={16} />
                  Call Driver
                </button>
              )}
            </div>
          )}
        </div>

        {/* Passengers List */}
        {user && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-border/50 mb-6">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">Passengers</h3>
            {isLoadingBookings ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-secondary rounded-full animate-pulse"></div>
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-secondary rounded animate-pulse w-24"></div>
                      <div className="h-3 bg-secondary rounded animate-pulse w-32"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : rideBookings && rideBookings.length > 0 ? (
              <div className="max-h-64 overflow-y-auto">
                <div className="space-y-4">
                  {rideBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {booking.passenger?.firstName?.[0] || <UserIcon size={16} />}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">
                          {booking.passenger ? `${booking.passenger.firstName} ${booking.passenger.lastName || ''}`.trim() || "Passenger" : "Passenger"}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{booking.seatsBooked} seat{booking.seatsBooked > 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>Booked {booking.bookingTime && !isNaN(new Date(booking.bookingTime).getTime()) ? format(new Date(booking.bookingTime), "MMM d, h:mm a") : "Invalid time"}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-primary">₹{booking.totalPrice}</p>
                        <p className="text-xs text-muted-foreground">{booking.passenger?.phoneNumber}</p>
                        {isDriver && booking.passenger?.phoneNumber && (
                          <div className="flex gap-1 mt-2">
                            <button
                              onClick={() => handleCall(booking.passenger!.phoneNumber!)}
                              className="p-1.5 bg-green-100 hover:bg-green-200 rounded transition-colors"
                              title="Call passenger"
                            >
                              <Phone size={12} className="text-green-600" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!user?.uid || !booking.passengerId) return;
                                try {
                                  const chat = await getOrCreateChat.mutateAsync({
                                    rideId: ride.id,
                                    participants: [user.uid, booking.passengerId]
                                  });
                                  setLocation(`/chat/${chat.id}`);
                                } catch (error) {
                                  toast({
                                    title: "Error",
                                    description: "Failed to open chat. Please try again.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              className="p-1.5 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                              title="Message passenger"
                              disabled={getOrCreateChat.isPending}
                            >
                              <MessageCircle size={12} className="text-blue-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No passengers yet</p>
                <p className="text-xs text-muted-foreground/70">Passengers will appear here once they book seats</p>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {!isDriver && ride.status === 'scheduled' && (
          <>
            {userBooking ? (
              // User already booked this ride - fixed at bottom with backdrop
              <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-border/20 p-4 max-w-md mx-auto z-10 shadow-2xl rounded-t-[2.5rem]">
                <div className="text-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <p className="font-semibold text-green-700 text-sm mb-1">Booking Confirmed!</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    You have {userBooking.seatsBooked} seat{userBooking.seatsBooked > 1 ? 's' : ''} booked for this ride
                  </p>
                  <button
                    onClick={() => setLocation("/rides")}
                    className="w-full py-2.5 bg-primary text-white rounded-3xl font-semibold text-sm shadow-lg hover:bg-primary/90 transition-all active:scale-95"
                  >
                    View My Bookings
                  </button>
                </div>
              </div>
            ) : (
              // Booking interface for available ride - fixed at bottom
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
                </div>

                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={ride.availableSeats === 0}
                  className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {ride.availableSeats === 0 ? "Ride Full" : "Book Seats"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Your Booking</DialogTitle>
            <div className="space-y-3">
              <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Route:</span>
                  <span className="font-medium">{ride.origin} → {ride.destination}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Date & Time:</span>
                  <span className="font-medium">{ride.departureTime && !isNaN(new Date(ride.departureTime).getTime()) ? format(new Date(ride.departureTime), "MMM d, h:mm a") : "Invalid time"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Driver:</span>
                  <span className="font-medium">{ride.driver?.firstName} {ride.driver?.lastName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Price per seat:</span>
                  <span className="font-medium">₹{ride.pricePerSeat}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t pt-2">
                  <span>Seats booking:</span>
                  <span>{seats} seat{seats > 1 ? 's' : ''}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-primary">
                  <span>Total cost:</span>
                  <span>₹{ride.pricePerSeat * seats}</span>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground">
                💰 Payment will be handled directly with the driver in cash.<br/>
                📍 Meet at the designated pickup point 5-10 minutes before departure.<br/>
                📱 Keep this booking confirmation for reference.
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="flex gap-3">
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-4 py-2 text-muted-foreground hover:bg-secondary rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBook}
              disabled={isBooking}
              className="flex-1 px-6 py-2 bg-primary text-white rounded-lg font-semibold shadow-md hover:bg-primary/90 flex items-center justify-center gap-2"
            >
              {isBooking && <Loader2 className="animate-spin" size={16} />}
              Confirm Booking
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
