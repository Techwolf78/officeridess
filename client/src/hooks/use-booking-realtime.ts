import { useEffect, useState, useRef } from "react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  Timestamp, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseBooking, FirebaseRide } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";

/**
 * Real-time listener for a single booking
 * Uses onSnapshot() for instant updates when booking status changes in Firestore
 * Also fetches the full ride document to ensure distance and eta are available
 */
export function useBookingRealtime(bookingId: string) {
  const [booking, setBooking] = useState<FirebaseBooking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
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
        if (!isMountedRef.current) return;

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
            if (!isMountedRef.current) return;

            if (rideDoc.exists()) {
              const rideData = rideDoc.data();
              
              // Fetch driver data if not in ride document
              let driverData: any = rideData.driver;
              if (!driverData && rideData.driverId) {
                try {
                  const driverDoc = await getDoc(doc(db, "users", rideData.driverId));
                  if (!isMountedRef.current) return;
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
                  if (!isMountedRef.current) return;
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
                route: rideData.route || [],
                routePolyline: rideData.routePolyline || "",
                routeSteps: rideData.routeSteps || [],
                routeRoads: rideData.routeRoads || [],
                stops: rideData.stops || [],
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
            if (!isMountedRef.current) return;
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
          const enrichedRide = data.ride ? {
            ...data.ride,
            route: data.ride.route || [],
            routePolyline: data.ride.routePolyline || "",
            routeSteps: data.ride.routeSteps || [],
            routeRoads: data.ride.routeRoads || [],
            stops: data.ride.stops || [],
            distance: data.ride.distance || 0,
            eta: data.ride.eta || 0,
          } : undefined;

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
        if (isMountedRef.current) {
          setError(err.message);
          setLoading(false);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      isMountedRef.current = false;
      unsubscribe();
    };
  }, [bookingId]);

  return { booking, loading, error };
}

/**
 * Real-time listener for all bookings for the current passenger
 * Includes ride hydration and local storage caching
 */
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
