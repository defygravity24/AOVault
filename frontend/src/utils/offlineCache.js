// Offline cache using IndexedDB — stores fic content on device for offline reading

const DB_NAME = 'aovault-offline'
const DB_VERSION = 1
const STORE_NAME = 'fic-content'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Save fic content to device
export async function cacheFicContent(ficId, data) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ id: ficId, ...data, cachedAt: Date.now() })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Get cached fic content from device
export async function getCachedContent(ficId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(ficId)
    request.onsuccess = () => resolve(request.result || null)
    request.onerror = () => reject(request.error)
  })
}

// Remove cached content
export async function removeCachedContent(ficId) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(ficId)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Check if a fic is cached
export async function isCached(ficId) {
  const content = await getCachedContent(ficId)
  return !!content
}

// Get all cached fic IDs
export async function getAllCachedIds() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAllKeys()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// Cache fic metadata (for offline library view)
export function cacheFicMeta(fics) {
  try {
    localStorage.setItem('aovault_fics_cache', JSON.stringify(fics))
    localStorage.setItem('aovault_fics_cache_time', Date.now().toString())
  } catch { /* localStorage full — non-critical */ }
}

// Get cached fic metadata
export function getCachedFicMeta() {
  try {
    const data = localStorage.getItem('aovault_fics_cache')
    return data ? JSON.parse(data) : null
  } catch { return null }
}
