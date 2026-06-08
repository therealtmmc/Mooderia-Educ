import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { handleFirestoreError, OperationType } from './errorHandler';

/**
 * Ensures the student exists in Firestore. If it's their first time logging on,
 * automatically registers their gamification profile with 0 XP and a 1-day streak.
 */
export async function initializeUserProfile(user: FirebaseUser): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;
  
  try {
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // First-time sign-in profile creation layout
      const initialProfile = {
        uid: user.uid,
        username: user.displayName || user.email?.split('@')[0] || "New Cadet",
        email: user.email || "",
        avatar_accent_color: "violet",
        total_xp: 0,
        current_streak: 1,
        level_title: "Scribble Novice",
        created_at: serverTimestamp() // Enforced by security rules using server-authoritative request.time
      };

      await setDoc(userRef, initialProfile);
      console.log(`[Mooderia Auth] Initialized level stats for User: ${user.uid}`);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Handle student authentication via Google auth popups
 */
export async function loginWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    await initializeUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.error("[Mooderia Auth] Google Login Violated Protocol:", error);
    throw error;
  }
}

/**
 * Handshake user registration via standard email and password
 */
export async function signUpWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await initializeUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.error("[Mooderia Auth] Email-Sign Up Violated Protocol:", error);
    throw error;
  }
}

/**
 * Standard password key authentication
 */
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await initializeUserProfile(result.user);
    return result.user;
  } catch (error: any) {
    console.error("[Mooderia Auth] Login Validation Error:", error);
    throw error;
  }
}

/**
 * Log out student and flush auth state
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
    console.log("[Mooderia Auth] Closed student session cabinet.");
  } catch (error: any) {
    console.error("[Mooderia Auth] Session closure failed:", error);
    throw error;
  }
}
