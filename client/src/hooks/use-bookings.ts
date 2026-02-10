import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  runTransaction,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/use-auth";
import { FirebaseBooking, CreateBookingRequest } from "@/lib/types";

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
          ...bookingData,
          bookingTime: bookingData.bookingTime.toDate(),
          ride: rideDoc.exists() ? { id: rideDoc.id, ...rideDoc.data() } : undefined,
        } as FirebaseBooking);
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

      return await runTransaction(db, async (transaction) => {
        // Get ride document
        const rideRef = doc(db, "rides", data.rideId);
        const rideSnap = await transaction.get(rideRef);

        if (!rideSnap.exists()) {
          throw new Error("Ride not found");
        }

        const rideData = rideSnap.data();

        // Check if enough seats available
        if (rideData.availableSeats < data.seats) {
          throw new Error("Not enough seats available");
        }

        // Get user document to check wallet balance
        const userRef = doc(db, "users", user.uid);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) {
          throw new Error("User not found");
        }

        const userData = userSnap.data();
        const totalPrice = rideData.pricePerSeat * data.seats;

        if (userData.walletBalance < totalPrice) {
          throw new Error("Insufficient wallet balance");
        }

        // Create booking
        const bookingData = {
          rideId: data.rideId,
          passengerId: user.uid,
          seatsBooked: data.seats,
          totalPrice,
          status: "confirmed",
          bookingTime: Timestamp.fromDate(new Date()),
        };

        const bookingRef = doc(collection(db, "bookings"));
        transaction.set(bookingRef, bookingData);

        // Update ride available seats
        transaction.update(rideRef, {
          availableSeats: rideData.availableSeats - data.seats,
        });

        // Update user wallet balance
        transaction.update(userRef, {
          walletBalance: userData.walletBalance - totalPrice,
        });

        return { id: bookingRef.id, ...bookingData };
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rides"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function useCancelBooking() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");

      await runTransaction(db, async (transaction) => {
        // Get booking document
        const bookingRef = doc(db, "bookings", id);
        const bookingSnap = await transaction.get(bookingRef);

        if (!bookingSnap.exists()) {
          throw new Error("Booking not found");
        }

        const bookingData = bookingSnap.data();

        // Check if booking belongs to user
        if (bookingData.passengerId !== user.uid) {
          throw new Error("Unauthorized");
        }

        // Get ride document
        const rideRef = doc(db, "rides", bookingData.rideId);
        const rideSnap = await transaction.get(rideRef);

        if (!rideSnap.exists()) {
          throw new Error("Ride not found");
        }

        const rideData = rideSnap.data();

        // Update booking status
        transaction.update(bookingRef, { status: "cancelled" });

        // Return seats to ride (no refund for simplicity)
        transaction.update(rideRef, {
          availableSeats: rideData.availableSeats + bookingData.seatsBooked,
        });
      });

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["rides"] });
    },
  });
}
