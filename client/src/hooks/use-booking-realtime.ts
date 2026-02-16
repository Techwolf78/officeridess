import { useEffect, useState } from "react";
import { doc, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseBooking } from "@/lib/types";

/**
 * Real-time listener for a single booking
 * Uses onSnapshot() for instant updates when booking status changes in Firestore
 */
export function useBookingRealtime(bookingId: string) {
  const [booking, setBooking] = useState<FirebaseBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Set up real-time listener for this specific booking
    const unsubscribe = onSnapshot(
      doc(db, "bookings", bookingId),
      (docSnap) => {
        if (!docSnap.exists()) {
          setError("Booking not found");
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        const bookingData: FirebaseBooking = {
          id: docSnap.id,
          rideId: data.rideId,
          passengerId: data.passengerId,
          seatsBooked: data.seatsBooked,
          totalPrice: data.totalPrice,
          status: data.status,
          bookingTime: data.bookingTime instanceof Timestamp ? data.bookingTime.toDate() : new Date(data.bookingTime),
          cancelledAt: data.cancelledAt instanceof Timestamp ? data.cancelledAt.toDate() : undefined,
          cancelReason: data.cancelReason,
          timeBeforeDeparture: data.timeBeforeDeparture,
          // Ride and driver data would be populated from separate collections
          ride: data.ride,
          passenger: data.passenger,
          // Lifecycle tracking fields
          activatedAt: data.activatedAt instanceof Timestamp ? data.activatedAt.toDate() : undefined,
          startedAt: data.startedAt instanceof Timestamp ? data.startedAt.toDate() : undefined,
          completedAt: data.completedAt instanceof Timestamp ? data.completedAt.toDate() : undefined,
          confirmedAt: data.confirmedAt instanceof Timestamp ? data.confirmedAt.toDate() : undefined,
          driverRatingId: data.driverRatingId,
          passengerRatingId: data.passengerRatingId,
          passengerRating: data.passengerRating,
          driverRating: data.driverRating,
          cancelledBy: data.cancelledBy,
        };

        setBooking(bookingData);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to booking:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [bookingId]);

  return { booking, loading, error };
}
