'use client';

/**
 * Persist FileSystemFileHandle and FileSystemDirectoryHandle in IndexedDB
 * so we can re-open the same file on page reload (if the user grants permission).
 */

const DB_NAME = 'mdcomments';
const STORE_NAME = 'fileHandles';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function storeFileHandles(
  filePath: string,
  fileHandle: FileSystemFileHandle,
  dirHandle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put({ fileHandle, dirHandle, filePath }, 'current');
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getStoredFileHandles(): Promise<{
  fileHandle: FileSystemFileHandle;
  dirHandle: FileSystemDirectoryHandle;
  filePath: string;
} | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get('current');
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearStoredFileHandles(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete('current');
  } catch {
    // ignore
  }
}

/**
 * Verify we still have permission to read/write the stored handles.
 * Returns true if permission is granted, false otherwise.
 */
export async function verifyPermission(
  fileHandle: FileSystemFileHandle,
  dirHandle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // queryPermission/requestPermission are part of the File System Access API
    // but not yet in all TypeScript lib types
    const fh = fileHandle as any;
    const dh = dirHandle as any;
    const opts = { mode: 'readwrite' };

    if ((await fh.queryPermission(opts)) === 'granted') {
      if ((await dh.queryPermission(opts)) === 'granted') {
        return true;
      }
      return (await dh.requestPermission(opts)) === 'granted';
    }
    if ((await fh.requestPermission(opts)) === 'granted') {
      if ((await dh.requestPermission(opts)) === 'granted') {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
