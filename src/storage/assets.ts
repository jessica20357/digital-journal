function openJournalMusicDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('journal-background-music-v1', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('tracks'))
        request.result.createObjectStore('tracks');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开音乐存储'));
  });
}

export async function saveJournalMusic(bookId: string, file: Blob): Promise<void> {
  const db = await openJournalMusicDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('tracks', 'readwrite');
    transaction.objectStore('tracks').put(file, bookId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('音乐保存失败'));
    transaction.onabort = () => reject(transaction.error || new Error('音乐保存失败'));
  }).finally(() => db.close());
}

export async function loadJournalMusic(bookId: string): Promise<Blob | null> {
  const db = await openJournalMusicDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction('tracks', 'readonly').objectStore('tracks').get(bookId);
    request.onsuccess = () => {
      const value = request.result;
      db.close();
      resolve(value instanceof Blob ? value : null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error('音乐读取失败'));
    };
  });
}

export async function deleteJournalMusic(bookId: string): Promise<void> {
  const db = await openJournalMusicDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('tracks', 'readwrite');
    transaction.objectStore('tracks').delete(bookId);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('音乐删除失败'));
    transaction.onabort = () => reject(transaction.error || new Error('音乐删除失败'));
  }).finally(() => db.close());
}

function openJournalImageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('journal-image-assets-v1', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('images'))
        request.result.createObjectStore('images');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('无法打开图片存储'));
  });
}

export async function saveJournalImage(id: string, file: Blob): Promise<void> {
  const db = await openJournalImageDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('images', 'readwrite');
    transaction.objectStore('images').put(file, id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error('图片保存失败'));
    transaction.onabort = () => reject(transaction.error || new Error('图片保存失败'));
  }).finally(() => db.close());
}

export async function loadJournalImage(id: string): Promise<Blob | null> {
  const db = await openJournalImageDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction('images', 'readonly').objectStore('images').get(id);
    request.onsuccess = () => {
      const value = request.result;
      db.close();
      resolve(value instanceof Blob ? value : null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error || new Error('图片读取失败'));
    };
  });
}
