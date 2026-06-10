import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Comprehensive Firebase connection configuration mapping
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCckNirrQerQ6PbMD7wJx8XLOAZQpXpk2k",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mooderia-education-af839.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://mooderia-education-af839-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mooderia-education-af839",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mooderia-education-af839.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "967931234226",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:967931234226:web:10f93fa1c3c7309774c6ab",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-KPETXZ9CVE"
};

// Singleton initialization pattern to prevent duplicate instances
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Safe Analytics Initialization
export let analytics: any = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch((err) => {
  console.warn("Analytics not supported or blocked: ", err);
});

export default app;
