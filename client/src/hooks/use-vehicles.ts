import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseVehicle, CreateVehicleRequest } from "@/lib/types";

export function useVehicles() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["vehicles", user?.uid],
    queryFn: async () => {
      if (!user) return [];

      const q = query(collection(db, "vehicles"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const vehicles: FirebaseVehicle[] = [];
      querySnapshot.forEach((doc) => {
        vehicles.push({ id: doc.id, ...doc.data() } as FirebaseVehicle);
      });

      return vehicles;
    },
    enabled: !!user,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateVehicleRequest) => {
      if (!user) throw new Error("Not authenticated");

      const vehicleData = {
        ...data,
        userId: user.uid,
      };

      const docRef = await addDoc(collection(db, "vehicles"), vehicleData);
      return { id: docRef.id, ...vehicleData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}
