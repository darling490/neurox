// ============================================================
// Storage Module — IndexedDB persistence
// ============================================================

const DB_NAME = 'neurox-db';
const DB_VERSION = 1;

let db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('conversations')) {
        const cs = d.createObjectStore('conversations', { keyPath: 'id' });
        cs.createIndex('updatedAt', 'updatedAt');
      }
      if (!d.objectStoreNames.contains('images')) {
        const is = d.createObjectStore('images', { keyPath: 'id' });
        is.createIndex('createdAt', 'createdAt');
      }
      if (!d.objectStoreNames.contains('settings')) {
        d.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e.target.error);
  });
}

async function getStore(name, mode = 'readonly') {
  const d = await openDB();
  return d.transaction(name, mode).objectStore(name);
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Conversations
export async function saveConversation(conv) {
  const store = await getStore('conversations', 'readwrite');
  return reqToPromise(store.put(conv));
}

export async function getConversation(id) {
  const store = await getStore('conversations');
  return reqToPromise(store.get(id));
}

export async function getAllConversations() {
  const store = await getStore('conversations');
  return reqToPromise(store.getAll());
}

export async function deleteConversation(id) {
  const store = await getStore('conversations', 'readwrite');
  return reqToPromise(store.delete(id));
}

export async function clearConversations() {
  const store = await getStore('conversations', 'readwrite');
  return reqToPromise(store.clear());
}

// Images
export async function saveImage(img) {
  const store = await getStore('images', 'readwrite');
  return reqToPromise(store.put(img));
}

export async function getAllImages() {
  const store = await getStore('images');
  return reqToPromise(store.getAll());
}

export async function deleteImage(id) {
  const store = await getStore('images', 'readwrite');
  return reqToPromise(store.delete(id));
}

export async function clearImages() {
  const store = await getStore('images', 'readwrite');
  return reqToPromise(store.clear());
}

// Settings
export async function setSetting(key, value) {
  const store = await getStore('settings', 'readwrite');
  return reqToPromise(store.put({ key, value }));
}

export async function getSetting(key) {
  const store = await getStore('settings');
  const result = await reqToPromise(store.get(key));
  return result ? result.value : null;
}

// Counts
export async function getConversationCount() {
  const all = await getAllConversations();
  return all.length;
}

export async function getImageCount() {
  const all = await getAllImages();
  return all.length;
}

// Init
export async function initStorage() {
  await openDB();
}
