import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseBooking, CreateBookingRequest, CancelBookingRequest, FirebaseUser } from "@/lib/types";

export function useBookings() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["bookings", user?.uid],
    queryFn: async () => {
      if (!user) return [];

      const q = query(collection(db, "bookings"), where("passengerId", "==", user.uid));
      const querySnapshot = await getDocs(q);

      const bookings: FirebaseBooking[] = [];
      for (const docSnap of querySnapshot.docs) {
        const bookingData = docSnap.data();
        const rideDoc = await getDoc(doc(db, "rides", bookingData.rideId));

        bookings.push({
          id: docSnap.id,
          rideId: bookingData.rideId,
          passengerId: bookingData.passengerId,
          seatsBooked: bookingData.seatsBooked,
          totalPrice: bookingData.totalPrice,
          status: bookingData.status,
          bookingTime: bookingData.bookingTime.toDate(),
          cancelledAt: bookingData.cancelledAt?.toDate(),
          cancelReason: bookingData.cancelReason,
          timeBeforeDeparture: bookingData.timeBeforeDeparture,
          passengerRating: bookingData.passengerRating,
          driverRating: bookingData.driverRating,
          ride: rideDoc.exists() ? {
            id: rideDoc.id,
            driverId: rideDoc.data().driverId,
            vehicleId: rideDoc.data().vehicleId,
            origin: rideDoc.data().origin,
            destination: rideDoc.data().destination,
            originLatLng: rideDoc.data().originLatLng,
            destLatLng: rideDoc.data().destLatLng,
            route: rideDoc.data().route || [],
            stops: rideDoc.data().stops || [],
            distance: rideDoc.data().distance || 0,
            eta: rideDoc.data().eta || 0,
            departureTime: rideDoc.data().departureTime?.toDate(),
            totalSeats: rideDoc.data().totalSeats,
            availableSeats: rideDoc.data().availableSeats,
            pricePerSeat: rideDoc.data().pricePerSeat,
            status: rideDoc.data().status,
            createdAt: rideDoc.data().createdAt?.toDate(),
            routePolyline: rideDoc.data().routePolyline || "",
            routeSteps: rideDoc.data().routeSteps || [],
            routeRoads: rideDoc.data().routeRoads || [],
            vehicleComfort: rideDoc.data().vehicleComfort,
            instantBooking: rideDoc.data().instantBooking,
          } : undefined,
        });
      }

      return bookings.sort((a, b) => b.bookingTime.getTime() - a.bookingTime.getTime());
    },
    enabled: !!user,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateBookingRequest) => {
      if (!user) throw new Error("Not authenticated");

      // Use a transaction to ensure atomic seat booking
      const newBookingId = await runTransaction(db, async (transaction) => {
        const rideRef = doc(db, "rides", data.rideId);
        const rideSnap = await transaction.get(rideRef);

        if (!rideSnap.exists()) {
          throw new Error("Ride not found");
        }

        const rideData = rideSnap.data();

        // 🚫 PREVENT DRIVERS FROM BOOKING THEIR OWN RIDES
        if (rideData.driverId === user.uid) {
          throw new Error("You cannot book your own ride");
        }

        // 🚫 PREVENT DUPLICATE BOOKINGS - Check if user already booked this ride
        // Note: Transactions require reads before writes. Querying is allowed but cannot be 
        // part of the transaction's atomic snapshot itself in the same way docs are.
        // However, we verify duplicate bookings beforehand or keep it as is.
        const existingBookingsQuery = query(
          collection(db, "bookings"),
          where("rideId", "==", data.rideId),
          where("passengerId", "==", user.uid),
          where("status", "in", ["confirmed", "completed"])
        );
        const existingBookings = await getDocs(existingBookingsQuery);
        if (!existingBookings.empty) {
          throw new Error("You have already booked this ride");
        }

        // ✅ VALIDATE SEAT AVAILABILITY
        if (rideData.availableSeats < data.seats) {
          throw new Error(`Only ${rideData.availableSeats} seats available`);
        }

        // ✅ VALIDATE RIDE STATUS
        if (rideData.status !== "scheduled") {
          throw new Error("This ride is no longer available for booking");
        }

        // ✅ VALIDATE BOOKING TIME - Prevent last-minute bookings (threshold increased for reliability)
        const rideTime = rideData.departureTime.toDate();
        const now = new Date();
        const minutesUntilRide = (rideTime.getTime() - now.getTime()) / (1000 * 60);
        if (minutesUntilRide < 15) {
          throw new Error("Cannot book rides less than 15 minutes before departure");
        }

        // Create booking data
        const totalPrice = rideData.pricePerSeat * data.seats;
        const bookingData = {
          rideId: data.rideId,
          passengerId: user.uid,
          seatsBooked: data.seats,
          totalPrice: totalPrice,
          status: "confirmed",
          bookingTime: Timestamp.fromDate(new Date()),
        };

        const bookingRef = doc(collection(db, "bookings"));
        transaction.set(bookingRef, bookingData);

        // Update ride available seats
        transaction.update(rideRef, {
          availableSeats: rideData.availableSeats - data.seats,
        });

        return bookingRef.id;
      });

      return { id: newBookingId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["ride"] }); // Individual ride details
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CancelBookingRequest) => {
      if (!user) throw new Error("Not authenticated");

      // Get booking document
      const bookingRef = doc(db, "bookings", data.bookingId);
      const bookingSnap = await getDoc(bookingRef);

      if (!bookingSnap.exists()) {
        throw new Error("Booking not found");
      }

      const bookingData = bookingSnap.data();

      // Check if booking belongs to user
      if (bookingData.passengerId !== user.uid) {
        throw new Error("Unauthorized");
      }

      // Check if booking is already cancelled
      if (bookingData.status === "cancelled") {
        throw new Error("Booking is already cancelled");
      }

      // Get ride document to calculate time before departure
      const rideRef = doc(db, "rides", bookingData.rideId);
      const rideSnap = await getDoc(rideRef);

      if (!rideSnap.exists()) {
        throw new Error("Ride not found");
      }

      const rideData = rideSnap.data();
      const departureTime = rideData.departureTime.toDate();
      const now = new Date();
      const timeBeforeDeparture = Math.floor((departureTime.getTime() - now.getTime()) / (1000 * 60)); // minutes

      // Update booking with cancellation data
      const cancellationData = {
        status: "cancelled",
        cancelledAt: Timestamp.fromDate(now),
        cancelReason: data.reason,
        timeBeforeDeparture: timeBeforeDeparture,
      };

      await updateDoc(bookingRef, cancellationData);

      // Return seats to ride
      await updateDoc(rideRef, {
        availableSeats: rideData.availableSeats + bookingData.seatsBooked,
      });

      return { id: data.bookingId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rides"] });
    },
  });
}

export function useRideBookings(rideId: string) {
  return useQuery<FirebaseBooking[]>({
    queryKey: ["ride-bookings", rideId],
    queryFn: async () => {
      const q = query(
        collection(db, "bookings"),
        where("rideId", "==", rideId),
        where("status", "==", "confirmed")
      );
      const querySnapshot = await getDocs(q);

      const bookings: FirebaseBooking[] = [];
      for (const docSnap of querySnapshot.docs) {
        const bookingData = docSnap.data();

        // Fetch passenger user data
        const passengerDoc = await getDoc(doc(db, "users", bookingData.passengerId));
        const passenger = passengerDoc.exists() ? {
          uid: passengerDoc.id,
          ...passengerDoc.data(),
          createdAt: passengerDoc.data().createdAt?.toDate(),
        } as FirebaseUser : undefined;

        bookings.push({
          id: docSnap.id,
          rideId: bookingData.rideId,
          passengerId: bookingData.passengerId,
          seatsBooked: bookingData.seatsBooked,
          totalPrice: bookingData.totalPrice,
          status: bookingData.status,
          bookingTime: bookingData.bookingTime.toDate(),
          passenger,
        });
      }

      return bookings.sort((a, b) => a.bookingTime.getTime() - b.bookingTime.getTime());
    },
    enabled: !!rideId,
  });
}
