import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseRide, CreateRideRequest } from "@/lib/types";
import { haversineDistance, isPointNearPolyline } from "@/lib/utils";

export function useRides(filters?: { origin?: string; destination?: string; date?: string; includeCancelled?: boolean; driverId?: string; originLatLng?: {lat: number, lng: number}; destLatLng?: {lat: number, lng: number}; pickupLatLng?: {lat: number, lng: number} }) {
  const queryKey = ["rides", filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!db) {
        throw new Error("Firebase db not initialized");
      }
      
      try {
        let q = query(collection(db, "rides"), orderBy("departureTime", "desc"));

        // Exclude cancelled rides by default unless includeCancelled is true
        if (!filters?.includeCancelled) {
          q = query(q, where("status", "!=", "cancelled"));
        }

        // Filter by driverId if provided
        if (filters?.driverId) {
          q = query(q, where("driverId", "==", filters.driverId));
        }

        // Apply other filters if provided
        if (filters?.origin) {
          q = query(q, where("origin", "==", filters.origin));
        }
        if (filters?.destination) {
          q = query(q, where("destination", "==", filters.destination));
        }
        if (filters?.date) {
          // For date filtering, we might need to handle date ranges
          const filterDate = new Date(filters.date);
          const startOfDay = new Date(filterDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(filterDate);
          endOfDay.setHours(23, 59, 59, 999);

          q = query(q, where("departureTime", ">=", Timestamp.fromDate(startOfDay)));
          q = query(q, where("departureTime", "<=", Timestamp.fromDate(endOfDay)));
        }

        const querySnapshot = await getDocs(q);
        const rides: FirebaseRide[] = [];

        for (const docSnap of querySnapshot.docs) {
          const rideData = docSnap.data();
          
          // Try to fetch driver and vehicle data, but don't fail if they don't exist
          let driver, vehicle;
          try {
            const driverDoc = await getDoc(doc(db, "users", rideData.driverId));
            driver = driverDoc.exists() ? { uid: driverDoc.id, ...driverDoc.data() } : undefined;
          } catch (error) {
            console.warn('Failed to fetch driver data:', error);
            driver = undefined;
          }
          
          try {
            const vehicleDoc = await getDoc(doc(db, "vehicles", rideData.vehicleId));
            vehicle = vehicleDoc.exists() ? { id: vehicleDoc.id, ...vehicleDoc.data() } : undefined;
          } catch (error) {
            console.warn('Failed to fetch vehicle data:', error);
            vehicle = undefined;
          }

          rides.push({
            id: docSnap.id,
            ...rideData,
            departureTime: rideData.departureTime.toDate(),
            createdAt: rideData.createdAt.toDate(),
            driver,
            vehicle,
          } as FirebaseRide);
        }

        // Filter by proximity if lat/lng provided
        let filteredRides = rides;
        if (filters?.originLatLng && filters?.destLatLng && filters?.pickupLatLng) {
          filteredRides = rides.filter(ride => {
            if (!ride.originLatLng || !ride.destLatLng || !ride.route) return false;
            const originDist = haversineDistance(ride.originLatLng.lat, ride.originLatLng.lng, filters.originLatLng.lat, filters.originLatLng.lng);
            const destDist = haversineDistance(ride.destLatLng.lat, ride.destLatLng.lng, filters.destLatLng.lat, filters.destLatLng.lng);
            const pickupNear = isPointNearPolyline(filters.pickupLatLng, ride.route, 300);
            return originDist <= 5 && destDist <= 5 && pickupNear; // 5km for origin/dest, 300m for pickup
          });
        }

        return filteredRides;
      } catch (error) {
        console.warn('Failed to fetch rides from Firestore:', error);
        // Return empty array if Firestore fails
        return [];
      }
    },
  });
}

export function useRide(id: string) {
  return useQuery({
    queryKey: ["ride", id],
    queryFn: async () => {
      try {
        const docRef = doc(db, "rides", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          throw new Error("Ride not found");
        }

        const rideData = docSnap.data();
        
        // Try to fetch driver and vehicle data, but don't fail if they don't exist
        let driver, vehicle;
        try {
          const driverDoc = await getDoc(doc(db, "users", rideData.driverId));
          driver = driverDoc.exists() ? { uid: driverDoc.id, ...driverDoc.data() } : undefined;
        } catch (error) {
          console.warn('Failed to fetch driver data:', error);
          driver = undefined;
        }
        
        try {
          const vehicleDoc = await getDoc(doc(db, "vehicles", rideData.vehicleId));
          vehicle = vehicleDoc.exists() ? { id: vehicleDoc.id, ...vehicleDoc.data() } : undefined;
        } catch (error) {
          console.warn('Failed to fetch vehicle data:', error);
          vehicle = undefined;
        }

        return {
          id: docSnap.id,
          ...rideData,
          departureTime: rideData.departureTime.toDate(),
          createdAt: rideData.createdAt.toDate(),
          driver,
          vehicle,
        } as FirebaseRide;
      } catch (error) {
        console.warn('Failed to fetch ride from Firestore:', error);
        throw error; // Re-throw for individual ride queries
      }
    },
    enabled: !!id,
  });
}

export function useCreateRide() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateRideRequest) => {
      const rideData = {
        ...data,
        availableSeats: data.totalSeats, // Initialize available seats to total seats
        departureTime: Timestamp.fromDate(data.departureTime),
        createdAt: Timestamp.fromDate(new Date()),
      };

      try {
        const docRef = await addDoc(collection(db, "rides"), rideData);
        return { id: docRef.id, ...data };
      } catch (error) {
        console.warn('Failed to create ride in Firestore:', error);
        // Generate a local ID if Firestore fails
        const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return { id: localId, ...data, availableSeats: data.totalSeats };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rides"] });
    },
  });
}

export function useUpdateRideStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: FirebaseRide["status"] }) => {
      const docRef = doc(db, "rides", id);
      await updateDoc(docRef, { status });
      return { id, status };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["ride"] });
    },
  });
}

export function useCancelRide() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (rideId: string) => {
      if (!user) throw new Error("Not authenticated");

      // Get ride document to verify ownership
      const rideRef = doc(db, "rides", rideId);
      const rideSnap = await getDoc(rideRef);

      if (!rideSnap.exists()) {
        throw new Error("Ride not found");
      }

      const rideData = rideSnap.data();

      // Check if user is the driver
      if (rideData.driverId !== user.uid) {
        throw new Error("You can only cancel your own rides");
      }

      // Check if ride can be cancelled (only scheduled rides)
      if (rideData.status !== "scheduled") {
        throw new Error("This ride cannot be cancelled");
      }

      // Cancel all active bookings for this ride
      const bookingsQuery = query(
        collection(db, "bookings"),
        where("rideId", "==", rideId),
        where("status", "in", ["confirmed"])
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const cancelPromises = bookingsSnapshot.docs.map(async (bookingDoc) => {
        const bookingData = bookingDoc.data();
        await updateDoc(doc(db, "bookings", bookingDoc.id), { status: "cancelled" });
        // Return seats back to ride (though ride will be cancelled)
        await updateDoc(rideRef, {
          availableSeats: rideData.availableSeats + bookingData.seatsBooked,
        });
      });

      // Wait for all booking cancellations to complete
      await Promise.all(cancelPromises);

      // Cancel the ride
      await updateDoc(rideRef, { status: "cancelled" });

      return { rideId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["ride"] });
    },
  });
}
