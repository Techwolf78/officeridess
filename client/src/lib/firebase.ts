import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCDLL_kOgfDZmGJwya2RUMUcSak4axjL6c",
  authDomain: "visit-app-68717.firebaseapp.com",
  databaseURL: "https://visit-app-68717-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "visit-app-68717",
  storageBucket: "visit-app-68717.firebasestorage.app",
  messagingSenderId: "847779288690",
  appId: "1:847779288690:web:0e4bd74d33618f563fd4eb",
  measurementId: "G-L3DGJQEM2W"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Extend window interface for reCAPTCHA
declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default app;