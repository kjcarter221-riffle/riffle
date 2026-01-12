'use client';

// IndexedDB wrapper for offline journal entries

const DB_NAME = 'riffle-offline';
const DB_VERSION = 1;
const STORE_PENDING = 'pending-entries';
const STORE_CACHED = 'cached-entries';

let db = null;

export async function initDB() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Store for pending entries (created offline)
      if (!database.objectStoreNames.contains(STORE_PENDING)) {
        const pendingStore = database.createObjectStore(STORE_PENDING, {
          keyPath: 'localId',
          autoIncrement: true
        });
        pendingStore.createIndex('created_at', 'created_at');
      }

      // Store for cached entries (synced from server)
      if (!database.objectStoreNames.contains(STORE_CACHED)) {
        const cachedStore = database.createObjectStore(STORE_CACHED, {
          keyPath: 'id'
        });
        cachedStore.createIndex('trip_date', 'trip_date');
      }
    };
  });
}

// Add a pending entry (created while offline)
export async function addPendingEntry(entry) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PENDING, 'readwrite');
    const store = tx.objectStore(STORE_PENDING);

    const entryWithMeta = {
      ...entry,
      created_at: new Date().toISOString(),
      synced: false
    };

    const request = store.add(entryWithMeta);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Get all pending entries
export async function getPendingEntries() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PENDING, 'readonly');
    const store = tx.objectStore(STORE_PENDING);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Remove a pending entry after successful sync
export async function removePendingEntry(localId) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_PENDING, 'readwrite');
    const store = tx.objectStore(STORE_PENDING);
    const request = store.delete(localId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Cache entries from server
export async function cacheEntries(entries) {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_CACHED, 'readwrite');
    const store = tx.objectStore(STORE_CACHED);

    // Clear existing cached entries and add new ones
    store.clear();
    entries.forEach(entry => store.add(entry));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Get cached entries
export async function getCachedEntries() {
  const database = await initDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_CACHED, 'readonly');
    const store = tx.objectStore(STORE_CACHED);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Sync pending entries to server
export async function syncPendingEntries() {
  const pending = await getPendingEntries();
  const synced = [];
  const failed = [];

  for (const entry of pending) {
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });

      if (res.ok) {
        await removePendingEntry(entry.localId);
        synced.push(entry);
      } else {
        const data = await res.json();
        failed.push({ entry, error: data.error });
      }
    } catch (err) {
      failed.push({ entry, error: 'Network error' });
    }
  }

  return { synced, failed };
}

// Check if online
export function isOnline() {
  return typeof navigator !== 'undefined' && navigator.onLine;
}

// Get pending count
export async function getPendingCount() {
  const pending = await getPendingEntries();
  return pending.length;
}
