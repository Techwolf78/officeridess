import { useMutation } from "@tanstack/react-query";
import { useAuth } from "./use-auth";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

interface DriverVerificationRequest {
  front?: File;
  back?: File;
}

export function useDriverVerification() {
  const { user, updateProfile } = useAuth();

  const submitVerification = useMutation({
    mutationFn: async (data: DriverVerificationRequest) => {
      if (!user?.uid) throw new Error("User not authenticated");
      if (user.role !== "driver") throw new Error("Only drivers can submit verification");
      if (!data.front || !data.back) throw new Error("Both front and back images are required");

      let frontUrl = "";
      let backUrl = "";

      try {
        // Upload front image
        const frontRef = ref(storage, `verifications/${user.uid}/front_${Date.now()}`);
        await uploadBytes(frontRef, data.front);
        frontUrl = await getDownloadURL(frontRef);

        // Upload back image
        const backRef = ref(storage, `verifications/${user.uid}/back_${Date.now()}`);
        await uploadBytes(backRef, data.back);
        backUrl = await getDownloadURL(backRef);

        // Update user document with verification status, timestamp, and image URLs
        await updateDoc(doc(db, "users", user.uid), {
          verificationStatus: "pending",
          verificationRequestedAt: serverTimestamp(),
          verificationImages: {
            front: frontUrl,
            back: backUrl,
          },
        });

        // Also update local auth state
        await updateProfile.mutateAsync({
          verificationStatus: "pending",
          verificationRequestedAt: new Date(),
        });

        return {
          success: true,
          message: "Verification request submitted successfully",
        };
      } catch (err) {
        // If upload or Firestore fails, still try to update local state for offline support
        try {
          await updateProfile.mutateAsync({
            verificationStatus: "pending",
            verificationRequestedAt: new Date(),
          });
          console.warn("Storage/Firestore update failed, but local state updated:", err);
        } catch (localErr) {
          console.error("Failed to update local state:", localErr);
        }
        throw err;
      }
    },
  });

  return submitVerification;
}
