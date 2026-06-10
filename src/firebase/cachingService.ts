import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from './config';
import { handleFirestoreError, OperationType } from './errorHandler';

interface GameContent {
  quiz: any[];
  flashcards: any[];
}

/**
 * High-performance, idempotent resource caching loop.
 * Safeguards AI billing caps and completely eliminates delays for duplicate requests.
 * 
 * @param setId The identifying study set reference
 * @returns Cached or newly generated game data content (Quiz items and Flashcards)
 */
export async function obtainGameData(setId: string): Promise<GameContent> {
  const docPath = `study_sets/${setId}`;
  const docRef = doc(db, 'study_sets', setId);

  try {
    // 1. Check if resource is pre-existing in Firestore Cache
    console.log(`[Caching Engine] Checking for cached sets at Firestore path: ${docPath}`);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      
      // Cache match detected
      if (data.generated_content && Array.isArray(data.generated_content.quiz) && data.generated_content.quiz.length > 0) {
        console.log(`[Caching Engine] CACHE HIT! Retreiving structures instantly from Firestore for: ${setId}`);
        return data.generated_content as GameContent;
      }
    }

    // 2. Cache Miss - Call secure backend Cloud Function to process AI prompt
    console.log(`[Caching Engine] CACHE MISS. Elevating requests to Cloud Function AI Brain Bridge...`);
    
    // Acquire active JWT authentication token
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Authenticating context required to request dynamic Cloud Function execution.");
    }
    const token = await currentUser.getIdToken();

    // Call Cloud Function API route
    // Fallback URL points either to standard local development emulator port or production URL
    const functionUrl = import.meta.env.VITE_GENERATION_FUNCTION_URL 
      || "https://generategamedata-7ssdbqqk5hdnf.a.run.app"; // Default target

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ setId })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `AI Cloud Gateway responded with Status: ${response.status}`);
    }

    const payload = await response.json();
    console.log(`[Caching Engine] AI pipeline generation finished and logged successfully for: ${setId}`);
    return payload.generated_content as GameContent;

  } catch (error) {
    handleFirestoreError(error, OperationType.GET, docPath);
  }
}
