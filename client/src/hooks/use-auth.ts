import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseUser, LoginRequest, UpdateProfileRequest } from "@/lib/types";
import { useLocation } from "wouter";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Load user from localStorage on mount (for persistence)
  useEffect(() => {
    const savedUser = localStorage.getItem('mockUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('mockUser');
      }
    }
    setIsLoading(false);
  }, []);

  const mockLoginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      // Generate a mock user ID based on phone number
      const mockUid = `mock_${data.phoneNumber.replace('+', '').replace(/\D/g, '')}`;

      try {
        // Try to check if user document exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', mockUid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as Omit<FirebaseUser, 'uid'>;
          const fullUser = { uid: mockUid, ...userData };
          setUser(fullUser);
          localStorage.setItem('mockUser', JSON.stringify(fullUser));
        } else {
          // New user - create document
          const newUser: FirebaseUser = {
            uid: mockUid,
            phoneNumber: data.phoneNumber,
            role: 'passenger',
            isDriverVerified: false,
            createdAt: new Date(),
          };
          try {
            await setDoc(doc(db, 'users', mockUid), newUser);
          } catch (firestoreError) {
            console.warn('Firestore write failed, proceeding with local user:', firestoreError);
          }
          setUser(newUser);
          localStorage.setItem('mockUser', JSON.stringify(newUser));
        }
      } catch (error) {
        // If Firestore read fails, try to use localStorage or create new user
        console.warn('Firestore read failed, using local data:', error);
        const localUserData = localStorage.getItem('mockUser');
        if (localUserData) {
          try {
            const localUser = JSON.parse(localUserData);
            if (localUser.uid === mockUid) {
              setUser(localUser);
              return { success: true, message: "Login successful (offline)" };
            }
          } catch (parseError) {
            console.warn('Failed to parse local user data:', parseError);
          }
        }

        // Create new user locally
        const newUser: FirebaseUser = {
          uid: mockUid,
          phoneNumber: data.phoneNumber,
          role: 'passenger',
          isDriverVerified: false,
          createdAt: new Date(),
        };
        setUser(newUser);
        localStorage.setItem('mockUser', JSON.stringify(newUser));
      }

      return { success: true, message: "Login successful" };
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      setUser(null);
      localStorage.removeItem('mockUser');
    },
    onSuccess: () => {
      setLocation("/");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      if (!user) throw new Error("Not authenticated");

      const updateData = { ...data };
      delete (updateData as any).uid; // Remove uid if present
      delete (updateData as any).createdAt; // Remove createdAt if present

      // Update local state and localStorage first (optimistic update)
      const updatedUser = { ...user, ...updateData };
      setUser(updatedUser);
      localStorage.setItem('mockUser', JSON.stringify(updatedUser));

      try {
        // Try to update Firestore (may be blocked by browser extensions)
        await updateDoc(doc(db, 'users', user.uid), updateData);
      } catch (error) {
        // If Firestore update fails (e.g., blocked by client), we still keep the local update
        console.warn('Firestore update failed, but local state updated:', error);
      }

      return { success: true };
    },
  });

  return {
    user,
    isLoading,
    error: null,
    mockLogin: mockLoginMutation,
    logout: logoutMutation,
    updateProfile: updateProfileMutation,
  };
}
