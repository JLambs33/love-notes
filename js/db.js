const DB_NAME = 'love-notes';
const DB_VERSION = 1;

let _db;

function open() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('preferences')) {
        const s = db.createObjectStore('preferences', { keyPath: 'id' });
        s.createIndex('category', 'category');
        s.createIndex('sentiment', 'sentiment');
      }
      if (!db.objectStoreNames.contains('notes')) {
        const s = db.createObjectStore('notes', { keyPath: 'id' });
        s.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains('dates')) {
        const s = db.createObjectStore('dates', { keyPath: 'id' });
        s.createIndex('date', 'date');
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    t.oncomplete = () => resolve(req?.result);
    t.onerror = () => reject(t.error);
  }));
}

function getAll(store) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, 'readonly');
    const req = t.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }));
}

function uid() {
  return crypto.randomUUID();
}

// Profile (single record, id='main')
export async function getProfile() {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction('profile', 'readonly');
    const req = t.objectStore('profile').get('main');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  }));
}

export function saveProfile(data) {
  return tx('profile', 'readwrite', s => s.put({ ...data, id: 'main' }));
}

// Preferences
export function getPreferences(category) {
  if (category) {
    return open().then(db => new Promise((resolve, reject) => {
      const t = db.transaction('preferences', 'readonly');
      const req = t.objectStore('preferences').index('category').getAll(category);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }));
  }
  return getAll('preferences');
}

export function addPreference(data) {
  const record = { id: uid(), createdAt: Date.now(), ...data };
  return tx('preferences', 'readwrite', s => s.add(record)).then(() => record);
}

export function updatePreference(id, data) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction('preferences', 'readwrite');
    const store = t.objectStore('preferences');
    const req = store.get(id);
    req.onsuccess = () => {
      store.put({ ...req.result, ...data, id });
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

export function deletePreference(id) {
  return tx('preferences', 'readwrite', s => s.delete(id));
}

// Notes
export function getNotes() {
  return getAll('notes').then(notes =>
    notes.sort((a, b) => b.createdAt - a.createdAt)
  );
}

export function addNote(data) {
  const now = Date.now();
  const record = { id: uid(), createdAt: now, updatedAt: now, tags: [], ...data };
  return tx('notes', 'readwrite', s => s.add(record)).then(() => record);
}

export function updateNote(id, data) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction('notes', 'readwrite');
    const store = t.objectStore('notes');
    const req = store.get(id);
    req.onsuccess = () => {
      store.put({ ...req.result, ...data, id, updatedAt: Date.now() });
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

export function deleteNote(id) {
  return tx('notes', 'readwrite', s => s.delete(id));
}

// Dates
export function getDates() {
  return getAll('dates');
}

export function addDate(data) {
  const record = { id: uid(), createdAt: Date.now(), recurring: true, leadTimeDays: 14, ...data };
  return tx('dates', 'readwrite', s => s.add(record)).then(() => record);
}

export function updateDate(id, data) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction('dates', 'readwrite');
    const store = t.objectStore('dates');
    const req = store.get(id);
    req.onsuccess = () => {
      store.put({ ...req.result, ...data, id });
    };
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  }));
}

export function deleteDate(id) {
  return tx('dates', 'readwrite', s => s.delete(id));
}

// Export / Import
export async function exportAll() {
  const [profile, preferences, notes, dates] = await Promise.all([
    getProfile(),
    getAll('preferences'),
    getAll('notes'),
    getAll('dates'),
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), profile, preferences, notes, dates };
}

export async function importAll(data) {
  const db = await open();
  const stores = ['profile', 'preferences', 'notes', 'dates'];
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, 'readwrite');
    stores.forEach(name => t.objectStore(name).clear());
    if (data.profile) t.objectStore('profile').put({ ...data.profile, id: 'main' });
    (data.preferences || []).forEach(p => t.objectStore('preferences').put(p));
    (data.notes || []).forEach(n => t.objectStore('notes').put(n));
    (data.dates || []).forEach(d => t.objectStore('dates').put(d));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

export async function clearAll() {
  const db = await open();
  const stores = ['profile', 'preferences', 'notes', 'dates'];
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, 'readwrite');
    stores.forEach(name => t.objectStore(name).clear());
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}
