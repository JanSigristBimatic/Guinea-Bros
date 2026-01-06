const DB_NAME = 'GuineaBrosTD'
const DB_VERSION = 1
const STORE_NAME = 'gameData'

let db = null
let dbPromise = null

function openDB() {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      console.error('IndexedDB open error:', request.error)
      reject(request.error)
    }

    request.onsuccess = () => {
      db = request.result
      resolve(db)
    }

    request.onupgradeneeded = (event) => {
      const database = event.target.result
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
  })

  return dbPromise
}

export async function saveToIndexedDB(key, value) {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put({ key, value, updatedAt: Date.now() })

      request.onsuccess = () => resolve(true)
      request.onerror = () => {
        console.error('IndexedDB save error:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Failed to save to IndexedDB:', error)
    return false
  }
}

export async function loadFromIndexedDB(key) {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(key)

      request.onsuccess = () => {
        resolve(request.result?.value ?? null)
      }
      request.onerror = () => {
        console.error('IndexedDB load error:', request.error)
        reject(request.error)
      }
    })
  } catch (error) {
    console.error('Failed to load from IndexedDB:', error)
    return null
  }
}

export async function deleteFromIndexedDB(key) {
  try {
    const database = await openDB()
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.delete(key)

      request.onsuccess = () => resolve(true)
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('Failed to delete from IndexedDB:', error)
    return false
  }
}

export async function migrateFromLocalStorage(localStorageKey, indexedDBKey) {
  try {
    const existing = await loadFromIndexedDB(indexedDBKey)
    if (existing !== null) return false

    const localData = localStorage.getItem(localStorageKey)
    if (!localData) return false

    const parsed = JSON.parse(localData)
    await saveToIndexedDB(indexedDBKey, parsed)
    localStorage.removeItem(localStorageKey)
    console.log(`Migrated ${localStorageKey} to IndexedDB`)
    return true
  } catch (error) {
    console.error('Migration failed:', error)
    return false
  }
}

export const STORAGE_KEYS = {
  SKILLS: 'skills',
  META: 'meta'
}
