import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useBookingsRealtime } from "@/hooks/use-bookings-realtime";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, writeBatch, Timestamp } from "firebase/firestore";
import { Bell, ShieldAlert } from "lucide-react";

export function BackgroundManager() {
  const { user } = useAuth();
  const { bookings } = useBookingsRealtime();
  const { toast } = useToast();
  const notifiedBookings = useRef<Set<string>>(new Set());

  // 1. Request Browser Notification Permissions
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // 2. Global Automation Heartbeat (Runs every 1 minute)
  useEffect(() => {
    if (!user || bookings.length === 0) return;

    const runCentralizedAutomation = async () => {
      const now = new Date();
      const batch = writeBatch(db);
      let needsBatchCommit = false;

      bookings.forEach((booking) => {
        if (booking.status !== "confirmed") return;
        
        const departureTime = booking.ride?.departureTime;
        if (!departureTime) return;

        const timeDiffMs = departureTime.getTime() - now.getTime();
        const minutesUntilDeparture = timeDiffMs / (1000 * 60);

        // A. Booking Status Cleanup (Zombie Cleanup - 12h old)
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        if (new Date(booking.bookingTime) < twelveHoursAgo) {
          const ref = doc(db, "bookings", booking.id);
          batch.update(ref, {
            status: "cancelled",
            cancelReason: "System auto-cleanup: Ride expired",
            cancelledAt: Timestamp.now(),
          });
          needsBatchCommit = true;
          return;
        }

        // B. Departure Proactive Notifications (15m before)
        const notificationId = `${booking.id}_15m`;
        if (booking.ride && minutesUntilDeparture > 0 && minutesUntilDeparture <= 15 && !notifiedBookings.current.has(notificationId)) {
          // In-App Toast
          toast({
            title: "Upcoming Ride!",
            description: `Your ride from ${booking.ride.origin} departs in 15 minutes.`,
            variant: "default",
          });

          // Browser Native Notification
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Ride Departing Soon", {
              body: `Your ride to ${booking.ride.destination} starts in 15 minutes!`,
              icon: "/favicon.ico",
            });
          }

          notifiedBookings.current.add(notificationId);
        }
      });

      if (needsBatchCommit) {
        try {
          await batch.commit();
          toast({
            title: "Cleanup Complete",
            description: "Automatically cancelled stale bookings.",
          });
        } catch (err) {
          console.error("BackgroundManager: Cleanup error", err);
        }
      }
    };

    const interval = setInterval(runCentralizedAutomation, 60000); // Check every minute
    runCentralizedAutomation(); // Run immediately on mount/update

    return () => clearInterval(interval);
  }, [user, bookings, toast]);

  return null; // This is a logic-only component
}
