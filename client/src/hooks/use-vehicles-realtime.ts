import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseVehicle } from "@/lib/types";

export function useVehiclesRealtime() {
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<FirebaseVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db || !user) {
      setVehicles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const q = query(collection(db, "vehicles"), where("userId", "==", user.uid));

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const vehiclesData: FirebaseVehicle[] = [];
          querySnapshot.forEach((doc) => {
            vehiclesData.push({ id: doc.id, ...doc.data() } as FirebaseVehicle);
          });

          setVehicles(vehiclesData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Error listening to vehicles:", err);
          setError(err.message);
          setLoading(false);
        }
      );

      // Cleanup subscription on unmount
      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up vehicles listener:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }, [user]);

  return { vehicles, loading, error };
}
