import { useState } from "react";
import { doc, updateDoc, Timestamp, getDoc, increment, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calculateCO2Updates, getMonthKey } from "@/lib/utils";
import { FirebaseBooking, FirebaseRide } from "@/lib/types";

type RideStatus = "confirmed" | "waiting" | "in_progress" | "completed" | "rated" | "cancelled";

interface RideState {
  status: RideStatus;
  activatedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  confirmedAt?: Date;
}

/**
 * Manages ride status transitions with real-time Firestore persistence
 * All status changes are immediately saved to the database
 */
export function useRideStatus(bookingId: string, initialStatus: RideStatus = "confirmed") {
  const [rideState, setRideState] = useState<RideState>({
    status: initialStatus,
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Helper to update Firestore and local state
   */
  const updateBookingStatus = async (newStatus: RideStatus, updates: any) => {
    try {
      setIsUpdating(true);
      setError(null);

      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, {
        status: newStatus,
        ...updates,
      });

      // Update local state after successful Firestore update
      setRideState(prev => ({
        ...prev,
        status: newStatus,
        ...updates,
      }));
    } catch (err: any) {
      console.error("Error updating booking status:", err);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Driver marks "I've arrived"
  const markArrived = () => {
    updateBookingStatus("waiting", {
      activatedAt: Timestamp.now(),
    });
  };

  // Driver starts the ride
  const startRide = () => {
    updateBookingStatus("in_progress", {
      startedAt: Timestamp.now(),
    });
  };

  // Driver marks arrival at destination
  const markCompleted = () => {
    updateBookingStatus("completed", {
      completedAt: Timestamp.now(),
    });
  };

  /**
   * Mark ride as completed and update CO2 metrics for both passenger and driver
   * Should be called when markCompleted is triggered, with booking and ride data available
   */
  const markCompletedWithCO2 = async (
    booking: FirebaseBooking,
    ride: FirebaseRide
  ) => {
    try {
      setIsUpdating(true);
      setError(null);
      
      console.log("🚀 Starting ride completion with CO2 tracking...");
      console.log("📋 Booking ID:", bookingId);
      console.log("👤 Passenger ID:", booking.passengerId);
      console.log("🚗 Driver ID:", ride.driverId);
      console.log("📍 Distance:", ride.distance, "km");
      console.log("💺 Seats booked:", booking.seatsBooked);

      const now = new Date();
      const co2Updates = calculateCO2Updates(
        booking.passengerId,
        ride.driverId,
        booking.seatsBooked,
        ride.distance,
        now
      );

      console.log("♻️ CO2 Updates Calculated:", {
        passengerCO2: co2Updates.passengerUpdate.co2Amount,
        driverCO2: co2Updates.driverUpdate.co2Amount,
        bookingCO2: co2Updates.co2SavedKg,
      });

      const batch = writeBatch(db);

      // Update booking with CO2 data
      const bookingRef = doc(db, "bookings", bookingId);
      batch.update(bookingRef, {
        status: "completed",
        completedAt: Timestamp.now(),
        co2SavedKg: co2Updates.co2SavedKg,
        co2SavedAtTime: now.toISOString(),
      });
      console.log("✅ Added booking update to batch");

      // Update passenger CO2 metrics (totals only)
      const passengerRef = doc(db, "users", booking.passengerId);
      batch.update(passengerRef, {
        co2SavedAsPassenger: increment(co2Updates.passengerUpdate.co2Amount),
        lastCO2Update: now.toISOString(),
      });
      console.log("✅ Added passenger CO2 update to batch");

      // Update driver CO2 metrics (totals only)
      const driverRef = doc(db, "users", ride.driverId);
      batch.update(driverRef, {
        co2SavedByPassengers: increment(co2Updates.driverUpdate.co2Amount),
        totalPassengersServed: increment(co2Updates.driverUpdate.passengerCount),
        lastCO2Update: now.toISOString(),
      });
      console.log("✅ Added driver CO2 update to batch");

      // Commit batch update
      console.log("🔄 Committing batch update to Firestore...");
      await batch.commit();
      console.log("✅ SUCCESS! Firestore batch commit completed");

      console.log("📊 Summary:", {
        bookingUpdated: true,
        passengerCO2Added: co2Updates.passengerUpdate.co2Amount,
        driverCO2Added: co2Updates.driverUpdate.co2Amount,
        passengersServed: co2Updates.driverUpdate.passengerCount,
        timestamp: now.toISOString(),
      });

      // Update local state
      setRideState(prev => ({
        ...prev,
        status: "completed",
        completedAt: now,
      }));
    } catch (err: any) {
      console.error("❌ ERROR during ride completion:", err);
      console.error("Error message:", err.message);
      console.error("Error code:", err.code);
      setError(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  // Passenger confirms completion
  const confirmCompletion = () => {
    updateBookingStatus("completed", {
      confirmedAt: Timestamp.now(),
    });
  };

  // Mark as rated
  const markRated = () => {
    updateBookingStatus("rated", {});
  };

  // Cancel ride
  const cancelRide = (reason: string, cancelledBy: "driver" | "passenger") => {
    updateBookingStatus("cancelled", {
      cancelReason: reason,
      cancelledBy: cancelledBy,
      cancelledAt: Timestamp.now(),
    });
  };

  return {
    rideState,
    isUpdating,
    error,
    markArrived,
    startRide,
    markCompleted,
    markCompletedWithCO2,
    confirmCompletion,
    markRated,
    cancelRide,
  };
}
