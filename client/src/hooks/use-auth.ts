import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signInWithPhoneNumber, signOut, onAuthStateChanged, User, RecaptchaVerifier } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { FirebaseUser, LoginRequest, VerifyOtpRequest, UpdateProfileRequest } from "@/lib/types";
import { useLocation } from "wouter";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Initialize reCAPTCHA verifier
  useEffect(() => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
  }, []);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as Omit<FirebaseUser, 'uid'>;
          setUser({ uid: firebaseUser.uid, ...userData });
        } else {
          // Create new user document if it doesn't exist
          const newUser: FirebaseUser = {
            uid: firebaseUser.uid,
            phoneNumber: firebaseUser.phoneNumber || '',
            fullName: '',
            role: 'passenger',
            isDriverVerified: false,
            walletBalance: 10000, // $100 in cents
            createdAt: new Date(),
          };
          await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const confirmation = await signInWithPhoneNumber(auth, data.phoneNumber, window.recaptchaVerifier);
      setConfirmationResult(confirmation);
      return { success: true, message: "OTP sent" };
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (data: VerifyOtpRequest) => {
      const result = await data.confirmationResult.confirm(data.otp);
      return result.user;
    },
    onSuccess: () => {
      setLocation("/");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut(auth);
      setConfirmationResult(null);
    },
    onSuccess: () => {
      setLocation("/login");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      if (!user) throw new Error("Not authenticated");

      const updateData = { ...data };
      delete (updateData as any).uid; // Remove uid if present
      delete (updateData as any).createdAt; // Remove createdAt if present

      await updateDoc(doc(db, 'users', user.uid), updateData);

      // Update local state
      setUser(prev => prev ? { ...prev, ...updateData } : null);
      return { success: true };
    },
  });

  return {
    user,
    isLoading,
    error: null, // Firebase handles errors through mutations
    confirmationResult,
    login: loginMutation,
    verify: verifyMutation,
    logout: logoutMutation,
    updateProfile: updateProfileMutation,
  };
}
