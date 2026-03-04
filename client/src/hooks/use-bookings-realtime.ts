import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  doc,
  writeBatch,
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseBooking } from "@/lib/types";

export function useBookingsRealtime() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<FirebaseBooking[]>(() => {
    // Try to load from localStorage for instant render
    if (typeof window !== "undefined" && user?.uid) {
      const cacheKey = `bookings_cache_${user.uid}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Convert string dates back to Date objects
          return parsed.map((booking: any) => ({
            ...booking,
            bookingTime: new Date(booking.bookingTime),
            cancelledAt: booking.cancelledAt ? new Date(booking.cancelledAt) : undefined,
            activatedAt: booking.activatedAt ? new Date(booking.activatedAt) : undefined,
            startedAt: booking.startedAt ? new Date(booking.startedAt) : undefined,
            completedAt: booking.completedAt ? new Date(booking.completedAt) : undefined,
            confirmedAt: booking.confirmedAt ? new Date(booking.confirmedAt) : undefined,
            ride: booking.ride ? {
              ...booking.ride,
              departureTime: new Date(booking.ride.departureTime),
              createdAt: new Date(booking.ride.createdAt),
              returnTrip: booking.ride.returnTrip ? {
                ...booking.ride.returnTrip,
                date: new Date(booking.ride.returnTrip.date)
              } : undefined,
              driver: booking.ride.driver ? {
                ...booking.ride.driver,
                createdAt: new Date(booking.ride.driver.createdAt)
              } : undefined
            } : undefined
          }));
        } catch (e) {
          console.error("Error parsing bookings cache:", e);
        }
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined" && user?.uid) {
      const cacheKey = `bookings_cache_${user.uid}`;
      return !localStorage.getItem(cacheKey);
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);

  const lastUpdateRef = useRef<string>("");

  useEffect(() => {
    if (!db || !user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, "bookings"), where("passengerId", "==", user.uid));
      
      const unsubscribe = onSnapshot(
        q,
        async (querySnapshot) => {
          const bookingsData: FirebaseBooking[] = [];
          
          // Use a batch of promises to fetch ride data for all bookings
          const bookingPromises = querySnapshot.docs.map(async (docSnap) => {
            const bookingData = docSnap.data();
            let ride = bookingData.ride;
            
            // If ride data is missing, fetch it
            if (!ride && bookingData.rideId) {
              try {
                const rideDoc = await getDoc(doc(db, "rides", bookingData.rideId));
                if (rideDoc.exists()) {
                  const rData = rideDoc.data();
                  ride = {
                    id: rideDoc.id,
                    ...rData,
                    departureTime: rData.departureTime instanceof Timestamp ? rData.departureTime.toDate() : new Date(rData.departureTime),
                    createdAt: rData.createdAt instanceof Timestamp ? rData.createdAt.toDate() : new Date(rData.createdAt),
                  };
                }
              } catch (err) {
                console.error("Error fetching ride for booking:", docSnap.id, err);
              }
            }

            return {
              id: docSnap.id,
              rideId: bookingData.rideId,
              passengerId: bookingData.passengerId,
              seatsBooked: bookingData.seatsBooked,
              totalPrice: bookingData.totalPrice,
              status: bookingData.status,
              bookingTime: bookingData.bookingTime instanceof Timestamp ? bookingData.bookingTime.toDate() : new Date(bookingData.bookingTime),
              cancelledAt: bookingData.cancelledAt instanceof Timestamp ? bookingData.cancelledAt.toDate() : undefined,
              cancelReason: bookingData.cancelReason,
              activatedAt: bookingData.activatedAt instanceof Timestamp ? bookingData.activatedAt.toDate() : undefined,
              startedAt: bookingData.startedAt instanceof Timestamp ? bookingData.startedAt.toDate() : undefined,
              completedAt: bookingData.completedAt instanceof Timestamp ? bookingData.completedAt.toDate() : undefined,
              confirmedAt: bookingData.confirmedAt instanceof Timestamp ? bookingData.confirmedAt.toDate() : undefined,
              timeBeforeDeparture: bookingData.timeBeforeDeparture,
              passengerRating: bookingData.passengerRating,
              driverRating: bookingData.driverRating,
              ride,
            };
          });

          const resolvedBookings = await Promise.all(bookingPromises);

          const currentString = JSON.stringify(resolvedBookings);
          if (currentString !== lastUpdateRef.current) {
            lastUpdateRef.current = currentString;
            setBookings(resolvedBookings);
            if (typeof window !== "undefined" && user?.uid) {
              const cacheKey = `bookings_cache_${user.uid}`;
              localStorage.setItem(cacheKey, currentString);
            }
          }
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Error listening to bookings:", err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up bookings listener:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [user]);

  return { bookings, loading, error };
}
