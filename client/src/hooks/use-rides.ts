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
import { FirebaseRide, CreateRideRequest } from "@/lib/types";

export function useRides(filters?: { origin?: string; destination?: string; date?: string }) {
  const queryKey = ["rides", filters];

  return useQuery({
    queryKey,
    queryFn: async () => {
      let q = query(collection(db, "rides"), orderBy("departureTime", "desc"));

      // Apply filters if provided
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
        const driverDoc = await getDoc(doc(db, "users", rideData.driverId));
        const vehicleDoc = await getDoc(doc(db, "vehicles", rideData.vehicleId));

        rides.push({
          id: docSnap.id,
          ...rideData,
          departureTime: rideData.departureTime.toDate(),
          createdAt: rideData.createdAt.toDate(),
          driver: driverDoc.exists() ? { uid: driverDoc.id, ...driverDoc.data() } : undefined,
          vehicle: vehicleDoc.exists() ? { id: vehicleDoc.id, ...vehicleDoc.data() } : undefined,
        } as FirebaseRide);
      }

      return rides;
    },
  });
}

export function useRide(id: string) {
  return useQuery({
    queryKey: ["ride", id],
    queryFn: async () => {
      const docRef = doc(db, "rides", id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Ride not found");
      }

      const rideData = docSnap.data();
      const driverDoc = await getDoc(doc(db, "users", rideData.driverId));
      const vehicleDoc = await getDoc(doc(db, "vehicles", rideData.vehicleId));

      return {
        id: docSnap.id,
        ...rideData,
        departureTime: rideData.departureTime.toDate(),
        createdAt: rideData.createdAt.toDate(),
        driver: driverDoc.exists() ? { uid: driverDoc.id, ...driverDoc.data() } : undefined,
        vehicle: vehicleDoc.exists() ? { id: vehicleDoc.id, ...vehicleDoc.data() } : undefined,
      } as FirebaseRide;
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
        departureTime: Timestamp.fromDate(data.departureTime),
        createdAt: Timestamp.fromDate(new Date()),
      };

      const docRef = await addDoc(collection(db, "rides"), rideData);
      return { id: docRef.id, ...data };
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
