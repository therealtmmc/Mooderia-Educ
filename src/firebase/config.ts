import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';

// Comprehensive Firebase connection configuration mapping
const metaEnv = (import.meta as any).env || {};

const firebaseConfig = {
  apiKey: (metaEnv.VITE_FIREBASE_API_KEY as string) || "placeholder-api-key-for-local-first",
  authDomain: (metaEnv.VITE_FIREBASE_AUTH_DOMAIN as string) || "placeholder-auth-domain.firebaseapp.com",
  databaseURL: (metaEnv.VITE_FIREBASE_DATABASE_URL as string) || "https://placeholder-rtdb-default-rtdb.firebaseio.com",
  projectId: (metaEnv.VITE_FIREBASE_PROJECT_ID as string) || "placeholder-project-id",
  storageBucket: (metaEnv.VITE_FIREBASE_STORAGE_BUCKET as string) || "placeholder-storage-bucket.appspot.com",
  messagingSenderId: (metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID as string) || "placeholder-sender-id",
  appId: (metaEnv.VITE_FIREBASE_APP_ID as string) || "placeholder-app-id"
};

// Singleton initialization pattern to prevent duplicate instances
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

export default app;
