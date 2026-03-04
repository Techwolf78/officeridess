import { createContext, useContext, ReactNode, useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient, UseMutationResult } from "@tanstack/react-query";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { FirebaseUser, UpdateProfileRequest } from "@/lib/types";
import { useLocation } from "wouter";

type AuthContextType = {
  user: FirebaseUser | null;
  isLoading: boolean;
  error: string | null;
  googleLogin: UseMutationResult<any, Error, void>;
  logout: UseMutationResult<void, Error, void>;
  updateProfile: UseMutationResult<any, Error, UpdateProfileRequest>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const unsubscribeFirestoreRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          const newUser: Partial<FirebaseUser> = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || undefined,
            displayName: firebaseUser.displayName || undefined,
            photoURL: firebaseUser.photoURL || undefined,
            role: "passenger",
            isDriverVerified: false,
            verificationStatus: "basic",
            createdAt: new Date(),
          };
          await setDoc(userRef, newUser);
        }

        if (unsubscribeFirestoreRef.current) unsubscribeFirestoreRef.current();
        
        unsubscribeFirestoreRef.current = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const firestoreUser = {
              uid: docSnap.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
            } as FirebaseUser;
            setUser(firestoreUser);
          }
          setIsLoading(false);
        });
      } else {
        setUser(null);
        if (unsubscribeFirestoreRef.current) {
          unsubscribeFirestoreRef.current();
          unsubscribeFirestoreRef.current = null;
        }
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestoreRef.current) unsubscribeFirestoreRef.current();
    };
  }, []);

  const googleLoginMutation = useMutation({
    mutationFn: async () => {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      return result.user; 
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut(auth);
      queryClient.clear();
      setUser(null);
      setError(null);
    },
    onSuccess: () => {
      setLocation("/login");
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      if (!user) throw new Error("Not authenticated");
      const updateData = { ...data };
      delete (updateData as any).uid;
      delete (updateData as any).createdAt;
      await updateDoc(doc(db, "users", user.uid), updateData);
      return { success: true };
    },
  });

  return (
    <AuthContext.Provider value={{ 
      user, 
      isLoading, 
      error, 
      googleLogin: googleLoginMutation,
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
