// Keep complete documents (including cutout PNGs) out of localStorage's small quota.
const openLibrary = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open('yepaper-library-v2', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('library');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export async function readLibrary<T>(): Promise<T | undefined> {
  const db = await openLibrary();
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const request = db.transaction('library').objectStore('library').get('current');
      request.onsuccess = () => resolve(request.result as T | undefined);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

// Serialize saves so an older automatic save cannot overwrite a manual save.
let pending: Promise<void> = Promise.resolve();
export function writeLibrary<T>(value: T): Promise<void> {
  const snapshot = structuredClone(value);
  const task = pending
    .catch(() => {})
    .then(async () => {
      const db = await openLibrary();
      try {
        await new Promise<void>((resolve, reject) => {
          const transaction = db.transaction('library', 'readwrite');
          transaction.objectStore('library').put(snapshot, 'current');
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        db.close();
      }
    });
  pending = task;
  return task;
}
