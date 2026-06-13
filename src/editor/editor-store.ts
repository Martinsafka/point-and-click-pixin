import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type {
  Condition,
  CursorKind,
  Effect,
  GameDoc,
  InteractableData,
  ItemId,
  LayerData,
  LayerFit,
  LayerRole,
  Recipe,
  SceneBand,
  SceneData,
  SceneId,
  UseRule,
} from '../data/schema'
import { gameDoc } from '../data/game'

/**
 * The editor's working copy of the `GameDoc` — a mutable clone of the authored
 * game. The editor edits this; the running game reads its own document. `revision`
 * bumps only on changes the Pixi preview must re-mount for (layers); walkable,
 * hit-areas and interactables are drawn in the DOM overlay, so they don't bump it.
 */
interface EditorStore {
  doc: GameDoc
  selectedSceneId: SceneId
  revision: number
  selectScene(id: SceneId): void
  addScene(): void
  deleteScene(id: SceneId): void
  setDoc(doc: GameDoc): void
  /** Replace a scene's walkable polygon (fractions). No `revision` bump. */
  setWalkable(id: SceneId, polygon: number[]): void
  /** Append an uploaded image as a full-screen background layer (a backdrop). */
  addImageLayer(id: SceneId, src: string): void
  removeLayer(id: SceneId, index: number): void
  moveLayer(id: SceneId, index: number, dir: -1 | 1): void
  setLayerBand(id: SceneId, index: number, band: SceneBand): void
  setLayerFit(id: SceneId, index: number, fit: LayerFit): void
  /** Role is metadata (no visual change), so this doesn't bump `revision`. */
  setLayerRole(id: SceneId, index: number, role: LayerRole | undefined): void
  /** Set an image layer's position (dragged in the preview). No `revision` bump —
   *  the dragged sprite already moved; this only records the fractions. */
  setLayerPos(id: SceneId, index: number, xFrac: number, yFrac: number): void
  // Interactables (M4) — invisible hit areas in the DOM overlay; no `revision` bump.
  addInteractable(id: SceneId, kind: InteractableData['kind']): void
  removeInteractable(id: SceneId, index: number): void
  setHitArea(id: SceneId, index: number, polygon: number[]): void
  setInteractableId(id: SceneId, index: number, value: string): void
  setInteractableItem(id: SceneId, index: number, item: ItemId): void
  setInteractableTo(id: SceneId, index: number, to: SceneId): void
  setInteractableWhen(id: SceneId, index: number, when: Condition | undefined): void
  setInteractableEffects(id: SceneId, index: number, effects: Effect[]): void
  setInteractableUses(id: SceneId, index: number, uses: UseRule[]): void
  // Items + recipes (M4 2b) — document-level data; no `revision` bump.
  addItem(): void
  removeItem(id: ItemId): void
  setItemName(id: ItemId, name: string): void
  addRecipe(): void
  removeRecipe(index: number): void
  setRecipe(index: number, recipe: Recipe): void
  setInteractableExamine(id: SceneId, index: number, examine: string): void
  setInteractableText(id: SceneId, index: number, text: string): void
  setInteractableAudio(id: SceneId, index: number, audio: string | undefined): void
  setItemExamine(id: ItemId, examine: string): void
  setItemIcon(id: ItemId, icon: string | undefined): void
  setCursorIcon(kind: CursorKind, icon: string | undefined): void
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

function uniqueInteractableId(taken: readonly InteractableData[], base: string): string {
  const ids = new Set(taken.map((it) => it.id))
  if (!ids.has(base)) return base
  let n = 2
  while (ids.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

function uniqueItemId(items: GameDoc['items'], base: string): ItemId {
  if (!items[base]) return base
  let n = 2
  while (items[`${base}-${n}`]) n += 1
  return `${base}-${n}`
}

export const editorStore = createStore<EditorStore>((set, get) => {
  /** Replace one scene immutably. `remount` bumps `revision` so the preview
   *  re-mounts (needed when the change is visual in the Pixi canvas). */
  const patchScene = (id: SceneId, patch: Partial<SceneData>, remount: boolean) => {
    const { doc, revision } = get()
    const scene = doc.scenes[id]
    set({
      doc: { ...doc, scenes: { ...doc.scenes, [id]: { ...scene, ...patch } } },
      ...(remount ? { revision: revision + 1 } : {}),
    })
  }
  const mapLayers = (id: SceneId, fn: (layers: LayerData[]) => LayerData[], remount = true) =>
    patchScene(id, { layers: fn(get().doc.scenes[id].layers) }, remount)
  const mapInteractables = (id: SceneId, fn: (its: InteractableData[]) => InteractableData[]) =>
    patchScene(id, { interactables: fn(get().doc.scenes[id].interactables) }, false)
  // Document-level patch (items / recipes); never touches the Pixi preview.
  const patchDoc = (patch: Partial<GameDoc>) => set({ doc: { ...get().doc, ...patch } })

  return {
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
    setWalkable: (id, polygon) => patchScene(id, { walkable: polygon }, false),
    addImageLayer: (id, src) =>
      mapLayers(id, (ls) => [...ls, { kind: 'image', band: 'background', src, fit: 'cover' }]),
    removeLayer: (id, index) => mapLayers(id, (ls) => ls.filter((_, i) => i !== index)),
    moveLayer: (id, index, dir) =>
      mapLayers(id, (ls) => {
        const j = index + dir
        if (j < 0 || j >= ls.length) return ls
        const next = [...ls]
        ;[next[index], next[j]] = [next[j], next[index]]
        return next
      }),
    setLayerBand: (id, index, band) =>
      mapLayers(id, (ls) => ls.map((l, i) => (i === index ? { ...l, band } : l))),
    setLayerFit: (id, index, fit) =>
      mapLayers(id, (ls) =>
        ls.map((l, i) => (i === index && l.kind === 'image' ? { ...l, fit } : l)),
      ),
    setLayerRole: (id, index, role) =>
      mapLayers(id, (ls) => ls.map((l, i) => (i === index ? { ...l, role } : l)), false),
    setLayerPos: (id, index, xFrac, yFrac) =>
      mapLayers(
        id,
        (ls) => ls.map((l, i) => (i === index && l.kind === 'image' ? { ...l, xFrac, yFrac } : l)),
        false,
      ),
    addInteractable: (id, kind) => {
      const { doc } = get()
      const scene = doc.scenes[id]
      const newId = uniqueInteractableId(scene.interactables, kind)
      const hitArea = [0.45, 0.45, 0.55, 0.45, 0.55, 0.6, 0.45, 0.6]
      let it: InteractableData
      if (kind === 'pickable') {
        it = { kind, id: newId, item: Object.keys(doc.items)[0] ?? '', hitArea }
      } else if (kind === 'exit') {
        it = { kind, id: newId, to: Object.keys(doc.scenes).find((s) => s !== id) ?? id, hitArea }
      } else if (kind === 'inspect') {
        it = { kind, id: newId, hitArea, text: '' }
      } else {
        it = { kind, id: newId, hitArea, effects: [] }
      }
      mapInteractables(id, (its) => [...its, it])
    },
    removeInteractable: (id, index) =>
      mapInteractables(id, (its) => its.filter((_, i) => i !== index)),
    setHitArea: (id, index, polygon) =>
      mapInteractables(id, (its) =>
        its.map((it, i) => (i === index ? { ...it, hitArea: polygon } : it)),
      ),
    setInteractableId: (id, index, value) =>
      mapInteractables(id, (its) => its.map((it, i) => (i === index ? { ...it, id: value } : it))),
    setInteractableItem: (id, index, item) =>
      mapInteractables(id, (its) =>
        its.map((it, i) => (i === index && it.kind === 'pickable' ? { ...it, item } : it)),
      ),
    setInteractableTo: (id, index, to) =>
      mapInteractables(id, (its) =>
        its.map((it, i) => (i === index && it.kind === 'exit' ? { ...it, to } : it)),
      ),
    setInteractableWhen: (id, index, when) =>
      mapInteractables(id, (its) => its.map((it, i) => (i === index ? { ...it, when } : it))),
    setInteractableEffects: (id, index, effects) =>
      mapInteractables(id, (its) => its.map((it, i) => (i === index ? { ...it, effects } : it))),
    setInteractableUses: (id, index, uses) =>
      mapInteractables(id, (its) =>
        its.map((it, i) => (i === index && it.kind !== 'pickable' ? { ...it, uses } : it)),
      ),
    addItem: () => {
      const { items } = get().doc
      const id = uniqueItemId(items, 'item')
      patchDoc({ items: { ...items, [id]: { id, name: 'New item' } } })
    },
    removeItem: (id) => {
      const items = { ...get().doc.items }
      delete items[id]
      patchDoc({ items })
    },
    setItemName: (id, name) => {
      const { items } = get().doc
      patchDoc({ items: { ...items, [id]: { ...items[id], name } } })
    },
    addRecipe: () => {
      const { items, recipes } = get().doc
      const first = Object.keys(items)[0] ?? ''
      patchDoc({ recipes: [...(recipes ?? []), { a: first, b: first, output: first }] })
    },
    removeRecipe: (index) =>
      patchDoc({ recipes: (get().doc.recipes ?? []).filter((_, i) => i !== index) }),
    setRecipe: (index, recipe) =>
      patchDoc({ recipes: (get().doc.recipes ?? []).map((r, i) => (i === index ? recipe : r)) }),
    setInteractableExamine: (id, index, examine) =>
      mapInteractables(id, (its) => its.map((it, i) => (i === index ? { ...it, examine } : it))),
    setInteractableText: (id, index, text) =>
      mapInteractables(id, (its) =>
        its.map((it, i) => (i === index && it.kind === 'inspect' ? { ...it, text } : it)),
      ),
    setInteractableAudio: (id, index, audio) =>
      mapInteractables(id, (its) =>
        its.map((it, i) => (i === index && it.kind === 'inspect' ? { ...it, audio } : it)),
      ),
    setItemExamine: (id, examine) => {
      const { items } = get().doc
      patchDoc({ items: { ...items, [id]: { ...items[id], examine } } })
    },
    setItemIcon: (id, icon) => {
      const { items } = get().doc
      patchDoc({ items: { ...items, [id]: { ...items[id], icon } } })
    },
    setCursorIcon: (kind, icon) => patchDoc({ cursors: { ...get().doc.cursors, [kind]: icon } }),
  }
})

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
