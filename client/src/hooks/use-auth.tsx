import { createContext, useContext, ReactNode, useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirebaseUser, LoginRequest, UpdateProfileRequest } from "@/lib/types";
import { useLocation } from "wouter";

type AuthContextType = {
  user: FirebaseUser | null;
  isLoading: boolean;
  error: string | null;
  mockLogin: UseMutationResult<any, Error, LoginRequest>;
  logout: UseMutationResult<void, Error, void>;
  updateProfile: UseMutationResult<any, Error, UpdateProfileRequest>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(() => {
    try {
      const savedUser = localStorage.getItem('mockUser');
      return savedUser ? (JSON.parse(savedUser) as FirebaseUser) : null;
    } catch (e) {
      console.warn('Error reading from localStorage:', e);
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(() => {
    // If we have a user in localStorage, we can start with isLoading: false
    return !localStorage.getItem('mockUser');
  });

  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Sync with Firestore whenever user UID changes
  useEffect(() => {
    if (!user?.uid) {
      setIsLoading(false);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Split displayName into firstName and lastName if available
          const nameParts = data.displayName ? data.displayName.split(' ') : [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const firestoreUser = {
            uid: docSnap.id,
            ...data,
            firstName: data.firstName || firstName,
            lastName: data.lastName || lastName,
            createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
          } as FirebaseUser;
          
          setUser(firestoreUser);
          localStorage.setItem('mockUser', JSON.stringify(firestoreUser));
        }
        setIsLoading(false);
        setError(null);
      },
      (err) => {
        console.warn('Error listening to user changes:', err);
        setError('Failed to sync with server - using cached data');
        setIsLoading(false);
      }
    );

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
    };
  }, [user?.uid]);

  const mockLoginMutation = useMutation({
    mutationFn: async (data: LoginRequest) => {
      const mockUid = `mock_${data.phoneNumber.replace('+', '').replace(/\D/g, '')}`;

      try {
        const userDoc = await getDoc(doc(db, 'users', mockUid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as Omit<FirebaseUser, 'uid'>;
          // Split displayName into firstName and lastName if available
          const nameParts = userData.displayName ? userData.displayName.split(' ') : [];
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const fullUser = { 
            uid: mockUid, 
            ...userData,
            firstName: userData.firstName || firstName,
            lastName: userData.lastName || lastName,
          };
          setUser(fullUser);
          localStorage.setItem('mockUser', JSON.stringify(fullUser));
          return fullUser;
        } else {
          const newUser: FirebaseUser = {
            uid: mockUid,
            phoneNumber: data.phoneNumber,
            role: 'passenger',
            isDriverVerified: false,
            verificationStatus: 'basic',
            createdAt: new Date(),
          };
          await setDoc(doc(db, 'users', mockUid), newUser);
          setUser(newUser);
          localStorage.setItem('mockUser', JSON.stringify(newUser));
          return newUser;
        }
      } catch (err) {
        console.warn('Firestore fallback:', err);
        const newUser: FirebaseUser = {
          uid: mockUid,
          phoneNumber: data.phoneNumber,
          role: 'passenger',
          isDriverVerified: false,
          verificationStatus: 'basic',
          createdAt: new Date(),
        };
        setUser(newUser);
        localStorage.setItem('mockUser', JSON.stringify(newUser));
        return newUser;
      }
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      queryClient.clear();
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
      delete (updateData as any).uid;
      delete (updateData as any).createdAt;

      const updatedUser = { ...user, ...updateData };
      setUser(updatedUser);
      localStorage.setItem('mockUser', JSON.stringify(updatedUser));

      try {
        await updateDoc(doc(db, 'users', user.uid), updateData);
      } catch (err) {
        console.warn('Firestore update failed, but local state updated:', err);
      }

      return { success: true };
    },
  });

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      error, 
      mockLogin: mockLoginMutation, 
      logout: logoutMutation, 
      updateProfile: updateProfileMutation 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
