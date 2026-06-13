import type { StoryState } from '../systems/conditions'

/**
 * One save slot in IndexedDB. The save is just the serialisable story state; the
 * per-frame world (cube position, etc.) is reconstructed by re-mounting the
 * scene on load. Versioned so old/incompatible saves are ignored.
 */
interface SaveBlob {
  version: number
  state: StoryState
}

const DB_NAME = 'point-and-click-pixin'
const STORE = 'saves'
const SLOT = 'slot0'
const VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveGame(state: StoryState): Promise<void> {
  // Only the plain story fields: a store's getState() also carries action
  // functions, which IndexedDB's structured clone cannot serialise.
  const snapshot: StoryState = {
    currentScene: state.currentScene,
    flags: state.flags,
    inventory: state.inventory,
    visited: state.visited,
    selectedItem: state.selectedItem,
  }
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put({ version: VERSION, state: snapshot } satisfies SaveBlob, SLOT)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export async function loadGame(): Promise<StoryState | null> {
  const db = await openDb()
  try {
    const blob = await new Promise<SaveBlob | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const request = tx.objectStore(STORE).get(SLOT)
      request.onsuccess = () => resolve(request.result as SaveBlob | undefined)
      request.onerror = () => reject(request.error)
    })
    return blob && blob.version === VERSION ? blob.state : null
  } finally {
    db.close()
  }
}

export async function hasSave(): Promise<boolean> {
  return (await loadGame()) !== null
}
