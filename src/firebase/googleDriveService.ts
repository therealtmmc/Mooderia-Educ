import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from './config';

// In-memory cache for OAuth access token (per SKILL.md recommendation)
let cachedAccessToken: string | null = null;
let savedDriveFolderId: string | null = null;

// Initialize auth state listener to clear the token on logout
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
    savedDriveFolderId = null;
  }
});

/**
 * Returns the currently cached Google Drive access token, if any.
 */
export function getCachedDriveToken(): string | null {
  return cachedAccessToken;
}

/**
 * Manually set the cached Google Drive access token.
 */
export function setCachedDriveToken(token: string | null) {
  cachedAccessToken = token;
}

/**
 * Requests the user to authorize/connect Google Drive.
 * This will trigger a popup and require user confirmation of the scope.
 */
export async function connectGoogleDrive(): Promise<string> {
  const provider = new GoogleAuthProvider();
  // Request files permission
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to extract Google access token from credentials.');
    }
    
    cachedAccessToken = credential.accessToken;
    console.log('[Mooderia Drive] Successfully connected Google Drive and cached access token.');
    return cachedAccessToken;
  } catch (error) {
    console.error('[Mooderia Drive] OAuth/Popup flow error:', error);
    throw error;
  }
}

/**
 * Checks if the "Mooderia Academic Engine" folder exists in the user's Google Drive.
 * If not, it creates it and returns its unique Folder ID.
 */
export async function getOrCreateDriveFolder(accessToken: string): Promise<string> {
  if (savedDriveFolderId) {
    return savedDriveFolderId;
  }

  try {
    // 1. Search for existing folder
    const query = encodeURIComponent("name = 'Mooderia Academic Engine' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id)`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        savedDriveFolderId = data.files[0].id;
        console.log('[Mooderia Drive] Found existing parent folder:', savedDriveFolderId);
        return savedDriveFolderId!;
      }
    }

    // 2. Create a new folder if not found
    console.log('[Mooderia Drive] Creating new "Mooderia Academic Engine" main folder...');
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Mooderia Academic Engine',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Automatic backup repository for academic notes, lecture slides, and media compiled in Mooderia.'
      })
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      throw new Error(`Folder creation failed: ${errorText}`);
    }

    const folderData = await createRes.json();
    savedDriveFolderId = folderData.id;
    console.log('[Mooderia Drive] Created brand new folder ID:', savedDriveFolderId);
    return savedDriveFolderId!;
  } catch (error) {
    console.error('[Mooderia Drive] Error resolving parent folder:', error);
    throw error;
  }
}

/**
 * Uploads an athletic file to Google Drive and places it in the Mooderia folder.
 * Returns the webViewLink/viewable URL.
 */
export async function uploadFileToGoogleDrive(file: File, accessToken: string): Promise<{ id: string, webViewLink: string }> {
  try {
    const folderId = await getOrCreateDriveFolder(accessToken);
    
    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    console.log(`[Mooderia Drive] Uploading "${file.name}" to Google Drive...`);
    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        body: formData
      }
    );

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text();
      throw new Error(`Google Drive multipart upload failed: ${errorText}`);
    }

    const fileData = await uploadRes.json();
    console.log('[Mooderia Drive] Upload success!', fileData);
    
    // Construct standard viewer URL fallback or use API link if returned
    const webViewLink = fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view?usp=drivesdk`;

    return {
      id: fileData.id,
      webViewLink
    };
  } catch (err) {
    console.error('[Mooderia Drive] Failed to upload file to Google Drive:', err);
    throw err;
  }
}
