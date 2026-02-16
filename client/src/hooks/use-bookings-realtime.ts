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
import { useAuth } from "@/hooks/use-auth";
import { FirebaseBooking, FirebaseUser, FirebaseVehicle } from "@/lib/types";

export function useBookingsRealtime() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<FirebaseBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        async (querySnapshot) => {
          const bookingsData: FirebaseBooking[] = [];

          for (const docSnap of querySnapshot.docs) {
            const bookingData = docSnap.data();

            try {
              // Fetch ride data
              const rideDoc = await getDoc(doc(db, "rides", bookingData.rideId));

              // Fetch driver data if ride exists
              let driver = undefined;
              if (rideDoc.exists()) {
                try {
                  const driverDoc = await getDoc(doc(db, "users", rideDoc.data().driverId));
                  driver = driverDoc.exists()
                    ? {
                        uid: driverDoc.id,
                        ...driverDoc.data(),
                        createdAt: driverDoc.data().createdAt?.toDate() || new Date(),
                      } as FirebaseUser
                    : undefined;
                } catch (err) {
                  console.warn("Failed to fetch driver data:", err);
                }
              }

              // Fetch vehicle data if ride exists
              let vehicle = undefined;
              if (rideDoc.exists()) {
                try {
                  const vehicleDoc = await getDoc(doc(db, "vehicles", rideDoc.data().vehicleId));
                  vehicle = vehicleDoc.exists()
                    ? {
                        id: vehicleDoc.id,
                        ...vehicleDoc.data(),
                      } as FirebaseVehicle
                    : undefined;
                } catch (err) {
                  console.warn("Failed to fetch vehicle data:", err);
                }
              }

              const ride = rideDoc.exists()
                ? {
                    id: rideDoc.id,
                    driverId: rideDoc.data().driverId,
                    vehicleId: rideDoc.data().vehicleId,
                    origin: rideDoc.data().origin,
                    destination: rideDoc.data().destination,
                    originLatLng: rideDoc.data().originLatLng,
                    destLatLng: rideDoc.data().destLatLng,
                    departureTime: rideDoc.data().departureTime instanceof Timestamp ? rideDoc.data().departureTime.toDate() : new Date(rideDoc.data().departureTime),
                    totalSeats: rideDoc.data().totalSeats,
                    availableSeats: rideDoc.data().availableSeats,
                    pricePerSeat: rideDoc.data().pricePerSeat,
                    status: rideDoc.data().status,
                    createdAt: rideDoc.data().createdAt instanceof Timestamp ? rideDoc.data().createdAt.toDate() : new Date(rideDoc.data().createdAt),
                    route: rideDoc.data().route || [],
                    routePolyline: rideDoc.data().routePolyline || "",
                    routeSteps: rideDoc.data().routeSteps || [],
                    routeRoads: rideDoc.data().routeRoads || [],
                    stops: rideDoc.data().stops || [],
                    distance: rideDoc.data().distance || 0,
                    eta: rideDoc.data().eta || 0,
                    originDisplayName: rideDoc.data().originDisplayName,
                    destDisplayName: rideDoc.data().destDisplayName,
                    driver,
                    vehicle,
                  }
                : undefined;

              bookingsData.push({
                id: docSnap.id,
                rideId: bookingData.rideId,
                passengerId: bookingData.passengerId,
                seatsBooked: bookingData.seatsBooked,
                totalPrice: bookingData.totalPrice,
                status: bookingData.status,
                bookingTime: bookingData.bookingTime instanceof Timestamp ? bookingData.bookingTime.toDate() : new Date(bookingData.bookingTime),
                cancelledAt: bookingData.cancelledAt instanceof Timestamp ? bookingData.cancelledAt.toDate() : undefined,
                cancelReason: bookingData.cancelReason,
                timeBeforeDeparture: bookingData.timeBeforeDeparture,
                ride,
              });
            } catch (err) {
              console.error("Error processing booking:", err);
              // Still add the booking with minimal data
              bookingsData.push({
                id: docSnap.id,
                rideId: bookingData.rideId,
                passengerId: bookingData.passengerId,
                seatsBooked: bookingData.seatsBooked,
                totalPrice: bookingData.totalPrice,
                status: bookingData.status,
                bookingTime: bookingData.bookingTime instanceof Timestamp ? bookingData.bookingTime.toDate() : new Date(bookingData.bookingTime),
                cancelledAt: bookingData.cancelledAt instanceof Timestamp ? bookingData.cancelledAt.toDate() : undefined,
                cancelReason: bookingData.cancelReason,
                timeBeforeDeparture: bookingData.timeBeforeDeparture,
              });
            }
          }

          setBookings(bookingsData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Error listening to bookings:", err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up bookings listener:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }, [user]);

  return { bookings, loading, error };
}
