import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseBooking, FirebaseUser, FirebaseVehicle } from "@/lib/types";

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

  // Calculate initial cache string for reference
  const initialCache = typeof window !== "undefined" && user?.uid
    ? localStorage.getItem(`bookings_cache_${user.uid}`) || ""
    : "";
  const lastUpdateRef = useRef<string>(initialCache);

  useEffect(() => {
    if (!db || !user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const fetchBookings = async () => {
      try {
        const q = query(collection(db, "bookings"), where("passengerId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
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
                    preferences: rideDoc.data().preferences,
                    vehicleComfort: rideDoc.data().vehicleComfort || 'basic',
                    instantBooking: rideDoc.data().instantBooking || false,
                    returnTrip: rideDoc.data().returnTrip ? {
                      ...rideDoc.data().returnTrip,
                      date: rideDoc.data().returnTrip.date instanceof Timestamp ? rideDoc.data().returnTrip.date.toDate() : new Date(rideDoc.data().returnTrip.date)
                    } : undefined,
                    driverRating: rideDoc.data().driverRating,
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
              activatedAt: bookingData.activatedAt instanceof Timestamp ? bookingData.activatedAt.toDate() : undefined,
              startedAt: bookingData.startedAt instanceof Timestamp ? bookingData.startedAt.toDate() : undefined,
              completedAt: bookingData.completedAt instanceof Timestamp ? bookingData.completedAt.toDate() : undefined,
              confirmedAt: bookingData.confirmedAt instanceof Timestamp ? bookingData.confirmedAt.toDate() : undefined,
              timeBeforeDeparture: bookingData.timeBeforeDeparture,
              passengerRating: bookingData.passengerRating,
              driverRating: bookingData.driverRating,
              ride,
            });
          } catch (err) {
            console.error("Error processing booking:", err);
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
              activatedAt: bookingData.activatedAt instanceof Timestamp ? bookingData.activatedAt.toDate() : undefined,
              startedAt: bookingData.startedAt instanceof Timestamp ? bookingData.startedAt.toDate() : undefined,
              completedAt: bookingData.completedAt instanceof Timestamp ? bookingData.completedAt.toDate() : undefined,
              confirmedAt: bookingData.confirmedAt instanceof Timestamp ? bookingData.confirmedAt.toDate() : undefined,
              timeBeforeDeparture: bookingData.timeBeforeDeparture,
              passengerRating: bookingData.passengerRating,
              driverRating: bookingData.driverRating,
            });
          }
        }

        // Check if data actually changed
        const currentString = JSON.stringify(bookingsData);
        if (currentString !== lastUpdateRef.current) {
          lastUpdateRef.current = currentString;
          setBookings(bookingsData);
          // Save to cache
          if (typeof window !== "undefined" && user?.uid) {
            const cacheKey = `bookings_cache_${user.uid}`;
            localStorage.setItem(cacheKey, currentString);
          }
        }
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching bookings:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    // First fetch immediately
    fetchBookings();

    // Set up polling interval every 5 seconds as requested
    const intervalId = setInterval(fetchBookings, 5000);

    return () => clearInterval(intervalId);
  }, [user]);

  return { bookings, loading, error };
}
