import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, storage } from './config';
import { handleFirestoreError, OperationType } from './errorHandler';

interface StudySetPlaceholder {
  set_id: string;
  owner_id: string;
  title: string;
  source_file_type: string;
  source_storage_url: string;
  extracted_plain_text: string;
  generated_content?: {
    quiz: any[];
    flashcards: any[];
  } | null;
}

/**
 * Uploads a physical file (notes, PPTs, lectures, audio, video) to the Cloud Storage vault 
 * and stores a reference document inside the `/study_sets` collection.
 * 
 * @param file The file object captured from input element or drag-and-drop zone
 * @returns Fully populated Study Set placeholder metadata
 */
export async function uploadAcademicMaterial(file: File): Promise<StudySetPlaceholder> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Student authentication session is mandatory for file processing.");
  }

  // Generate clean, readable identifiers
  const uid = currentUser.uid;
  const timestamp = Date.now();
  const fileExtension = file.name.split('.').pop() || 'unknown';
  const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const uniqueStorageName = `${timestamp}_${cleanFileName}`;

  // 1. Point Reference path: files/{uid}/{uniqueName}
  const storagePath = `files/${uid}/${uniqueStorageName}`;
  const fileRef = ref(storage, storagePath);

  console.log(`[Mooderia Storage] Uploading ${file.name} to Cloud Storage branch: ${storagePath}`);
  
  // Upload raw blob bytes to cloud bucket
  const snapshot = await uploadBytes(fileRef, file);
  const downloadUrl = await getDownloadURL(snapshot.ref);

  // 2. Form study set ID and create reference placeholder document instantiating the plain text extraction
  const setId = `set_${uid}_${timestamp}`;
  const docPath = `study_sets/${setId}`;

  const placeholder: StudySetPlaceholder = {
    set_id: setId,
    owner_id: uid,
    title: file.name,
    source_file_type: fileExtension.toLowerCase(),
    source_storage_url: downloadUrl,
    extracted_plain_text: `[PENDING AI EXTRACTION] Extracted plain text content for analytical document: "${file.name}". Source link attached securely at: ${downloadUrl}`,
    generated_content: null // Empty state triggering Centralized Cloud Function execution
  };

  try {
    const docRef = doc(db, 'study_sets', setId);
    await setDoc(docRef, placeholder);
    console.log(`[Mooderia Storage] Material logged and locked at Firestore Document path: ${docPath}`);
    return placeholder;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, docPath);
  }
}
