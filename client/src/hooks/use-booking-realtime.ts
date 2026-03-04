import { useEffect, useState, useRef } from "react";
import { doc, onSnapshot, Timestamp, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseBooking, FirebaseRide } from "@/lib/types";

/**
 * Real-time listener for a single booking
 * Uses onSnapshot() for instant updates when booking status changes in Firestore
 * Also fetches the full ride document to ensure distance and eta are available
 */
export function useBookingRealtime(bookingId: string) {
  const [booking, setBooking] = useState<FirebaseBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const rideUnsubscribeRef = useRef<(() => void) | null>(null);

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
      async (docSnap) => {
        if (!docSnap.exists()) {
          setError("Booking not found");
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        const rideId = data.rideId;

        // Fetch the full ride document to ensure all fields are available
        if (rideId && (!data.ride || !data.ride.distance)) {
          try {
            const rideDoc = await getDoc(doc(db, "rides", rideId));
            if (rideDoc.exists()) {
              const rideData = rideDoc.data();
              
              // Fetch driver data if not in ride document
              let driverData: any = rideData.driver;
              if (!driverData && rideData.driverId) {
                try {
                  const driverDoc = await getDoc(doc(db, "users", rideData.driverId));
                  if (driverDoc.exists()) {
                    driverData = {
                      uid: driverDoc.id,
                      ...driverDoc.data(),
                      createdAt: driverDoc.data().createdAt instanceof Timestamp ? driverDoc.data().createdAt.toDate() : new Date(driverDoc.data().createdAt),
                    };
                  }
                } catch (err) {
                  console.error("Error fetching driver data:", err);
                }
              }

              // Fetch passenger data if not in booking
              let passengerData: any = data.passenger;
              if (!passengerData && data.passengerId) {
                try {
                  const passengerDoc = await getDoc(doc(db, "users", data.passengerId));
                  if (passengerDoc.exists()) {
                    passengerData = {
                      uid: passengerDoc.id,
                      ...passengerDoc.data(),
                      createdAt: passengerDoc.data().createdAt instanceof Timestamp ? passengerDoc.data().createdAt.toDate() : new Date(passengerDoc.data().createdAt),
                    };
                  }
                } catch (err) {
                  console.error("Error fetching passenger data:", err);
                }
              }
              
              const enrichedRide: FirebaseRide = {
                id: rideDoc.id,
                driverId: rideData.driverId,
                vehicleId: rideData.vehicleId,
                origin: rideData.origin,
                destination: rideData.destination,
                departureTime: rideData.departureTime instanceof Timestamp ? rideData.departureTime.toDate() : new Date(rideData.departureTime),
                totalSeats: rideData.totalSeats,
                availableSeats: rideData.availableSeats,
                pricePerSeat: rideData.pricePerSeat,
                status: rideData.status,
                createdAt: rideData.createdAt instanceof Timestamp ? rideData.createdAt.toDate() : new Date(rideData.createdAt),
                originLatLng: rideData.originLatLng,
                destLatLng: rideData.destLatLng,
                route: rideData.route,
                routePolyline: rideData.routePolyline,
                routeSteps: rideData.routeSteps,
                routeRoads: rideData.routeRoads,
                stops: rideData.stops,
                distance: rideData.distance || 0,
                eta: rideData.eta || 0,
                originDisplayName: rideData.originDisplayName,
                destDisplayName: rideData.destDisplayName,
                preferences: rideData.preferences,
                vehicleComfort: rideData.vehicleComfort,
                instantBooking: rideData.instantBooking,
                returnTrip: rideData.returnTrip ? {
                  date: rideData.returnTrip.date instanceof Timestamp ? rideData.returnTrip.date.toDate() : new Date(rideData.returnTrip.date),
                  time: rideData.returnTrip.time,
                } : undefined,
                driverRating: rideData.driverRating,
                driver: driverData,
              };

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
                ride: enrichedRide,
                passenger: passengerData,
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
            }
          } catch (err: any) {
            console.error("Error fetching ride document:", err);
            // Fall back to whatever ride data is in the booking
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
              ride: data.ride,
              passenger: data.passenger,
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
          }
        } else {
          // Booking already has ride data
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
            ride: data.ride,
            passenger: data.passenger,
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
        }
      },
      (err) => {
        console.error("Error listening to booking:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      if (rideUnsubscribeRef.current) {
        rideUnsubscribeRef.current();
      }
    };
  }, [bookingId]);

  return { booking, loading, error };
}
