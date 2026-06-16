import type { StoryState } from '../systems/conditions'
import { SAVES_STORE, idbGet, idbPut } from './idb'

/**
 * One save slot in IndexedDB. The save is just the serialisable story state; the
 * per-frame world (cube position, etc.) is reconstructed by re-mounting the
 * scene on load. Versioned so old/incompatible saves are ignored.
 */
interface SaveBlob {
  version: number
  state: StoryState
}

const SLOT = 'slot0'
const VERSION = 1

export async function saveGame(state: StoryState): Promise<void> {
  // Only the plain story fields: a store's getState() also carries action
  // functions, which IndexedDB's structured clone cannot serialise.
  const snapshot: StoryState = {
    currentScene: state.currentScene,
    flags: state.flags,
    inventory: state.inventory,
    visited: state.visited,
    selectedItem: state.selectedItem,
    npcScene: state.npcScene,
    npcNode: state.npcNode,
  }
  await idbPut(SAVES_STORE, SLOT, { version: VERSION, state: snapshot } satisfies SaveBlob)
}

export async function loadGame(): Promise<StoryState | null> {
  const blob = await idbGet<SaveBlob>(SAVES_STORE, SLOT)
  return blob && blob.version === VERSION ? blob.state : null
}

export async function hasSave(): Promise<boolean> {
  return (await loadGame()) !== null
}
