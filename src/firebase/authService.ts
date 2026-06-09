import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendEmailVerification,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { handleFirestoreError, OperationType } from './errorHandler';

/**
 * Checks in Firestore whether a user document already exists at `/users/{uid}`.
 */
export async function checkUserDocExists(uid: string): Promise<boolean> {
  const userRef = doc(db, 'users', uid);
  const path = `users/${uid}`;
  try {
    const userSnap = await getDoc(userRef);
    return userSnap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Handles student authentication via Google Auth popups.
 */
export async function loginWithGoogle(): Promise<FirebaseUser> {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("[Mooderia Auth] Google Login Error:", error);
    throw error;
  }
}

/**
 * Creates user with Email & Password and immediately handles sending email verification.
 */
export async function signUpWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    if (result.user) {
      await sendEmailVerification(result.user);
      console.log(`[Mooderia Auth] Verification email dispatched to: ${email}`);
    }
    return result.user;
  } catch (error: any) {
    console.error("[Mooderia Auth] Email Registration Error:", error);
    throw error;
  }
}

/**
 * Normal Email/Password authenticating.
 */
export async function signInWithEmail(email: string, password: string): Promise<FirebaseUser> {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error: any) {
    console.error("[Mooderia Auth] Login Validation Error:", error);
    throw error;
  }
}

/**
 * Handshakes the profile initialization metadata on first setup.
 */
export async function initializeStudentProfileInDb(
  user: FirebaseUser,
  profileData: {
    firstName: string;
    lastName: string;
    university: string;
    year: string;
    theme: string;
    avatar_emoji: string;
  }
): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;
  const todayStr = new Date().toISOString().split('T')[0];

  try {
    const freshProfile = {
      uid: user.uid,
      first_name: profileData.firstName.trim(),
      last_name: profileData.lastName.trim(),
      email: user.email || "",
      university: profileData.university.trim(),
      year: profileData.year,
      theme: profileData.theme,
      avatar_emoji: profileData.avatar_emoji,
      total_xp: 0,
      current_streak: 1,
      level_title: "Scribble Novice",
      last_active: todayStr,
      created_at: serverTimestamp() // Set server-authoritative timestamp for security rules match
    };

    await setDoc(userRef, freshProfile);
    console.log(`[Mooderia Auth] Set user document inside Firestore: ${user.uid}`);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Standard signOut flush.
 */
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
    console.log("[Mooderia Auth] Session closed successfully.");
  } catch (error: any) {
    console.error("[Mooderia Auth] Signout error:", error);
    throw error;
  }
}
