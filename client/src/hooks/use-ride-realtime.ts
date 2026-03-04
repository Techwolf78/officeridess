import { useEffect, useState, useRef } from "react";
import {
  doc,
  onSnapshot,
  Timestamp,
  getDoc,
  DocumentSnapshot
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseRide, FirebaseUser, FirebaseVehicle } from "@/lib/types";

// Cache for driver and vehicle data to prevent duplicate fetches
const driverCache = new Map<string, FirebaseUser>();
const vehicleCache = new Map<string, FirebaseVehicle>();

export function useRideRealtime(rideId: string) {
  const [ride, setRide] = useState<FirebaseRide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef<{ driverId?: string; vehicleId?: string }>({});

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
        async (docSnap) => {
          if (!docSnap.exists()) {
            setRide(null);
            setError("Ride not found");
            setLoading(false);
            return;
          }

          const data = docSnap.data();
          
          // Fetch driver data (from cache if available)
          let driverData: FirebaseUser | undefined;
          if (data.driverId) {
            if (driverCache.has(data.driverId)) {
              driverData = driverCache.get(data.driverId);
            } else if (!fetchingRef.current.driverId) {
              // Only fetch if not already fetching
              fetchingRef.current.driverId = data.driverId;
              try {
                const driverDoc = await getDoc(doc(db, "users", data.driverId));
                if (driverDoc.exists()) {
                  const driver = driverDoc.data();
                  // Split displayName into firstName and lastName if available
                  const nameParts = driver.displayName ? driver.displayName.split(' ') : [];
                  const firstName = nameParts[0] || '';
                  const lastName = nameParts.slice(1).join(' ') || '';
                  
                  driverData = {
                    uid: driverDoc.id,
                    phoneNumber: driver.phoneNumber,
                    firstName: driver.firstName || firstName,
                    lastName: driver.lastName || lastName,
                    displayName: driver.displayName,
                    email: driver.email,
                    homeAddress: driver.homeAddress,
                    officeAddress: driver.officeAddress,
                    profilePicture: driver.profilePicture,
                    createdAt: driver.createdAt instanceof Timestamp ? driver.createdAt.toDate() : new Date(driver.createdAt),
                    rating: driver.rating,
                    totalRides: driver.totalRides,
                    verified: driver.verified,
                  };
                  driverCache.set(data.driverId, driverData);
                }
              } catch (err) {
                console.error("Error fetching driver data:", err);
              } finally {
                fetchingRef.current.driverId = undefined;
              }
            }
          }

          // Fetch vehicle data (from cache if available)
          let vehicleData: FirebaseVehicle | undefined;
          if (data.vehicleId) {
            if (vehicleCache.has(data.vehicleId)) {
              vehicleData = vehicleCache.get(data.vehicleId);
            } else if (!fetchingRef.current.vehicleId) {
              // Only fetch if not already fetching
              fetchingRef.current.vehicleId = data.vehicleId;
              try {
                const vehicleDoc = await getDoc(doc(db, "vehicles", data.vehicleId));
                if (vehicleDoc.exists()) {
                  const vehicle = vehicleDoc.data();
                  vehicleData = {
                    id: vehicleDoc.id,
                    userId: vehicle.userId,
                    model: vehicle.model,
                    plateNumber: vehicle.plateNumber,
                    color: vehicle.color,
                    capacity: vehicle.capacity,
                    type: vehicle.type,
                  };
                  vehicleCache.set(data.vehicleId, vehicleData);
                }
              } catch (err) {
                console.error("Error fetching vehicle data:", err);
              } finally {
                fetchingRef.current.vehicleId = undefined;
              }
            }
          }

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
            driver: driverData,
            vehicle: vehicleData,
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
