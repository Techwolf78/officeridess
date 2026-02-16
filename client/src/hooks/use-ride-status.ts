import { useState } from "react";
import { doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

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
    confirmCompletion,
    markRated,
    cancelRide,
  };
}
