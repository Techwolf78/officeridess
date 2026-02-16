import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseBooking, FirebaseUser } from "@/lib/types";

export function useRideBookingsRealtime(rideId: string) {
  const [bookings, setBookings] = useState<FirebaseBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !rideId) {
      setError("Firebase db not initialized or ride ID missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, "bookings"),
        where("rideId", "==", rideId),
        where("status", "==", "confirmed")
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        async (querySnapshot) => {
          const bookingsData: FirebaseBooking[] = [];

          for (const docSnap of querySnapshot.docs) {
            const bookingData = docSnap.data();

            try {
              // Fetch passenger user data
              const passengerDoc = await getDoc(doc(db, "users", bookingData.passengerId));
              const passenger = passengerDoc.exists()
                ? ({
                    uid: passengerDoc.id,
                    ...passengerDoc.data(),
                    createdAt: passengerDoc.data().createdAt?.toDate(),
                  } as FirebaseUser)
                : undefined;

              bookingsData.push({
                id: docSnap.id,
                rideId: bookingData.rideId,
                passengerId: bookingData.passengerId,
                seatsBooked: bookingData.seatsBooked,
                totalPrice: bookingData.totalPrice,
                status: bookingData.status,
                bookingTime: bookingData.bookingTime instanceof Timestamp ? bookingData.bookingTime.toDate() : new Date(bookingData.bookingTime),
                passenger,
              });
            } catch (err) {
              console.error("Error fetching passenger data:", err);
              // Still add the booking without passenger data
              bookingsData.push({
                id: docSnap.id,
                rideId: bookingData.rideId,
                passengerId: bookingData.passengerId,
                seatsBooked: bookingData.seatsBooked,
                totalPrice: bookingData.totalPrice,
                status: bookingData.status,
                bookingTime: bookingData.bookingTime instanceof Timestamp ? bookingData.bookingTime.toDate() : new Date(bookingData.bookingTime),
              });
            }
          }

          const sortedBookings = bookingsData.sort(
            (a, b) => a.bookingTime.getTime() - b.bookingTime.getTime()
          );

          setBookings(sortedBookings);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Error listening to ride bookings:", err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up ride bookings listener:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }, [rideId]);

  return { bookings, loading, error };
}
