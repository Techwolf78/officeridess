import { useEffect, useState } from "react";
import {
  doc,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseRide } from "@/lib/types";

export function useRideRealtime(rideId: string) {
  const [ride, setRide] = useState<FirebaseRide | null>(null);
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
      const rideRef = doc(db, "rides", rideId);
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(
        rideRef,
        (docSnap) => {
          if (!docSnap.exists()) {
            setRide(null);
            setError("Ride not found");
            setLoading(false);
            return;
          }

          const data = docSnap.data();
          const rideData: FirebaseRide = {
            id: docSnap.id,
            driverId: data.driverId,
            vehicleId: data.vehicleId,
            origin: data.origin,
            destination: data.destination,
            departureTime: data.departureTime instanceof Timestamp ? data.departureTime.toDate() : new Date(data.departureTime),
            totalSeats: data.totalSeats,
            availableSeats: data.availableSeats,
            pricePerSeat: data.pricePerSeat,
            status: data.status,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
            // Location fields
            originLatLng: data.originLatLng,
            destLatLng: data.destLatLng,
            route: data.route || [],
            routePolyline: data.routePolyline || "",
            routeSteps: data.routeSteps || [],
            routeRoads: data.routeRoads || [],
            stops: data.stops || [],
            distance: data.distance || 0,
            eta: data.eta || 0,
            originDisplayName: data.originDisplayName,
            destDisplayName: data.destDisplayName,
            // Populated fields
            driver: data.driver,
            vehicle: data.vehicle,
          };

          setRide(rideData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Error listening to ride:", err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up ride listener:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }, [rideId]);

  return { ride, loading, error };
}
