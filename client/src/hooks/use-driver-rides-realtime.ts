import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./use-auth";
import { FirebaseRide } from "@/lib/types";

export function useDriverRidesRealtime() {
  const { user } = useAuth();
  const [rides, setRides] = useState<FirebaseRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== "driver") {
      setRides([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Query only rides posted by this driver
      const q = query(
        collection(db, "rides"),
        where("driverId", "==", user.uid)
      );

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const fetchedRides = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            departureTime: doc.data().departureTime?.toDate?.() || new Date(doc.data().departureTime),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          })) as FirebaseRide[];

          setRides(fetchedRides);
          setLoading(false);
        },
        (err) => {
          console.error("Error fetching driver rides:", err);
          setError("Failed to load your rides");
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error setting up driver rides listener:", err);
      setError("Error loading rides");
      setLoading(false);
    }
  }, [user]);

  return { rides, loading, error };
}
