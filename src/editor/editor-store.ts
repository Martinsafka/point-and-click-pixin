import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type { GameDoc, SceneData, SceneId } from '../data/schema'
import { gameDoc } from '../data/game'

/**
 * The editor's working copy of the `GameDoc` — a mutable clone of the authored
 * game. The editor edits this; the running game still uses the const `gameDoc`.
 * `revision` bumps on every structural change so the live preview re-mounts.
 */
interface EditorStore {
  doc: GameDoc
  selectedSceneId: SceneId
  revision: number
  selectScene(id: SceneId): void
  addScene(): void
  deleteScene(id: SceneId): void
  setDoc(doc: GameDoc): void
  /** Replace a scene's walkable polygon (fractions). Doesn't bump `revision`, so
   *  the live preview isn't re-mounted while drawing. */
  setWalkable(id: SceneId, polygon: number[]): void
}

function blankScene(id: SceneId): SceneData {
  return {
    id,
    name: 'New scene',
    layers: [],
    walkable: [0.2, 0.7, 0.8, 0.7, 0.8, 0.95, 0.2, 0.95],
    interactables: [],
    depth: { yNearFrac: 0.95, yFarFrac: 0.6, scaleNear: 1, scaleFar: 0.7 },
    spawn: { xFrac: 0.5, yFrac: 0.85 },
  }
}

function uniqueSceneId(doc: GameDoc, base: string): SceneId {
  if (!doc.scenes[base]) return base
  let n = 2
  while (doc.scenes[`${base}-${n}`]) n += 1
  return `${base}-${n}`
}

export const editorStore = createStore<EditorStore>((set, get) => ({
  doc: structuredClone(gameDoc),
  selectedSceneId: gameDoc.start,
  revision: 0,
  selectScene: (id) => set({ selectedSceneId: id }),
  addScene: () => {
    const { doc, revision } = get()
    const id = uniqueSceneId(doc, 'scene')
    set({
      doc: { ...doc, scenes: { ...doc.scenes, [id]: blankScene(id) } },
      selectedSceneId: id,
      revision: revision + 1,
    })
  },
  deleteScene: (id) => {
    const { doc, selectedSceneId, revision } = get()
    if (Object.keys(doc.scenes).length <= 1) return
    const scenes = { ...doc.scenes }
    delete scenes[id]
    const remaining = Object.keys(scenes)
    set({
      doc: { ...doc, scenes, start: doc.start === id ? remaining[0] : doc.start },
      selectedSceneId: selectedSceneId === id ? remaining[0] : selectedSceneId,
      revision: revision + 1,
    })
  },
  setDoc: (doc) => set({ doc, selectedSceneId: doc.start, revision: get().revision + 1 }),
  setWalkable: (id, polygon) => {
    const { doc } = get()
    const scene = doc.scenes[id]
    set({ doc: { ...doc, scenes: { ...doc.scenes, [id]: { ...scene, walkable: polygon } } } })
  },
}))

export function useEditor<T>(selector: (state: EditorStore) => T): T {
  return useStore(editorStore, selector)
}

/** Download the working document as JSON. */
export function exportDoc(): void {
  const { doc } = editorStore.getState()
  const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'game.json'
  a.click()
  URL.revokeObjectURL(url)
}

/** Load a document from a JSON file (basic validity check). */
export async function importDocFromFile(file: File): Promise<void> {
  const doc = JSON.parse(await file.text()) as GameDoc
  if (doc && doc.scenes && doc.start && doc.scenes[doc.start]) {
    editorStore.getState().setDoc(doc)
  }
}
