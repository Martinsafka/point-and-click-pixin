/**
 * One IndexedDB database for the app, with two object stores:
 *   - `saves`  — the player's save slot(s) (see storage.ts).
 *   - `draft`  — the editor's working `GameDoc` (see data/doc-draft.ts).
 *
 * IndexedDB (not localStorage) because a `GameDoc` embeds uploaded art as data-URLs,
 * which quickly blows past localStorage's ~5 MB string quota. IndexedDB's quota is
 * disk-based (typically hundreds of MB to GBs) — see `estimateStorage`.
 */
const DB_NAME = 'point-and-click-pixin'
// v2 added the `draft` store. Bumping is back-compatible — existing `saves` are kept
// (createObjectStore is guarded), so a player's save survives the upgrade.
const DB_VERSION = 2

export const SAVES_STORE = 'saves'
export const DRAFT_STORE = 'draft'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(SAVES_STORE)) db.createObjectStore(SAVES_STORE)
      if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Read one value by key from a store (undefined if absent). */
export async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(store, 'readonly')
      const request = tx.objectStore(store).get(key)
      request.onsuccess = () => resolve(request.result as T | undefined)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

/** Write one value by key into a store. */
export async function idbPut(store: string, key: string, value: unknown): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).put(value, key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/** Delete one key from a store. */
export async function idbDelete(store: string, key: string): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite')
      tx.objectStore(store).delete(key)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

/**
 * The origin's storage budget + current use (bytes), via the Storage API. The `quota`
 * is what IndexedDB (sharing the budget with caches) may use — dynamic, disk-based:
 * usually hundreds of MB to several GB. Returns null where unsupported.
 */
export async function estimateStorage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}
