import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseRide } from "@/lib/types";

export function useRidesRealtime(filters?: { driverId?: string; includeCancelled?: boolean }) {
  const [rides, setRides] = useState<FirebaseRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setError("Firebase db not initialized");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const constraints = [];

      // Exclude cancelled rides by default unless includeCancelled is true
      if (!filters?.includeCancelled) {
        constraints.push(where("status", "!=", "cancelled"));
      }

      // Filter by driverId if provided
      if (filters?.driverId) {
        constraints.push(where("driverId", "==", filters.driverId));
      }

      constraints.push(orderBy("departureTime", "desc"));

      const q = query(collection(db, "rides"), ...constraints);

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const ridesData: FirebaseRide[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            ridesData.push({
              id: doc.id,
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
            });
          });

          setRides(ridesData);
          setLoading(false);
        },
        (err) => {
          console.error("Error listening to rides:", err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Error setting up rides listener:", err);
      setError(err.message);
      setLoading(false);
    }
  }, [filters?.driverId, filters?.includeCancelled]);

  return { rides, loading, error };
}