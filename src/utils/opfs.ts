/**
 * Browser's Origin Private File System (OPFS) helper service.
 * Manages secure local file system operations strictly on the client.
 * Includes a graceful memory/Blob fallback for standard sandboxed iframe environments.
 */

interface SafeFileStore {
  [path: string]: {
    [fileName: string]: Blob;
  };
}

// In-memory fallback if OPFS is not supported or accessible (e.g. sandboxed iframe constraints)
const memoryFileStore: SafeFileStore = {};

/**
 * Checks if OPFS is supported and accessible in the current context.
 */
export async function isOPFSSupported(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage || !navigator.storage.getDirectory) {
      return false;
    }
    // Attempt a quick handle validation
    const root = await navigator.storage.getDirectory();
    return !!root;
  } catch (err) {
    console.warn("[OPFS] Origin Private File System not supported in this frame context, falling back to memory-mapped blobs:", err);
    return false;
  }
}

/**
 * Save a raw binary file to local OPFS (or memory fallback),
 * and instantly return a secure DOM URL pointer for browser media playback.
 * 
 * @param dirPath The folder directory path
 * @param fileName Name of the file with extension
 * @param fileData Raw File or Blob data parameter
 * @returns A safe string representing the local URL pointer
 */
export async function saveFileToOPFS(dirPath: string, fileName: string, fileData: Blob | File): Promise<string> {
  const normalizedPath = dirPath.replace(/^\/+|\/+$/g, '') || 'root';

  if (await isOPFSSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      let dirHandle = root;
      
      if (normalizedPath && normalizedPath !== 'root') {
        const parts = normalizedPath.split('/');
        for (const part of parts) {
          dirHandle = await dirHandle.getDirectoryHandle(part, { create: true });
        }
      }
      
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(fileData);
      await writable.close();
      
      // Obtain File instance to generate instant local Object URL
      const file = await fileHandle.getFile();
      const objectUrl = URL.createObjectURL(file);
      console.log(`[OPFS] File "${fileName}" stored securely in local folder: "${normalizedPath}". Generated URL.`);
      return objectUrl;
    } catch (err) {
      console.error("[OPFS] Error during raw file write, executing fallback:", err);
    }
  }

  // Graceful Memory Blob mapping fallback (standard sandboxed iframe architecture)
  if (!memoryFileStore[normalizedPath]) {
    memoryFileStore[normalizedPath] = {};
  }
  memoryFileStore[normalizedPath][fileName] = fileData;
  const fallbackUrl = URL.createObjectURL(fileData);
  console.log(`[OPFS Fallback] Saved file "${fileName}" inside temporary memory map. Generated URL:`, fallbackUrl);
  return fallbackUrl;
}

/**
 * Create a directory or folder structural node in OPFS (or memory fallback).
 */
export async function createDirInOPFS(dirPath: string): Promise<void> {
  const normalizedPath = dirPath.replace(/^\/+|\/+$/g, '') || 'root';

  if (await isOPFSSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      let dirHandle = root;
      const parts = normalizedPath.split('/');
      for (const part of parts) {
        dirHandle = await dirHandle.getDirectoryHandle(part, { create: true });
      }
      console.log(`[OPFS] Directory structure created successfully: "${normalizedPath}"`);
      return;
    } catch (err) {
      console.error("[OPFS] Error creating sub-directory node:", err);
    }
  }

  if (!memoryFileStore[normalizedPath]) {
    memoryFileStore[normalizedPath] = {};
    console.log(`[OPFS Fallback] Inited folder container path inside memory: "${normalizedPath}"`);
  }
}

/**
 * Retrieve a file from local OPFS or memory mapping.
 */
export async function getFileFromOPFS(dirPath: string, fileName: string): Promise<Blob | File | null> {
  const normalizedPath = dirPath.replace(/^\/+|\/+$/g, '') || 'root';

  if (await isOPFSSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      let dirHandle = root;
      
      if (normalizedPath && normalizedPath !== 'root') {
        const parts = normalizedPath.split('/');
        for (const part of parts) {
          dirHandle = await dirHandle.getDirectoryHandle(part, { create: false });
        }
      }
      
      const fileHandle = await dirHandle.getFileHandle(fileName, { create: false });
      return await fileHandle.getFile();
    } catch (err) {
      console.warn(`[OPFS] File "${fileName}" not located at: "${normalizedPath}"`, err);
    }
  }

  const fallbackFile = memoryFileStore[normalizedPath]?.[fileName];
  return fallbackFile || null;
}

/**
 * Delete a file entry located in local directory.
 */
export async function deleteFileFromOPFS(dirPath: string, fileName: string): Promise<void> {
  const normalizedPath = dirPath.replace(/^\/+|\/+$/g, '') || 'root';

  if (await isOPFSSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      let dirHandle = root;
      if (normalizedPath && normalizedPath !== 'root') {
        const parts = normalizedPath.split('/');
        for (const part of parts) {
          dirHandle = await dirHandle.getDirectoryHandle(part, { create: false });
        }
      }
      await dirHandle.removeEntry(fileName);
      console.log(`[OPFS] Purged file "${fileName}" at path "${normalizedPath}"`);
      return;
    } catch (err) {
      console.error("[OPFS] Deletion error:", err);
    }
  }

  if (memoryFileStore[normalizedPath]?.[fileName]) {
    delete memoryFileStore[normalizedPath][fileName];
    console.log(`[OPFS Fallback] Purged file "${fileName}" from memory node: "${normalizedPath}"`);
  }
}

/**
 * Recursively clears the entire root of OPFS and all local memory stores.
 */
export async function clearOPFS(): Promise<void> {
  if (await isOPFSSupported()) {
    try {
      const root = await navigator.storage.getDirectory();
      for await (const name of (root as any).keys()) {
        await root.removeEntry(name, { recursive: true });
      }
      console.log("[OPFS] Full dynamic recursive purge of root folder handle succeeded.");
    } catch (err) {
      console.warn("[OPFS] Native clean-up failed, bypassing to memory-flush: ", err);
    }
  }
  
  // Clear memory fallbacks
  for (const k of Object.keys(memoryFileStore)) {
    delete memoryFileStore[k];
  }
}

