import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseUser, LoginRequest, UpdateProfileRequest } from "@/lib/types";
import { useLocation } from "wouter";

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Load user from localStorage on mount (for persistence)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let isMounted = true;

    const loadUser = async () => {
      const savedUser = localStorage.getItem('mockUser');
      
      if (savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser) as FirebaseUser;
          
          if (!isMounted) return;
          setUser(parsedUser);
          setError(null);

          // Set up real-time listener for current user's document in Firestore
          if (parsedUser.uid) {
            // Set a timeout for the Firestore connection - if no response in 10 seconds, show error
            timeoutId = setTimeout(() => {
              if (isMounted) {
                console.warn('Firestore connection timeout');
                setIsLoading(false);
                setError('Connection timeout - using cached data');
              }
            }, 10000);

            const unsubscribe = onSnapshot(
              doc(db, 'users', parsedUser.uid),
              (docSnap) => {
                if (timeoutId) clearTimeout(timeoutId);
                
                if (!isMounted) return;

                if (docSnap.exists()) {
                  const firestoreUser = {
                    uid: docSnap.id,
                    ...docSnap.data(),
                    createdAt: docSnap.data().createdAt?.toDate?.() || new Date(docSnap.data().createdAt),
                  } as FirebaseUser;
                  setUser(firestoreUser);
                  localStorage.setItem('mockUser', JSON.stringify(firestoreUser));
                }
                setIsLoading(false);
                setError(null);
              },
              (error) => {
                if (timeoutId) clearTimeout(timeoutId);
                
                if (!isMounted) return;

                console.warn('Error listening to user changes:', error);
                setIsLoading(false);
                // Keep the locally cached user, but note there's an error
                setError('Failed to sync with server - using cached data');
              }
            );

            // Store the unsubscribe function for cleanup
            unsubscribeRef.current = unsubscribe;
          } else {
            // No uid, set loading to false
            setIsLoading(false);
            setError(null);
          }
        } catch (error) {
          if (!isMounted) return;

          console.error('Error parsing saved user:', error);
          localStorage.removeItem('mockUser');
          setIsLoading(false);
          setError('Failed to load user data');
        }
      } else {
        if (!isMounted) return;
        setIsLoading(false);
        setError(null);
      }
    };

    loadUser();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      // Cleanup listener on unmount
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
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
      // Stop listening to user changes first
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      // Clear all cached data to prevent stale data for next user
      queryClient.clear();

      // Clear user state and localStorage
      setUser(null);
      localStorage.removeItem('mockUser');
      setError(null);
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
    error,
    mockLogin: mockLoginMutation,
    logout: logoutMutation,
    updateProfile: updateProfileMutation,
  };
}
