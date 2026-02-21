import { useEffect, useState, useRef } from "react";
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
  
  // Cache to store passenger data and avoid refetching
  const passengerCacheRef = useRef<Record<string, FirebaseUser | null>>({});

  useEffect(() => {
    if (!db || !rideId) {
      setError("Firebase db not initialized or ride ID missing");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    passengerCacheRef.current = {}; // Reset cache when rideId changes

    try {
      const q = query(
        collection(db, "bookings"),
        where("rideId", "==", rideId),
        where("status", "==", "confirmed")
      );

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          // Process bookings synchronously first, then fetch missing passenger data
          const bookingsData: FirebaseBooking[] = [];
          const passengerIdsToFetch = new Set<string>();

          // First pass: build bookings list and identify missing passenger data
          for (const docSnap of querySnapshot.docs) {
            const bookingData = docSnap.data();
            const passengerId = bookingData.passengerId;
            
            // Check cache first
            let passenger: FirebaseUser | undefined;
            if (passengerId in passengerCacheRef.current) {
              passenger = passengerCacheRef.current[passengerId] || undefined;
            } else {
              // Mark for fetching
              passengerIdsToFetch.add(passengerId);
            }

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
          }

          // Update state immediately with cached data
          const sortedBookings = bookingsData.sort(
            (a, b) => a.bookingTime.getTime() - b.bookingTime.getTime()
          );
          setBookings(sortedBookings);
          setLoading(false);
          setError(null);

          // Fetch missing passenger data in parallel (non-blocking)
          if (passengerIdsToFetch.size > 0) {
            Promise.all(
              Array.from(passengerIdsToFetch).map(async (passengerId) => {
                try {
                  const passengerDoc = await getDoc(doc(db, "users", passengerId));
                  const passengerData = passengerDoc.exists()
                    ? ({
                        uid: passengerDoc.id,
                        ...passengerDoc.data(),
                        createdAt: passengerDoc.data().createdAt?.toDate(),
                      } as FirebaseUser)
                    : null;
                  
                  passengerCacheRef.current[passengerId] = passengerData;
                  return { passengerId, passenger: passengerData };
                } catch (err) {
                  console.error(`Error fetching passenger ${passengerId}:`, err);
                  passengerCacheRef.current[passengerId] = null;
                  return null;
                }
              })
            ).then((results) => {
              // Update bookings with fetched passenger data
              const passengerMap = new Map(
                results
                  .filter((r): r is { passengerId: string; passenger: FirebaseUser | null } => r !== null)
                  .map((r) => [r.passengerId, r.passenger])
              );

              if (passengerMap.size > 0) {
                setBookings((prevBookings) =>
                  prevBookings.map((booking) => ({
                    ...booking,
                    passenger: passengerMap.get(booking.passengerId) || booking.passenger,
                  }))
                );
              }
            });
          }
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
