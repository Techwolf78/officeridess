import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseRide } from "@/lib/types";

export function useRidesRealtime(filters?: {
  driverId?: string;
  includeCancelled?: boolean;
  minPrice?: number;
  maxPrice?: number;
  minSeats?: number;
  dateRange?: { start: Date; end: Date };
  // New advanced filters
  verifiedDriversOnly?: boolean;
  vehicleComfort?: 'basic' | 'comfort' | 'premium';
  minRating?: number;
  instantBookingOnly?: boolean;
  preferences?: {
    smoking?: boolean;
    pets?: boolean;
    music?: boolean;
    ac?: boolean;
  };
  sortBy?: 'price_asc' | 'price_desc' | 'departure_asc' | 'departure_desc' | 'rating_desc' | 'duration_asc';
}) {
  const [rides, setRides] = useState<FirebaseRide[]>(() => {
    // Try to load from localStorage for instant render
    if (typeof window !== "undefined") {
      const cacheKey = `rides_cache_${filters?.driverId || 'all'}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Convert string dates back to Date objects
          return parsed.map((ride: any) => ({
            ...ride,
            departureTime: new Date(ride.departureTime),
            createdAt: new Date(ride.createdAt),
            returnTrip: ride.returnTrip ? {
              ...ride.returnTrip,
              date: new Date(ride.returnTrip.date)
            } : undefined
          }));
        } catch (e) {
          console.error("Error parsing rides cache:", e);
        }
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(() => {
    if (typeof window !== "undefined") {
      const cacheKey = `rides_cache_${filters?.driverId || 'all'}`;
      return !localStorage.getItem(cacheKey);
    }
    return true;
  });
  const [error, setError] = useState<string | null>(null);
  
  // Calculate initial cache string for reference
  const initialCache = typeof window !== "undefined" 
    ? localStorage.getItem(`rides_cache_${filters?.driverId || 'all'}`) || "" 
    : "";
  const lastUpdateRef = useRef<string>(initialCache);

  useEffect(() => {
    if (!db) {
      setError("Firebase db not initialized");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Initial fetch and check
    const fetchRides = async () => {
      try {
        const constraints = [];
        if (!filters?.includeCancelled) {
          constraints.push(where("status", "!=", "cancelled"));
        }
        constraints.push(where("departureTime", ">", Timestamp.now()));
        if (filters?.driverId) {
          constraints.push(where("driverId", "==", filters.driverId));
        }
        constraints.push(orderBy("departureTime", "desc"));

        const q = query(collection(db, "rides"), ...constraints);
        const querySnapshot = await getDocs(q);
        
        processSnapshot(querySnapshot);
      } catch (err: any) {
        console.error("Error fetching rides:", err);
        setError(err.message);
        setLoading(false);
      }
    };

    const processSnapshot = (querySnapshot: any) => {
      let ridesData: FirebaseRide[] = [];
      querySnapshot.forEach((doc: any) => {
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
          preferences: data.preferences,
          vehicleComfort: data.vehicleComfort || 'basic',
          instantBooking: data.instantBooking || false,
          returnTrip: data.returnTrip ? {
            ...data.returnTrip,
            date: data.returnTrip.date instanceof Timestamp ? data.returnTrip.date.toDate() : new Date(data.returnTrip.date)
          } : undefined,
          driverRating: data.driverRating,
          driver: data.driver,
          vehicle: data.vehicle,
        });
      });

      // Apply client-side filters
      if (filters?.minPrice !== undefined) ridesData = ridesData.filter(ride => ride.pricePerSeat >= filters.minPrice!);
      if (filters?.maxPrice !== undefined) ridesData = ridesData.filter(ride => ride.pricePerSeat <= filters.maxPrice!);
      if (filters?.minSeats !== undefined) ridesData = ridesData.filter(ride => ride.availableSeats >= filters.minSeats!);
      if (filters?.dateRange) {
        ridesData = ridesData.filter(ride => {
          const rideDate = ride.departureTime;
          return rideDate >= filters.dateRange!.start && rideDate <= filters.dateRange!.end;
        });
      }
      if (filters?.verifiedDriversOnly) ridesData = ridesData.filter(ride => ride.driver?.verificationStatus === 'verified');
      if (filters?.vehicleComfort) ridesData = ridesData.filter(ride => ride.vehicleComfort === filters.vehicleComfort);
      if (filters?.minRating !== undefined) ridesData = ridesData.filter(ride => (ride.driverRating || 0) >= filters.minRating!);
      if (filters?.instantBookingOnly) ridesData = ridesData.filter(ride => ride.instantBooking === true);
      if (filters?.preferences) {
        ridesData = ridesData.filter(ride => {
          if (!ride.preferences) return true;
          if (filters.preferences?.smoking === false && ride.preferences.smoking) return false;
          if (filters.preferences?.smoking === true && !ride.preferences.smoking) return false;
          if (filters.preferences?.pets === true && !ride.preferences.pets) return false;
          if (filters.preferences?.music === true && !ride.preferences.music) return false;
          if (filters.preferences?.ac === true && !ride.preferences.ac) return false;
          return true;
        });
      }

      if (filters?.sortBy) {
        ridesData.sort((a, b) => {
          switch (filters.sortBy) {
            case 'price_asc': return a.pricePerSeat - b.pricePerSeat;
            case 'price_desc': return b.pricePerSeat - a.pricePerSeat;
            case 'departure_asc': return a.departureTime.getTime() - b.departureTime.getTime();
            case 'departure_desc': return b.departureTime.getTime() - a.departureTime.getTime();
            case 'rating_desc': return (b.driverRating || 0) - (a.driverRating || 0);
            case 'duration_asc': return (a.eta || 0) - (b.eta || 0);
            default: return 0;
          }
        });
      }

      // Check if data actually changed
      const currentString = JSON.stringify(ridesData);
      if (currentString !== lastUpdateRef.current) {
        lastUpdateRef.current = currentString;
        setRides(ridesData);
        // Save to cache
        if (typeof window !== "undefined") {
          const cacheKey = `rides_cache_${filters?.driverId || 'all'}`;
          localStorage.setItem(cacheKey, currentString);
        }
      }
      setLoading(false);
    };

    // First fetch immediately
    fetchRides();

    // Set up polling interval every 5 seconds as requested
    const intervalId = setInterval(fetchRides, 5000);

    return () => clearInterval(intervalId);
  }, [filters?.driverId, filters?.includeCancelled, filters?.minPrice, filters?.maxPrice, filters?.minSeats, filters?.dateRange?.start, filters?.dateRange?.end, filters?.verifiedDriversOnly, filters?.vehicleComfort, filters?.minRating, filters?.instantBookingOnly, filters?.preferences?.smoking, filters?.preferences?.pets, filters?.preferences?.music, filters?.preferences?.ac, filters?.sortBy]);

  return { rides, loading, error };
}