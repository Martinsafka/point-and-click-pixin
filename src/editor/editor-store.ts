import { createStore } from 'zustand/vanilla'
import { useStore } from 'zustand'
import type {
  AmbientLight,
  Condition,
  CursorKind,
  CharacterAppearance,
  ClockConfig,
  DepthStop,
  ColorGrade,
  ExamineLine,
  FogConfig,
  GameRule,
  ItemUse,
  LightningConfig,
  LightSource,
  PlayerLight,
  PointEmitter,
  ScreensConfig,
  Vignette,
  DialogId,
  DialogNode,
  DialogNodeId,
  Effect,
  GameDoc,
  InteractableData,
  ItemId,
  LayerData,
  LayerFit,
  LayerRole,
  NpcDef,
  NpcId,
  NpcPath,
  NpcPlacement,
  Recipe,
  SceneBand,
  SceneData,
  SpawnPoint,
  SceneId,
  SeqStep,
  SequenceId,
  SoundConfig,
  SoundId,
  TransitionConfig,
  UseRule,
  ViewDescriptor,
  WeatherId,
  WeatherPreset,
} from '../data/schema'
import { gameDoc } from '../data/game'
import { placeholderView } from '../entities/placeholder-atlas'

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
  /** Obstacle holes cut out of the walkable (each a polygon of fractions). */
  addHole(id: SceneId): void
  setHole(id: SceneId, index: number, polygon: number[]): void
  removeHole(id: SceneId, index: number): void
  /** Scene width in design px (camera scrolls when wider than the viewport). */
  setSceneWidth(id: SceneId, width: number): void
  /** Per-scene character size multiplier (player + NPCs); re-mounts the preview. */
  setCharacterScale(id: SceneId, scale: number): void
  /** The document's vertical design resolution (px); re-mounts the preview. */
  setReferenceHeight(height: number): void
  /** Per-scene depth curve (scale-by-Y stops); drawn in the panel, no re-mount. */
  setDepthStops(id: SceneId, stops: DepthStop[]): void
  /** Scene-swap transition (wash colour / art / min hold); document-level. */
  setTransition(patch: Partial<TransitionConfig>): void
  /** Append an uploaded image as a full-screen background layer (a backdrop). */
  addImageLayer(id: SceneId, src: string): void
  /** Add an animated (atlas) scene layer (M12.5 #8). */
  addAnimatedLayer(id: SceneId, src: string): void
  /** Patch an animated layer's frame grid / fps (M12.5 #8). */
  setLayerAnim(
    id: SceneId,
    index: number,
    patch: Partial<{
      frameWidth: number
      frameHeight: number
      columns: number
      frames: number
      fps: number
    }>,
  ): void
  removeLayer(id: SceneId, index: number): void
  moveLayer(id: SceneId, index: number, dir: -1 | 1): void
  setLayerBand(id: SceneId, index: number, band: SceneBand): void
  setLayerFit(id: SceneId, index: number, fit: LayerFit): void
  /** Parallax scroll factor for a background / foreground layer. No `revision` bump
   *  (the preview doesn't scroll). */
  setLayerParallax(id: SceneId, index: number, parallax: number): void
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
  setTriggerBy(id: SceneId, index: number, by: 'player' | 'npc' | 'any'): void
  setTriggerOnce(id: SceneId, index: number, once: boolean): void
  setTriggerOn(id: SceneId, index: number, on: 'enter' | 'rest'): void
  setTriggerExitEffects(id: SceneId, index: number, exitEffects: Effect[]): void
  // NPC cast (global) + per-scene placements (M7 step 2b). DOM markers, no re-mount.
  addNpcDef(): void
  removeNpcDef(npcId: NpcId): void
  setNpcDefName(npcId: NpcId, name: string): void
  setNpcDefSpeed(npcId: NpcId, speed: number): void
  /** Merge a partial into a cast NPC's definition (dialog / dialogWhen / inspect / …). */
  patchNpcDef(npcId: NpcId, patch: Partial<NpcDef>): void
  // Dialogs library (GameDoc.dialogs) + node-tree editing.
  addDialog(): void
  removeDialog(id: DialogId): void
  setDialogStart(id: DialogId, start: DialogNodeId): void
  addDialogNode(dialogId: DialogId): void
  removeDialogNode(dialogId: DialogId, nodeId: DialogNodeId): void
  setDialogNode(dialogId: DialogId, nodeId: DialogNodeId, node: DialogNode): void
  // Sequences library (GameDoc.sequences) — cutscene step lists (M8 8b).
  addSequence(): void
  removeSequence(id: SequenceId): void
  addSeqStep(seqId: SequenceId, kind: SeqStep['kind']): void
  removeSeqStep(seqId: SequenceId, index: number): void
  moveSeqStep(seqId: SequenceId, index: number, dir: -1 | 1): void
  setSeqStep(seqId: SequenceId, index: number, step: SeqStep): void
  addNpcPlacement(id: SceneId, npc: NpcId): void
  removeNpcPlacement(id: SceneId, index: number): void
  setNpcPlacementNpc(id: SceneId, index: number, npc: NpcId): void
  setNpcPlacementSpawn(id: SceneId, index: number, xFrac: number, yFrac: number): void
  setNpcPlacementWhen(id: SceneId, index: number, when: Condition | undefined): void
  /** Per-scene dialogue override for a placement (falls back to the cast `NpcDef.dialog`). */
  setNpcPlacementDialog(id: SceneId, index: number, dialog: DialogId | undefined): void
  // Named paths (M7 6e): a placement holds several named `paths`; routine nodes reference
  // them by id. `pathIdx` indexes into that array; `index` is the placement.
  addNpcPath(id: SceneId, index: number): void
  removeNpcPath(id: SceneId, index: number, pathIdx: number): void
  setNpcPathName(id: SceneId, index: number, pathIdx: number, name: string): void
  setNpcPathMode(id: SceneId, index: number, pathIdx: number, mode: NpcPath['mode']): void
  addNpcPathPoint(id: SceneId, index: number, pathIdx: number, xFrac: number, yFrac: number): void
  clearNpcPathPoints(id: SceneId, index: number, pathIdx: number): void
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
  /** Conditional examine variants (M12.5 #1b). */
  setItemExamineWhen(id: ItemId, rules: ExamineLine[] | undefined): void
  /** Inventory-item click actions (M12.5 #5). */
  setItemUse(id: ItemId, use: ItemUse[] | undefined): void
  setItemIcon(id: ItemId, icon: string | undefined): void
  setCursorIcon(kind: CursorKind, icon: string | undefined): void
  // Audio (M9) — document defaults + per-scene ambient. No `revision` bump (not visual).
  setSceneAmbient(id: SceneId, ambient: (SoundConfig & { when?: Condition }) | undefined): void
  setDocAmbient(ambient: SoundConfig | undefined): void
  setDocFootstep(footstep: SoundConfig | undefined): void
  setFootstepsOff(off: boolean): void
  setPickupSound(id: SoundId | undefined): void
  /** UI font-family (M11); undefined → system default. */
  setFont(font: string | undefined): void
  /** Full-screen game screens config (M11) — loading / title / game-over / end / credits. */
  setScreens(screens: ScreensConfig | undefined): void
  /** Game-wide reactive rules (M12a) — the global event graph. */
  setRules(rules: GameRule[] | undefined): void
  /** The game clock config (M12c); undefined → no clock. */
  setClock(clock: ClockConfig | undefined): void
  setTransitionSound(id: SoundId | undefined): void
  // Sound library (M9 9b) — upload once, reference by id everywhere.
  addSound(src: string): void
  removeSound(id: SoundId): void
  setSoundName(id: SoundId, name: string): void
  // Weather presets (M10 10a) — the Atmosphere tab library + per-scene conditional weather.
  addWeatherPreset(): void
  removeWeatherPreset(id: WeatherId): void
  setWeatherPreset(id: WeatherId, patch: Partial<WeatherPreset>): void
  addSceneWeather(id: SceneId): void
  removeSceneWeather(id: SceneId, index: number): void
  setSceneWeatherPreset(id: SceneId, index: number, preset: WeatherId): void
  setSceneWeatherWhen(id: SceneId, index: number, when: Condition | undefined): void
  // Lighting (M10 10b) — per-scene ambient / lights / dark areas + doc defaults.
  setSceneAmbientLight(id: SceneId, ambient: AmbientLight | undefined): void
  addLight(id: SceneId): void
  removeLight(id: SceneId, index: number): void
  setLight(id: SceneId, index: number, patch: Partial<LightSource>): void
  setLightPos(id: SceneId, index: number, x: number, y: number): void
  // Spawn points (M12.5 #7) — where the player / NPCs start in a scene.
  addSpawnPoint(id: SceneId): void
  removeSpawnPoint(id: SceneId, index: number): void
  setSpawnPoint(id: SceneId, index: number, patch: Partial<SpawnPoint>): void
  setSpawnPointPos(id: SceneId, index: number, xFrac: number, yFrac: number): void
  addDarkArea(id: SceneId): void
  removeDarkArea(id: SceneId, index: number): void
  setDarkAreaPolygon(id: SceneId, index: number, polygon: number[]): void
  setDarkAreaFeather(id: SceneId, index: number, feather: number): void
  // Point emitters (M10) — placed like lights; live in the world-space `emitters` slot.
  addEmitter(id: SceneId): void
  removeEmitter(id: SceneId, index: number): void
  setEmitter(id: SceneId, index: number, patch: Partial<PointEmitter>): void
  setEmitterPos(id: SceneId, index: number, x: number, y: number): void
  /** Animated fog/clouds for this scene (M10 10c); undefined removes it. */
  setSceneFog(id: SceneId, fog: FogConfig | undefined): void
  /** Colour grade / vignette / lightning for this scene (M10 10d); undefined removes each. */
  setSceneColorGrade(id: SceneId, grade: ColorGrade | undefined): void
  setSceneVignette(id: SceneId, vignette: Vignette | undefined): void
  setSceneLightning(id: SceneId, lightning: LightningConfig | undefined): void
  setDocAmbientLight(ambient: AmbientLight | undefined): void
  setPlayerLight(light: PlayerLight | undefined): void
  // Player character (M5) — bumps `revision` so the preview re-mounts the sprite.
  createPlayer(): void
  removePlayer(): void
  updatePlayer(patch: Partial<ViewDescriptor>): void
  /** Conditional appearance variants for the player (M12.5 #3). */
  setPlayerViews(views: CharacterAppearance[] | undefined): void
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

function uniqueNpcDefId(npcs: Record<NpcId, NpcDef>, base: string): NpcId {
  if (!npcs[base]) return base
  let n = 2
  while (npcs[`${base}-${n}`]) n += 1
  return `${base}-${n}`
}

/** A `base` (or `base-2`, …) not already the id of one of `paths` — for named NPC paths. */
function uniquePathId(paths: readonly NpcPath[], base: string): string {
  const ids = new Set(paths.map((p) => p.id))
  if (!ids.has(base)) return base
  let n = 2
  while (ids.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** A blank cutscene step of the given kind (sensible defaults; the editor fills them in). */
function defaultStep(kind: SeqStep['kind']): SeqStep {
  switch (kind) {
    case 'wait':
      return { kind: 'wait', ms: 1000 }
    case 'move':
      return { kind: 'move', actor: 'player', to: { xFrac: 0.5, yFrac: 0.85 } }
    case 'anim':
      return { kind: 'anim', actor: 'player', action: 'interact' }
    case 'face':
      return { kind: 'face', actor: 'player', to: { xFrac: 0.5, yFrac: 0.85 } }
    case 'dialog':
      return { kind: 'dialog', dialog: '' }
    case 'effects':
      return { kind: 'effects', effects: [] }
    case 'camera':
      return { kind: 'camera', actor: 'player', zoom: 1.5, ms: 700 }
  }
}

/** A `base` (or `base-2`, `base-3`, …) not already a key of `obj` — for dialog / node ids. */
function uniqueKey(obj: Record<string, unknown>, base: string): string {
  if (!obj[base]) return base
  let n = 2
  while (obj[`${base}-${n}`]) n += 1
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
  const mapNpcs = (id: SceneId, fn: (npcs: NpcPlacement[]) => NpcPlacement[]) =>
    patchScene(id, { npcs: fn(get().doc.scenes[id].npcs ?? []) }, false)
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
    addHole: (id) => patchScene(id, { holes: [...(get().doc.scenes[id].holes ?? []), []] }, false),
    setHole: (id, index, polygon) =>
      patchScene(
        id,
        { holes: (get().doc.scenes[id].holes ?? []).map((h, i) => (i === index ? polygon : h)) },
        false,
      ),
    removeHole: (id, index) =>
      patchScene(
        id,
        { holes: (get().doc.scenes[id].holes ?? []).filter((_, i) => i !== index) },
        false,
      ),
    setSceneWidth: (id, width) => patchScene(id, { width }, true),
    // Hot tunable (ME.3) — the preview rescales the character live, no re-mount.
    setCharacterScale: (id, scale) => patchScene(id, { characterScale: scale }, false),
    setReferenceHeight: (height) =>
      set({ doc: { ...get().doc, referenceHeight: height }, revision: get().revision + 1 }),
    // Depth drives the actors' + mid-layers' size-by-Y; re-mount so the change shows (ME.6
    // policy: structural → re-mount, never silently stale).
    setDepthStops: (id, stops) =>
      patchScene(id, { depth: { ...get().doc.scenes[id].depth, stops } }, true),
    addImageLayer: (id, src) =>
      mapLayers(id, (ls) => [...ls, { kind: 'image', band: 'background', src, fit: 'cover' }]),
    addAnimatedLayer: (id, src) =>
      mapLayers(id, (ls) => [
        ...ls,
        {
          kind: 'animated',
          band: 'foreground',
          src,
          frameWidth: 64,
          frameHeight: 64,
          columns: 4,
          frames: 4,
          fps: 8,
          fit: 'none',
        },
      ]),
    setLayerAnim: (id, index, patch) =>
      mapLayers(id, (ls) =>
        ls.map((l, i) => (i === index && l.kind === 'animated' ? { ...l, ...patch } : l)),
      ),
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
        ls.map((l, i) =>
          i === index && (l.kind === 'image' || l.kind === 'animated') ? { ...l, fit } : l,
        ),
      ),
    setLayerParallax: (id, index, parallax) =>
      mapLayers(id, (ls) => ls.map((l, i) => (i === index ? { ...l, parallax } : l)), false),
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
      } else if (kind === 'trigger') {
        it = { kind, id: newId, hitArea, effects: [] }
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
    setTriggerBy: (id, index, by) =>
      mapInteractables(id, (its) =>
        its.map((it, i) => (i === index && it.kind === 'trigger' ? { ...it, by } : it)),
      ),
    setTriggerOnce: (id, index, once) =>
      mapInteractables(id, (its) =>
        its.map((it, i) => (i === index && it.kind === 'trigger' ? { ...it, once } : it)),
      ),
    setTriggerOn: (id, index, on) =>
      mapInteractables(id, (its) =>
        its.map((it, i) => (i === index && it.kind === 'trigger' ? { ...it, on } : it)),
      ),
    setTriggerExitEffects: (id, index, exitEffects) =>
      mapInteractables(id, (its) =>
        its.map((it, i) =>
          i === index && it.kind === 'trigger'
            ? { ...it, exitEffects: exitEffects.length ? exitEffects : undefined }
            : it,
        ),
      ),
    addNpcDef: () => {
      const npcs = get().doc.npcs ?? {}
      const id = uniqueNpcDefId(npcs, 'npc')
      patchDoc({ npcs: { ...npcs, [id]: { id, name: 'NPC' } } })
    },
    removeNpcDef: (npcId) => {
      const { doc } = get()
      const npcs = { ...(doc.npcs ?? {}) }
      delete npcs[npcId]
      // Cascade: drop placements referencing it across all scenes.
      const scenes = { ...doc.scenes }
      for (const sid of Object.keys(scenes)) {
        const placements = scenes[sid].npcs
        if (placements?.some((p) => p.npc === npcId)) {
          scenes[sid] = { ...scenes[sid], npcs: placements.filter((p) => p.npc !== npcId) }
        }
      }
      set({ doc: { ...doc, npcs, scenes } })
    },
    setNpcDefName: (npcId, name) => {
      const npcs = get().doc.npcs ?? {}
      patchDoc({ npcs: { ...npcs, [npcId]: { ...npcs[npcId], name } } })
    },
    setNpcDefSpeed: (npcId, speed) => {
      const npcs = get().doc.npcs ?? {}
      patchDoc({ npcs: { ...npcs, [npcId]: { ...npcs[npcId], speed } } })
    },
    patchNpcDef: (npcId, patch) => {
      const { doc, revision } = get()
      const npcs = doc.npcs ?? {}
      // `view` (sprite), `routine` (behavior) and `home` (start scene) need a rebuild →
      // re-mount; the rest (vision / dialog / footstep / voice / inspect) are live via the
      // overlay or don't show in the editor, so they don't churn the preview. Speed is hot
      // (`setNpcDefSpeed` → applyLive).
      const structural =
        'view' in patch || 'views' in patch || 'routine' in patch || 'home' in patch
      set({
        doc: { ...doc, npcs: { ...npcs, [npcId]: { ...npcs[npcId], ...patch } } },
        ...(structural ? { revision: revision + 1 } : {}),
      })
    },
    addDialog: () => {
      const dialogs = get().doc.dialogs ?? {}
      const id = uniqueKey(dialogs, 'dialog')
      patchDoc({
        dialogs: { ...dialogs, [id]: { start: 'start', nodes: { start: { text: '' } } } },
      })
    },
    removeDialog: (id) => {
      const dialogs = { ...(get().doc.dialogs ?? {}) }
      delete dialogs[id]
      patchDoc({ dialogs })
    },
    setDialogStart: (id, start) => {
      const dialogs = get().doc.dialogs ?? {}
      if (!dialogs[id]) return
      patchDoc({ dialogs: { ...dialogs, [id]: { ...dialogs[id], start } } })
    },
    addDialogNode: (dialogId) => {
      const dialogs = get().doc.dialogs ?? {}
      const dialog = dialogs[dialogId]
      if (!dialog) return
      const nodeId = uniqueKey(dialog.nodes, 'node')
      patchDoc({
        dialogs: {
          ...dialogs,
          [dialogId]: { ...dialog, nodes: { ...dialog.nodes, [nodeId]: { text: '' } } },
        },
      })
    },
    removeDialogNode: (dialogId, nodeId) => {
      const dialogs = get().doc.dialogs ?? {}
      const dialog = dialogs[dialogId]
      if (!dialog) return
      const nodes = { ...dialog.nodes }
      delete nodes[nodeId]
      patchDoc({ dialogs: { ...dialogs, [dialogId]: { ...dialog, nodes } } })
    },
    setDialogNode: (dialogId, nodeId, node) => {
      const dialogs = get().doc.dialogs ?? {}
      const dialog = dialogs[dialogId]
      if (!dialog) return
      patchDoc({
        dialogs: {
          ...dialogs,
          [dialogId]: { ...dialog, nodes: { ...dialog.nodes, [nodeId]: node } },
        },
      })
    },
    addSequence: () => {
      const sequences = get().doc.sequences ?? {}
      const id = uniqueKey(sequences, 'seq')
      patchDoc({ sequences: { ...sequences, [id]: { steps: [] } } })
    },
    removeSequence: (id) => {
      const sequences = { ...(get().doc.sequences ?? {}) }
      delete sequences[id]
      patchDoc({ sequences })
    },
    addSeqStep: (seqId, kind) => {
      const sequences = get().doc.sequences ?? {}
      const seq = sequences[seqId]
      if (!seq) return
      patchDoc({
        sequences: { ...sequences, [seqId]: { steps: [...seq.steps, defaultStep(kind)] } },
      })
    },
    removeSeqStep: (seqId, index) => {
      const sequences = get().doc.sequences ?? {}
      const seq = sequences[seqId]
      if (!seq) return
      patchDoc({
        sequences: { ...sequences, [seqId]: { steps: seq.steps.filter((_, i) => i !== index) } },
      })
    },
    moveSeqStep: (seqId, index, dir) => {
      const sequences = get().doc.sequences ?? {}
      const seq = sequences[seqId]
      if (!seq) return
      const j = index + dir
      if (j < 0 || j >= seq.steps.length) return
      const steps = [...seq.steps]
      ;[steps[index], steps[j]] = [steps[j], steps[index]]
      patchDoc({ sequences: { ...sequences, [seqId]: { steps } } })
    },
    setSeqStep: (seqId, index, step) => {
      const sequences = get().doc.sequences ?? {}
      const seq = sequences[seqId]
      if (!seq) return
      patchDoc({
        sequences: {
          ...sequences,
          [seqId]: { steps: seq.steps.map((s, i) => (i === index ? step : s)) },
        },
      })
    },
    addNpcPlacement: (id, npc) =>
      mapNpcs(id, (ps) => [...ps, { npc, spawn: { xFrac: 0.5, yFrac: 0.85 } }]),
    removeNpcPlacement: (id, index) => mapNpcs(id, (ps) => ps.filter((_, i) => i !== index)),
    setNpcPlacementNpc: (id, index, npc) =>
      mapNpcs(id, (ps) => ps.map((p, i) => (i === index ? { ...p, npc } : p))),
    setNpcPlacementSpawn: (id, index, xFrac, yFrac) =>
      mapNpcs(id, (ps) => ps.map((p, i) => (i === index ? { ...p, spawn: { xFrac, yFrac } } : p))),
    setNpcPlacementWhen: (id, index, when) =>
      mapNpcs(id, (ps) => ps.map((p, i) => (i === index ? { ...p, when } : p))),
    setNpcPlacementDialog: (id, index, dialog) =>
      mapNpcs(id, (ps) => ps.map((p, i) => (i === index ? { ...p, dialog } : p))),
    addNpcPath: (id, index) =>
      mapNpcs(id, (ps) =>
        ps.map((p, i) => {
          if (i !== index) return p
          const paths = p.paths ?? []
          const pid = uniquePathId(paths, 'path')
          return { ...p, paths: [...paths, { id: pid, name: pid, points: [], mode: 'loop' }] }
        }),
      ),
    removeNpcPath: (id, index, pathIdx) =>
      mapNpcs(id, (ps) =>
        ps.map((p, i) =>
          i === index ? { ...p, paths: (p.paths ?? []).filter((_, j) => j !== pathIdx) } : p,
        ),
      ),
    setNpcPathName: (id, index, pathIdx, name) =>
      mapNpcs(id, (ps) =>
        ps.map((p, i) =>
          i === index
            ? { ...p, paths: (p.paths ?? []).map((pa, j) => (j === pathIdx ? { ...pa, name } : pa)) }
            : p,
        ),
      ),
    setNpcPathMode: (id, index, pathIdx, mode) =>
      mapNpcs(id, (ps) =>
        ps.map((p, i) =>
          i === index
            ? { ...p, paths: (p.paths ?? []).map((pa, j) => (j === pathIdx ? { ...pa, mode } : pa)) }
            : p,
        ),
      ),
    addNpcPathPoint: (id, index, pathIdx, xFrac, yFrac) =>
      mapNpcs(id, (ps) =>
        ps.map((p, i) =>
          i === index
            ? {
                ...p,
                paths: (p.paths ?? []).map((pa, j) =>
                  j === pathIdx ? { ...pa, points: [...pa.points, xFrac, yFrac] } : pa,
                ),
              }
            : p,
        ),
      ),
    clearNpcPathPoints: (id, index, pathIdx) =>
      mapNpcs(id, (ps) =>
        ps.map((p, i) =>
          i === index
            ? {
                ...p,
                paths: (p.paths ?? []).map((pa, j) => (j === pathIdx ? { ...pa, points: [] } : pa)),
              }
            : p,
        ),
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
    setItemExamineWhen: (id, rules) => {
      const { items } = get().doc
      const examineWhen = rules?.length ? rules : undefined
      patchDoc({ items: { ...items, [id]: { ...items[id], examineWhen } } })
    },
    setItemUse: (id, use) => {
      const { items } = get().doc
      patchDoc({ items: { ...items, [id]: { ...items[id], use: use?.length ? use : undefined } } })
    },
    setItemIcon: (id, icon) => {
      const { items } = get().doc
      patchDoc({ items: { ...items, [id]: { ...items[id], icon } } })
    },
    setCursorIcon: (kind, icon) => patchDoc({ cursors: { ...get().doc.cursors, [kind]: icon } }),
    setSceneAmbient: (id, ambient) => patchScene(id, { ambient }, false),
    setDocAmbient: (ambient) => patchDoc({ ambient }),
    setDocFootstep: (footstep) => patchDoc({ footstep }),
    setFootstepsOff: (off) => patchDoc({ footstepsOff: off || undefined }),
    setPickupSound: (id) => patchDoc({ pickupSound: id }),
    setTransitionSound: (id) => patchDoc({ transitionSound: id }),
    setFont: (font) => patchDoc({ font }),
    setScreens: (screens) => patchDoc({ screens }),
    setRules: (rules) => patchDoc({ rules: rules?.length ? rules : undefined }),
    setClock: (clock) => patchDoc({ clock }),
    addSound: (src) => {
      const sounds = get().doc.sounds ?? {}
      const id = uniqueKey(sounds, 'sound')
      patchDoc({ sounds: { ...sounds, [id]: { id, name: id, src } } })
    },
    removeSound: (id) => {
      const sounds = { ...(get().doc.sounds ?? {}) }
      delete sounds[id]
      patchDoc({ sounds })
    },
    setSoundName: (id, name) => {
      const sounds = get().doc.sounds ?? {}
      if (!sounds[id]) return
      patchDoc({ sounds: { ...sounds, [id]: { ...sounds[id], name } } })
    },
    addWeatherPreset: () => {
      const presets = get().doc.weatherPresets ?? {}
      const id = uniqueKey(presets, 'weather')
      patchDoc({
        weatherPresets: {
          ...presets,
          [id]: {
            id,
            name: id,
            count: 200,
            color: '#ffffff',
            alpha: 0.6,
            size: 6,
            shape: 'round',
            angle: 90,
            speed: 200,
            sway: 20,
            swayFreq: 0.3,
            blend: 'normal',
          },
        },
      })
    },
    removeWeatherPreset: (id) => {
      const presets = { ...(get().doc.weatherPresets ?? {}) }
      delete presets[id]
      patchDoc({ weatherPresets: presets })
    },
    setWeatherPreset: (id, patch) => {
      const presets = get().doc.weatherPresets ?? {}
      if (!presets[id]) return
      patchDoc({ weatherPresets: { ...presets, [id]: { ...presets[id], ...patch } } })
    },
    addSceneWeather: (id) => {
      const first = Object.keys(get().doc.weatherPresets ?? {})[0] ?? ''
      patchScene(id, { weather: [...(get().doc.scenes[id].weather ?? []), { preset: first }] }, false)
    },
    removeSceneWeather: (id, index) =>
      patchScene(
        id,
        { weather: (get().doc.scenes[id].weather ?? []).filter((_, i) => i !== index) },
        false,
      ),
    setSceneWeatherPreset: (id, index, preset) =>
      patchScene(
        id,
        {
          weather: (get().doc.scenes[id].weather ?? []).map((w, i) =>
            i === index ? { ...w, preset } : w,
          ),
        },
        false,
      ),
    setSceneWeatherWhen: (id, index, when) =>
      patchScene(
        id,
        {
          weather: (get().doc.scenes[id].weather ?? []).map((w, i) =>
            i === index ? { ...w, when } : w,
          ),
        },
        false,
      ),
    setSceneAmbientLight: (id, ambient) => patchScene(id, { ambientLight: ambient }, false),
    addLight: (id) => {
      const lights = get().doc.scenes[id].lights ?? []
      const taken = new Set(lights.map((l) => l.id))
      let lid = 'light'
      let n = 1
      while (taken.has(lid)) lid = `light-${(n += 1)}`
      patchScene(
        id,
        {
          lights: [
            ...lights,
            { id: lid, x: 0.5, y: 0.5, radius: 0.3, color: '#ffd9a0', intensity: 1 },
          ],
        },
        false,
      )
    },
    removeLight: (id, index) =>
      patchScene(id, { lights: (get().doc.scenes[id].lights ?? []).filter((_, i) => i !== index) }, false),
    setLight: (id, index, patch) =>
      patchScene(
        id,
        { lights: (get().doc.scenes[id].lights ?? []).map((l, i) => (i === index ? { ...l, ...patch } : l)) },
        false,
      ),
    setLightPos: (id, index, x, y) =>
      patchScene(
        id,
        { lights: (get().doc.scenes[id].lights ?? []).map((l, i) => (i === index ? { ...l, x, y } : l)) },
        false,
      ),
    addSpawnPoint: (id) =>
      patchScene(
        id,
        {
          spawnPoints: [
            ...(get().doc.scenes[id].spawnPoints ?? []),
            { at: { xFrac: 0.5, yFrac: 0.72 }, target: 'player' },
          ],
        },
        true,
      ),
    removeSpawnPoint: (id, index) =>
      patchScene(
        id,
        { spawnPoints: (get().doc.scenes[id].spawnPoints ?? []).filter((_, i) => i !== index) },
        true,
      ),
    setSpawnPoint: (id, index, patch) =>
      patchScene(
        id,
        {
          spawnPoints: (get().doc.scenes[id].spawnPoints ?? []).map((p, i) =>
            i === index ? { ...p, ...patch } : p,
          ),
        },
        true,
      ),
    setSpawnPointPos: (id, index, xFrac, yFrac) =>
      patchScene(
        id,
        {
          spawnPoints: (get().doc.scenes[id].spawnPoints ?? []).map((p, i) =>
            i === index ? { ...p, at: { xFrac, yFrac } } : p,
          ),
        },
        true,
      ),
    addEmitter: (id) => {
      const emitters = get().doc.scenes[id].emitters ?? []
      const taken = new Set(emitters.map((e) => e.id))
      let eid = 'smoke'
      let n = 1
      while (taken.has(eid)) eid = `smoke-${(n += 1)}`
      patchScene(
        id,
        {
          emitters: [
            ...emitters,
            {
              id: eid,
              x: 0.5,
              y: 0.5,
              rate: 14,
              life: 3.2,
              color: '#9aa0ab',
              alpha: 0.32,
              size: 12,
              grow: 18,
              shape: 'round',
              angle: -90,
              spread: 16,
              speed: 26,
              gravity: -6,
              spawnRadius: 4,
              blend: 'normal',
            },
          ],
        },
        false,
      )
    },
    removeEmitter: (id, index) =>
      patchScene(
        id,
        { emitters: (get().doc.scenes[id].emitters ?? []).filter((_, i) => i !== index) },
        false,
      ),
    setEmitter: (id, index, patch) =>
      patchScene(
        id,
        {
          emitters: (get().doc.scenes[id].emitters ?? []).map((e, i) =>
            i === index ? { ...e, ...patch } : e,
          ),
        },
        false,
      ),
    setEmitterPos: (id, index, x, y) =>
      patchScene(
        id,
        {
          emitters: (get().doc.scenes[id].emitters ?? []).map((e, i) =>
            i === index ? { ...e, x, y } : e,
          ),
        },
        false,
      ),
    setSceneFog: (id, fog) => patchScene(id, { fog }, false),
    setSceneColorGrade: (id, colorGrade) => patchScene(id, { colorGrade }, false),
    setSceneVignette: (id, vignette) => patchScene(id, { vignette }, false),
    setSceneLightning: (id, lightning) => patchScene(id, { lightning }, false),
    addDarkArea: (id) =>
      patchScene(id, { darkAreas: [...(get().doc.scenes[id].darkAreas ?? []), { polygon: [] }] }, false),
    removeDarkArea: (id, index) =>
      patchScene(id, { darkAreas: (get().doc.scenes[id].darkAreas ?? []).filter((_, i) => i !== index) }, false),
    setDarkAreaPolygon: (id, index, polygon) =>
      patchScene(
        id,
        { darkAreas: (get().doc.scenes[id].darkAreas ?? []).map((a, i) => (i === index ? { ...a, polygon } : a)) },
        false,
      ),
    setDarkAreaFeather: (id, index, feather) =>
      patchScene(
        id,
        { darkAreas: (get().doc.scenes[id].darkAreas ?? []).map((a, i) => (i === index ? { ...a, feather } : a)) },
        false,
      ),
    setDocAmbientLight: (ambient) => patchDoc({ ambientLight: ambient }),
    setPlayerLight: (light) => patchDoc({ playerLight: light }),
    setTransition: (patch) => patchDoc({ transition: { ...get().doc.transition, ...patch } }),
    createPlayer: () => {
      const { doc, revision } = get()
      set({ doc: { ...doc, player: structuredClone(placeholderView) }, revision: revision + 1 })
    },
    removePlayer: () => {
      const { doc, revision } = get()
      const next = { ...doc }
      delete next.player
      set({ doc: next, revision: revision + 1 })
    },
    updatePlayer: (patch) => {
      const { doc, revision } = get()
      if (!doc.player) return
      set({ doc: { ...doc, player: { ...doc.player, ...patch } }, revision: revision + 1 })
    },
    setPlayerViews: (views) => {
      const { doc, revision } = get()
      set({
        doc: { ...doc, playerViews: views?.length ? views : undefined },
        revision: revision + 1,
      })
    },
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
