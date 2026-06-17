import {
  Assets,
  Container,
  Graphics,
  Sprite,
  type Application,
  type FederatedPointerEvent,
  type Ticker,
} from 'pixi.js'
import { Character } from '../entities/character'
import { cameraOffset } from './camera'
import { runEffects } from './effects'
import { sceneHit } from './hotspots'
import { dialogueStore } from '../state/dialogue'
import { sequenceStore } from '../state/sequence'
import { createSpriteView } from '../entities/sprite-view'
import { placeholderView } from '../entities/placeholder-atlas'
import { resolveDepthScale, designSize, DEFAULT_REFERENCE_HEIGHT } from '../data/scene-config'
import { depthScaleAt } from '../systems/depth'
import { buildNavigation } from '../systems/navmesh'
import { createAtmosphere } from './atmosphere'
import { createWeatherSystem, type WeatherSystem } from './weather'
import { createLighting, type Lighting } from './lighting'
import {
  routineNode,
  createRoutineRunner,
  routineArrival,
  type RoutinePathInfo,
} from '../systems/routine'
import { facingToAngle, WALK_SPEED } from '../systems/movement'
import { effectsFor, effectsForUse, pickInteractable } from '../systems/interactions'
import { containsPoint } from '../systems/walkable'
import { checkCondition, type StoryState, type StoryStore } from '../systems/conditions'
import type {
  AmbientLight,
  Condition,
  Dialog,
  DialogId,
  Effect,
  InteractableData,
  LayerData,
  NpcDef,
  PlayerLight,
  NpcId,
  NpcPath,
  SceneBand,
  SceneData,
  SceneId,
  SeqStep,
  Sequence,
  SequenceId,
  SoundConfig,
  TransitionConfig,
  ViewDescriptor,
  VisionConfig,
  VoiceConfig,
  WeatherId,
  WeatherPreset,
} from '../data/schema'

/** Viewport size in CSS pixels. */
export interface Size {
  width: number
  height: number
}

/** Document-level audio defaults threaded to each scene (M9): the default ambient bed +
 *  the footstep sound / off switch. A scene's own `ambient` overrides the bed. */
export interface AudioConfig {
  ambient?: SoundConfig
  footstep?: SoundConfig
  footstepsOff?: boolean
}

/** How a mounted scene is presented (M10 ME.1). The game uses the defaults; the editor's
 *  live view fits the whole scene + suppresses gameplay clicks (it places/draws instead). */
export interface SceneOptions {
  /** `follow` (default) — fit height + scroll to follow the player; `fit` — fit the whole
   *  scene into the viewport (no scroll), for the editor. */
  cameraMode?: 'follow' | 'fit'
  /** Whether clicks drive gameplay (walk / interact / talk). Default true; the editor sets
   *  false so the world is a live view it edits over. */
  gameplayInput?: boolean
  /** Suppress all audio (ambient beds + footsteps). Default false; the editor's live view sets
   *  true so authoring doesn't play sound and the audio chunk stays out of the preview. */
  muteAudio?: boolean
  /** Editor only: make free-positioned (`fit: none` / `width`) image layers draggable to place
   *  them, committing the new fractional position on release. Omitted in the game. */
  onLayerMove?: (index: number, xFrac: number, yFrac: number) => void
  /** Internal (`createSceneHost` → `mountScene`): a routine NPC's current `once`-path progress
   *  (0..1), so the mounted scene resumes it mid-walk instead of restarting (B-lite). */
  npcPathProgress?: (npcId: NpcId) => number
}

/** The slice of the story store the engine needs: read state + react to it. */
export interface SceneStore {
  getState(): StoryStore
  subscribe(listener: () => void): () => void
}

/**
 * Builds a geometric placeholder layer (a `builtin` LayerData) from screen size
 * + the layer's numeric params. Registered by key; real art uses `image` layers
 * instead. Scenes register their builders at module load (see scenes/*.ts).
 */
export type LayerBuilder = (screen: Size, params: Record<string, number>) => Container

const builders = new Map<string, LayerBuilder>()

export function registerLayerBuilder(key: string, build: LayerBuilder): void {
  builders.set(key, build)
}

/** A live scene mounted on the Application. Call `destroy()` on teardown. */
export interface Scene {
  destroy(): void
}

/** Keeps the displayed scene in sync with the store's current scene. */
export interface SceneHost {
  /** Re-apply the **hot** params (atmosphere / character size / NPC speed) to the currently
   *  mounted scene in place — the editor calls this on every doc edit; the scene diffs and
   *  applies only what changed. No-op while no scene is mounted (e.g. mid-swap). */
  applyLive(patch: LivePatch): void
  destroy(): void
}

/** Resolve a fractional polygon to pixels against the screen. */
function resolvePolygon(frac: readonly number[], { width, height }: Size): number[] {
  return frac.map((v, i) => v * (i % 2 === 0 ? width : height))
}

/** Size + place an `image` layer's sprite per its `fit` (default 'none'). */
function fitImageSprite(
  sprite: Sprite,
  layer: Extract<LayerData, { kind: 'image' }>,
  screen: Size,
): void {
  const fit = layer.fit ?? 'none'
  if (fit === 'stretch') {
    sprite.anchor.set(0, 0)
    sprite.position.set(0, 0)
    sprite.width = screen.width
    sprite.height = screen.height
    return
  }
  if (fit === 'cover' || fit === 'contain') {
    const sx = screen.width / sprite.texture.width
    const sy = screen.height / sprite.texture.height
    sprite.anchor.set(0.5, 0.5)
    sprite.scale.set(fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy))
    sprite.position.set(screen.width / 2, screen.height / 2)
    return
  }
  if (fit === 'width') {
    // Full-bleed horizontally (keeps aspect); positioned vertically via yFrac.
    sprite.anchor.set(0.5, 0.5)
    sprite.scale.set(screen.width / sprite.texture.width)
    sprite.position.set(screen.width / 2, (layer.yFrac ?? 0.5) * screen.height)
    return
  }
  // 'none' — natural size, centered on (xFrac, yFrac).
  sprite.anchor.set(0.5, 0.5)
  sprite.position.set((layer.xFrac ?? 0.5) * screen.width, (layer.yFrac ?? 0.5) * screen.height)
}

async function buildLayer(layer: LayerData, screen: Size): Promise<Container> {
  if (layer.kind === 'image') {
    const texture = await Assets.load(layer.src)
    const sprite = new Sprite(texture)
    fitImageSprite(sprite, layer, screen)
    return sprite
  }
  const build = builders.get(layer.builder)
  if (!build) throw new Error(`Unknown layer builder: "${layer.builder}"`)
  return build(screen, layer.params ?? {})
}

/** The one-shot animation a click on each interactable kind plays before its
 *  effects run (exit / inspect have none). */
const ONE_SHOT: Partial<Record<InteractableData['kind'], string>> = {
  pickable: 'pickup',
  interact: 'interact',
}

/** How far (design px) beside an NPC the player stops to talk, so they don't overlap. */
const TALK_GAP = 90

/** A placed NPC's click behaviour, resolved against story state at click / hover time:
 *  the gated dialogue (talk) with the `inspect` ("look at") as the fallback. */
interface NpcInteraction {
  dialog?: Dialog
  dialogWhen?: Condition
  inspect?: { text?: string; audio?: string }
}

/** Resolve what clicking an NPC does *right now*: its dialogue if present and its gate
 *  passes, else its inspect, else nothing (the click falls through to a walk). */
function resolveNpc(
  it: NpcInteraction,
  state: StoryState,
): { kind: 'dialog'; dialog: Dialog } | { kind: 'inspect'; text?: string; audio?: string } | null {
  if (it.dialog && (!it.dialogWhen || checkCondition(state, it.dialogWhen))) {
    return { kind: 'dialog', dialog: it.dialog }
  }
  if (it.inspect) return { kind: 'inspect', text: it.inspect.text, audio: it.inspect.audio }
  return null
}

/** Total length (px) of a fractional polyline (`[x0,y0,x1,y1,…]`) against a design size. */
function polylineLengthPx(points: readonly number[], design: Size): number {
  let len = 0
  for (let i = 2; i < points.length; i += 2) {
    const dx = (points[i] - points[i - 2]) * design.width
    const dy = (points[i + 1] - points[i - 1]) * design.height
    len += Math.hypot(dx, dy)
  }
  return len
}

/** Drive a placed NPC along its patrol route (once / loop / pingpong). Each leg is
 *  nav-routed (so it rounds holes), chained via the character's onArrive callback.
 *  `onDone` fires when a `once` path reaches its end (the NPC arrived) — the routine
 *  runner listens for this to take an `onArrive` edge. */
function startNpcPath(
  npc: Character,
  path: NpcPath | undefined,
  design: Size,
  onDone?: () => void,
  /** Resume a `once` path at this fraction (0..1) of its length, so a routine NPC the player
   *  walks in on isn't restarted from the start (B-lite mid-path seeding). */
  startProgress = 0,
): void {
  if (!path || path.points.length < 4) return
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i + 1 < path.points.length; i += 2) {
    pts.push({ x: path.points[i] * design.width, y: path.points[i + 1] * design.height })
  }
  let idx = 0
  let dir = 1
  const advance = () => {
    if (path.mode === 'once') {
      if (idx >= pts.length - 1) {
        onDone?.()
        return
      }
      idx += 1
    } else if (path.mode === 'loop') {
      idx = (idx + 1) % pts.length
    } else {
      if (idx === 0) dir = 1
      else if (idx === pts.length - 1) dir = -1
      idx += dir
    }
    npc.setTarget(pts[idx].x, pts[idx].y, advance)
  }
  // Seek a `once` path to `startProgress` (resume mid-walk): place the NPC along the polyline
  // and head to the next vertex. Other modes always start at the first point.
  if (path.mode === 'once' && startProgress > 0 && startProgress < 1) {
    const segLen = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y))
    const total = segLen.reduce((a, b) => a + b, 0)
    let remain = startProgress * total
    let i = 0
    while (i < segLen.length && remain > segLen[i]) {
      remain -= segLen[i]
      i += 1
    }
    if (i < segLen.length) {
      const t = segLen[i] > 0 ? remain / segLen[i] : 0
      npc.setPosition(pts[i].x + (pts[i + 1].x - pts[i].x) * t, pts[i].y + (pts[i + 1].y - pts[i].y) * t)
      idx = i + 1
      npc.setTarget(pts[idx].x, pts[idx].y, advance)
      return
    }
  }
  npc.setTarget(pts[0].x, pts[0].y, advance)
}

/**
 * Mounts a `SceneData` onto an initialised Application as three zIndex-ordered
 * bands — background < interactive (mid) < foreground occluder. A click either
 * runs the topmost interactable under it (after walking there) or just walks the
 * character. Layers with a `when` Condition toggle visibility as state changes
 * (e.g. a picked-up item vanishes). Positions in the data are screen fractions.
 */
export async function mountScene(
  app: Application,
  scene: SceneData,
  store: SceneStore,
  playerView: ViewDescriptor = placeholderView,
  referenceHeight: number = DEFAULT_REFERENCE_HEIGHT,
  cast: Record<NpcId, NpcDef> = {},
  dialogs: Record<DialogId, Dialog> = {},
  npcHome: Record<NpcId, SceneId> = {},
  sequences: Record<SequenceId, Sequence> = {},
  audio: AudioConfig = {},
  weatherPresets: Record<WeatherId, WeatherPreset> = {},
  lightingDefaults: { ambientLight?: AmbientLight; playerLight?: PlayerLight } = {},
  options: SceneOptions = {},
): Promise<PreviewScene> {
  const cameraMode = options.cameraMode ?? 'follow'
  const gameplayInput = options.gameplayInput ?? true
  const muteAudio = options.muteAudio ?? false
  const onLayerMove = options.onLayerMove
  const npcPathProgress = options.npcPathProgress
  // Design space vs viewport: the scene is authored in a fixed design space
  // (`scene.width` × `referenceHeight` px). The world Container holds it; the camera
  // (below) fits the design *height* to the viewport with one uniform scale, then
  // scrolls the width to follow the character — so fractions resolve against the
  // design, and characters/art keep one size across resolutions.
  const design: Size = designSize(scene, referenceHeight)
  const depthScale = resolveDepthScale(scene.depth, design.height)

  app.stage.sortableChildren = true
  const world = new Container()
  world.sortableChildren = true
  app.stage.addChild(world)
  const background = new Container()
  background.zIndex = 0
  const interactive = new Container()
  interactive.zIndex = 10
  interactive.sortableChildren = true // Y-sort by feet Y happens in here
  const foreground = new Container()
  foreground.zIndex = 20
  world.addChild(background, interactive, foreground)

  // M10 atmosphere/lighting compositing stack (weather / lighting / fog / polish render
  // into its slots; subsystems register per-frame updaters, ticked below).
  const atmosphere = createAtmosphere(world, app.stage)

  // Audio module, dynamic-imported below (kept out of the editor preview's graph); declared
  // here so the weather block can drive its `'weather'` ambient channel once loaded.
  let audioMod: typeof import('../audio/audio') | null = null

  // M10 10a weather: the active preset is the first `scene.weather` entry whose `when`
  // passes — rebuilt reactively (a story flag triggers / swaps weather), ticked via the
  // atmosphere update hook. A preset's `ambient` loops on the `'weather'` audio channel,
  // layered over the scene's own ambient.
  // Mutable atmosphere config — `applyLive` (the editor's live tuning) swaps in the edited
  // scene + doc defaults and rebuilds weather + lighting, no re-mount.
  let weatherScene = scene
  let weatherPresetsRef = weatherPresets
  let lightScene = scene
  let lightDefaults: { ambientLight?: AmbientLight; playerLight?: PlayerLight } = lightingDefaults
  let weatherSystem: WeatherSystem | null = null
  let weatherId: string | null = null
  const activeWeatherId = (st: StoryState): string | null =>
    weatherScene.weather?.find((w) => !w.when || checkCondition(st, w.when))?.preset ?? null
  const applyWeatherAmbient = (): void => {
    const amb = (weatherId ? weatherPresetsRef[weatherId] : undefined)?.ambient
    audioMod?.setAmbient('weather', amb ? (audioMod.resolveSrc(amb.sound) ?? null) : null, amb?.volume ?? 0.4)
  }
  const syncWeather = (st: StoryState): void => {
    const id = activeWeatherId(st)
    if (id === weatherId) return
    weatherId = id
    weatherSystem?.destroy()
    weatherSystem = null
    const preset = id ? weatherPresetsRef[id] : undefined
    if (preset) weatherSystem = createWeatherSystem(atmosphere.layers.weather, preset, app)
    applyWeatherAmbient()
  }
  syncWeather(store.getState())
  atmosphere.onUpdate((dt) => weatherSystem?.update(dt))

  // M10 10b lighting: a lightmap (ambient + local lights + dark areas + the player light)
  // multiply-composited over the scene. Inactive (null) when the scene has nothing to light.
  let lighting: Lighting | null = null
  const buildLighting = (): void => {
    lighting?.destroy()
    lighting = createLighting(atmosphere.layers.lighting, design, app, {
      ambient: lightScene.ambientLight ??
        lightDefaults.ambientLight ?? { color: '#ffffff', intensity: 1 },
      lights: lightScene.lights ?? [],
      darkAreas: lightScene.darkAreas ?? [],
      playerLight: lightDefaults.playerLight,
    })
  }
  buildLighting()

  const bandFor = (band: SceneBand): Container =>
    band === 'background' ? background : band === 'foreground' ? foreground : interactive

  // Displays whose visibility tracks story state (a layer's `when`, an NPC's location +
  // `when`) — re-evaluated on every store change via a `show` predicate.
  const conditional: { display: Container; show: (s: StoryState) => boolean }[] = []
  // NPCs with conditional `paths`: re-pick + restart the active route when state changes.
  const pathSwitchers: ((s: StoryState) => void)[] = []
  // Background / foreground layers that scroll at their own rate (parallax).
  const parallaxLayers: { display: Container; baseX: number; baseY: number; p: number }[] = []

  for (let i = 0; i < scene.layers.length; i += 1) {
    const layer = scene.layers[i]
    const display = await buildLayer(layer, design)
    if (layer.band === 'mid' && layer.anchorYFrac !== undefined) {
      const anchorY = layer.anchorYFrac * design.height
      display.zIndex = anchorY
      display.scale.set(depthScaleAt(anchorY, depthScale))
    }
    if (layer.when) {
      const when = layer.when
      display.visible = checkCondition(store.getState(), when)
      conditional.push({ display, show: (st) => checkCondition(st, when) })
    }
    const p = layer.parallax ?? 1
    let parallaxEntry: { display: Container; baseX: number; baseY: number; p: number } | undefined
    if (p !== 1 && layer.band !== 'mid') {
      parallaxEntry = { display, baseX: display.position.x, baseY: display.position.y, p }
      parallaxLayers.push(parallaxEntry)
    }
    // Editor: drag free image layers to place them. In `fit` the camera pins parallax layers
    // to their base each frame, so keep that base in sync with the drag (else it snaps back).
    if (onLayerMove && layer.kind === 'image') {
      const fit = layer.fit ?? 'none'
      const axis = fit === 'none' ? 'xy' : fit === 'width' ? 'y' : null
      if (axis) {
        const pe = parallaxEntry
        makeLayerDraggable(display, i, design, onLayerMove, axis, (x, y) => {
          if (pe) {
            pe.baseX = x
            pe.baseY = y
          }
        })
      }
    }
    bandFor(layer.band).addChild(display)
  }

  const refreshVisibility = () => {
    const state = store.getState()
    for (const c of conditional) c.display.visible = c.show(state)
    for (const sw of pathSwitchers) sw(state)
    syncWeather(state)
  }
  // Subscribe unconditionally — NPCs (below) may add conditional entries after this.
  const unsubscribeVisibility = store.subscribe(refreshVisibility)

  const walkablePx = resolvePolygon(scene.walkable, design)
  const holesPx = (scene.holes ?? []).map((h) => resolvePolygon(h, design))
  const nav = buildNavigation(walkablePx, holesPx) // shared by the player + every NPC
  const charScale = scene.characterScale ?? 1
  const character = new Character(await createSpriteView(playerView), depthScale, nav, charScale)
  interactive.addChild(character.displayObject)
  character.setPosition(scene.spawn.xFrac * design.width, scene.spawn.yFrac * design.height)

  // NPCs: characters placed in the scene. They share the nav-mesh + depth, Y-sort
  // with the player, and `when` gates presence. The actor registry addresses every
  // live character by id (`'player'` + cast ids) so engine effects resolve targets.
  const npcs: { id: string; character: Character; interaction: NpcInteraction }[] = []
  const actors = new Map<string, Character>([['player', character]])
  for (const placement of scene.npcs ?? []) {
    // Per-NPC appearance (`NpcDef.view`) when set, else the shared placeholder. The
    // placement's `npc` is the runtime id (playAnim target / NPC triggers resolve to it).
    const def = cast[placement.npc]
    const npcChar = new Character(
      await createSpriteView(def?.view ?? placeholderView),
      depthScale,
      nav,
      charScale,
    )
    if (def?.speed) npcChar.setSpeedScale(def.speed)
    npcChar.setPosition(placement.spawn.xFrac * design.width, placement.spawn.yFrac * design.height)
    interactive.addChild(npcChar.displayObject)
    // Visibility tracks the NPC's runtime location — it shows here only while its current
    // scene (moved via `moveNpc`, else its home / this placement) is this one — plus its
    // placement `when`. So `moveNpc` / `despawnNpc` add or remove it live.
    const npcId = placement.npc
    const when = placement.when
    const show = (st: StoryState): boolean =>
      (st.npcScene?.[npcId] ?? npcHome[npcId] ?? scene.id) === scene.id &&
      (!when || checkCondition(st, when))
    npcChar.displayObject.visible = show(store.getState())
    conditional.push({ display: npcChar.displayObject, show })
    // The NPC's click behaviour: its dialogue (placement override, else cast default) +
    // the gate + the inspect fallback — resolved against state at click / hover time.
    const dialogId = placement.dialog ?? def?.dialog
    const interaction: NpcInteraction = {
      dialog: dialogId ? dialogs[dialogId] : undefined,
      dialogWhen: def?.dialogWhen,
      inspect: def?.inspect,
    }
    npcs.push({ id: placement.npc, character: npcChar, interaction })
    actors.set(placement.npc, npcChar)
    // Active route, most-specific first: when the NPC has a **routine** and its active node
    // is in this scene, the node's **referenced** placement path (by `pathId`; absent →
    // stand still); otherwise a conditional `paths` **override** whose `when` passes, else
    // the default `path`. Recomputed reactively so a flag / routine hop switches the route.
    const routine = def?.routine
    const activePathOf = (st: StoryState): NpcPath | undefined => {
      if (routine) {
        const node = routineNode(routine, st.npcNode?.[npcId])
        if (node?.scene === scene.id)
          return node.pathId ? placement.paths?.find((p) => p.id === node.pathId) : undefined
      }
      return placement.paths?.find((p) => p.when && checkCondition(st, p.when)) ?? placement.path
    }
    // A routine NPC's finished `once` path signals the runner (→ `onArrive` edges).
    const start = (path: NpcPath | undefined, progress = 0) =>
      startNpcPath(
        npcChar,
        path,
        design,
        routine ? () => routineArrival.notify(npcId) : undefined,
        progress,
      )
    let currentPath = activePathOf(store.getState())
    // Initial: resume a routine NPC mid-walk at its global path progress (B-lite); a later
    // path switch (a new path) always starts at the beginning.
    start(currentPath, routine ? (npcPathProgress?.(npcId) ?? 0) : 0)
    if (placement.paths || routine) {
      pathSwitchers.push((st) => {
        const next = activePathOf(st)
        if (next !== currentPath) {
          currentPath = next
          start(next)
        }
      })
    }
  }

  // Stealth vision: per-NPC watchers with a precomputed range (px) + cone half-angle
  // (rad). `seen` tracks the per-NPC detection edge so the beat fires once per spotting.
  const visions: {
    char: Character
    id: string
    cfg: VisionConfig
    rangePx: number
    half: number
    seen: boolean
    fired: boolean
  }[] = []
  for (const n of npcs) {
    const cfg = cast[n.id]?.vision
    if (!cfg) continue
    visions.push({
      char: n.character,
      id: n.id,
      cfg,
      rangePx: cfg.range * design.height,
      half: ((cfg.angle ?? 360) / 2) * (Math.PI / 180),
      seen: false,
      fired: false,
    })
  }

  // Camera: height-anchored + resize-safe. Each frame we read the *current*
  // viewport (so a window resize re-fits with no re-mount), scale the world so the
  // design height fills it, then pan horizontally to keep the character centred —
  // clamped to the world bounds, or centred (pillar-boxed) when the world is
  // narrower than the viewport. `cameraOffset` lets the DOM cursor invert this.
  const place = (content: number, viewport: number, target: number): number =>
    content <= viewport
      ? (viewport - content) / 2
      : Math.max(viewport - content, Math.min(0, viewport / 2 - target))

  // Cutscene camera override (M8): when active the camera focuses a tweened point /
  // zoom (lerped `camFrom`→`camTo` over `camMs`) instead of following the player; a
  // `camFollow` actor keeps it live once the transition lands. `camCur` is the last
  // focus used (the start of the next tween). Released back to the player on end.
  const camCur = { fx: 0, fy: 0, zoom: 1 }
  let camActive = false
  let camFollow: Character | null = null
  let camFrom = { fx: 0, fy: 0, zoom: 1 }
  let camTo = { fx: 0, fy: 0, zoom: 1 }
  let camMs = 0
  let camElapsed = 0
  const updateCamera = (dt = 0) => {
    // Editor `fit` mode: show the whole scene centred (no scroll / follow), so the static
    // overlays' design→box mapping stays linear.
    if (cameraMode === 'fit') {
      const s = Math.min(app.screen.width / design.width, app.screen.height / design.height)
      world.scale.set(s)
      const x = (app.screen.width - design.width * s) / 2
      const y = (app.screen.height - design.height * s) / 2
      world.position.set(x, y)
      cameraOffset.x = x
      cameraOffset.y = y
      cameraOffset.scale = s
      for (const pl of parallaxLayers) pl.display.position.set(pl.baseX, pl.baseY)
      return
    }
    const base = app.screen.height / design.height
    let fx = character.displayObject.x
    let fy = character.displayObject.y
    let zoom = 1
    if (camActive) {
      camElapsed = Math.min(camMs, camElapsed + dt)
      const t = camMs > 0 ? camElapsed / camMs : 1
      const e = t * t * (3 - 2 * t) // smoothstep
      const tx = camFollow && t >= 1 ? camFollow.displayObject.x : camTo.fx
      const ty = camFollow && t >= 1 ? camFollow.displayObject.y : camTo.fy
      fx = camFrom.fx + (tx - camFrom.fx) * e
      fy = camFrom.fy + (ty - camFrom.fy) * e
      zoom = camFrom.zoom + (camTo.zoom - camFrom.zoom) * e
    }
    camCur.fx = fx
    camCur.fy = fy
    camCur.zoom = zoom
    const s = base * zoom
    world.scale.set(s)
    const x = place(design.width * s, app.screen.width, fx * s)
    const y = place(design.height * s, app.screen.height, fy * s)
    world.position.set(x, y)
    cameraOffset.x = x
    cameraOffset.y = y
    cameraOffset.scale = s
    // Parallax: shift each layer back toward rest by (1 − p) of the pan, so far
    // layers (p < 1) scroll slower and near ones (p > 1) faster. In world-local
    // (design) px, hence ÷ s.
    for (const pl of parallaxLayers) {
      pl.display.position.x = pl.baseX + ((1 - pl.p) * -x) / s
      pl.display.position.y = pl.baseY + ((1 - pl.p) * -y) / s
    }
  }
  updateCamera()

  // Resolve a `speaker` id (or undefined → the conversation partner) to a display name.
  const nameOf = (speaker: string | undefined, partnerId?: string): string => {
    const id = speaker ?? partnerId
    if (!id) return ''
    if (id === 'player') return 'You'
    return cast[id]?.name ?? id
  }

  // Resolve a `speaker` (or undefined → the partner) to its voice; player / unknown →
  // none (the default procedural blip).
  const voiceOf = (speaker: string | undefined, partnerId?: string): VoiceConfig | undefined => {
    const id = speaker ?? partnerId
    return id && id !== 'player' ? cast[id]?.voice : undefined
  }

  // Start a conversation: pause + turn the partner NPC to the player (and the player
  // to it), then drive the dialogue store (which resumes the NPC on end). Node / choice
  // effects run back through `run` (engine + state, addressing the partner as subject).
  const beginDialogue = (
    dialog: Dialog,
    partner?: { id: string; char: Character },
    onEnd?: () => void,
  ) => {
    if (partner) {
      partner.char.pause()
      partner.char.faceToward(character.displayObject.x, character.displayObject.y)
      character.faceToward(partner.char.displayObject.x, partner.char.displayObject.y)
    }
    dialogueStore.getState().begin({
      dialog,
      subject: partner?.id ?? 'player',
      run: (fx, subj) => run(fx, subj ?? partner?.id ?? 'player'),
      check: (cond) => checkCondition(store.getState(), cond),
      nameOf: (speaker) => nameOf(speaker, partner?.id),
      voiceOf: (speaker) => voiceOf(speaker, partner?.id),
      onEnd: () => {
        partner?.char.resume()
        onEnd?.()
      },
    })
  }

  // Effects from a click, a trigger, or a dialogue node, dispatched over the actor
  // registry by the shared runtime. `subject` is the actor the batch is "about" (a
  // trigger's enterer / the dialogue partner) — it receives `wait`; clicks default to
  // the player. `startDialog` / `startSequence` are handled here (they need the scene's
  // dialogs / sequences + actors).
  function run(effects: readonly Effect[], subject = 'player'): void {
    runEffects(effects, actors, store, subject)
    for (const e of effects) {
      if (e.kind === 'startDialog') {
        const dialog = dialogs[e.dialog]
        if (!dialog) continue
        const char = subject !== 'player' ? actors.get(subject) : undefined
        beginDialogue(dialog, char ? { id: subject, char } : undefined)
      } else if (e.kind === 'startSequence') {
        const seq = sequences[e.sequence]
        if (seq) void playSequence(seq)
      }
    }
  }

  // --- Cutscene runner (M8) -------------------------------------------------
  // Plays a Sequence's steps in order over the scene's actors + camera; input is blocked
  // (sequenceStore.active) and the whole thing is skippable. Skipping fast-forwards: the
  // current await resolves, then remaining steps apply only their instant parts (effects
  // run, moves/cameras snap, anims/dialog/waits are dropped) so the world lands correctly.
  const RELEASE_MS = 350
  let cutsceneRunning = false
  let skipping = false

  /** A delay that also resolves early once a skip is requested. */
  const sleep = (ms: number): Promise<void> =>
    new Promise((resolve) => {
      if (skipping || ms <= 0) return resolve()
      let t = 0
      const tick = (tk: Ticker) => {
        t += tk.deltaMS
        if (skipping || t >= ms) {
          app.ticker.remove(tick)
          resolve()
        }
      }
      app.ticker.add(tick)
    })

  const toPx = (p: { xFrac: number; yFrac: number }) => ({
    x: p.xFrac * design.width,
    y: p.yFrac * design.height,
  })

  const runStep = async (step: SeqStep): Promise<void> => {
    switch (step.kind) {
      case 'wait':
        await sleep(step.ms)
        return
      case 'effects':
        run(step.effects)
        return
      case 'face': {
        const t = toPx(step.to)
        actors.get(step.actor)?.faceToward(t.x, t.y)
        return
      }
      case 'move': {
        const a = actors.get(step.actor)
        const t = toPx(step.to)
        if (!a) return
        if (skipping) {
          a.setPosition(t.x, t.y)
          return
        }
        await new Promise<void>((resolve) => {
          let done = false
          a.setTarget(t.x, t.y, () => {
            done = true
            app.ticker.remove(poll)
            resolve()
          })
          const poll = () => {
            if (done) return app.ticker.remove(poll)
            if (skipping) {
              app.ticker.remove(poll)
              a.setPosition(t.x, t.y)
              resolve()
            }
          }
          app.ticker.add(poll)
        })
        return
      }
      case 'anim': {
        const a = actors.get(step.actor)
        if (!a || skipping) return
        await new Promise<void>((resolve) => a.playOnce(step.action, resolve))
        return
      }
      case 'dialog': {
        const dialog = dialogs[step.dialog]
        if (!dialog || skipping) return
        await new Promise<void>((resolve) => beginDialogue(dialog, undefined, resolve))
        return
      }
      case 'camera': {
        const focus = step.actor ? (actors.get(step.actor) ?? null) : null
        const point = focus
          ? { x: focus.displayObject.x, y: focus.displayObject.y }
          : step.to
            ? toPx(step.to)
            : { x: camCur.fx, y: camCur.fy }
        camFrom = { ...camCur }
        camTo = { fx: point.x, fy: point.y, zoom: step.zoom ?? 1 }
        camFollow = focus
        camMs = skipping ? 0 : (step.ms ?? 600)
        camElapsed = 0
        camActive = true
        await sleep(camMs)
        return
      }
    }
  }

  async function playSequence(seq: Sequence): Promise<void> {
    if (cutsceneRunning) return
    cutsceneRunning = true
    skipping = false
    if (dialogueStore.getState().active) dialogueStore.getState().end()
    sequenceStore.getState().begin(() => {
      skipping = true
      if (dialogueStore.getState().active) dialogueStore.getState().end()
    })
    for (const step of seq.steps) {
      await runStep(step)
      if (torn) return // a goTo (or teardown) ended the scene mid-cutscene
    }
    // Release the camera back to the player.
    if (camActive) {
      camFrom = { ...camCur }
      camTo = { fx: character.displayObject.x, fy: character.displayObject.y, zoom: 1 }
      camFollow = character
      camMs = skipping ? 0 : RELEASE_MS
      camElapsed = 0
      await sleep(camMs)
      camActive = false
    }
    cutsceneRunning = false
    if (!torn) sequenceStore.getState().end()
  }

  // Interact with an NPC: click it → walk beside it → talk or look, resolved against
  // state at click time (dialogue if its gate passes, else inspect). NPCs with neither
  // aren't interactive; a gated-off click falls through to a walk. (Suppressed in the
  // editor's live view, which authors over the world instead of playing it.)
  for (const n of gameplayInput ? npcs : []) {
    const { character: npcChar, id, interaction } = n
    if (!interaction.dialog && !interaction.inspect) continue
    npcChar.displayObject.eventMode = 'static'
    npcChar.displayObject.cursor = 'none' // keep the DOM cursor; the talk/look hotspot draws it
    npcChar.displayObject.on('pointertap', (e: FederatedPointerEvent) => {
      if (dialogueStore.getState().active) return
      const r = resolveNpc(interaction, store.getState())
      if (!r) return // gated off + no inspect → let the tap fall through to a walk
      e.stopPropagation() // don't also walk to the raw click point
      const npcX = npcChar.displayObject.x
      const npcY = npcChar.displayObject.y
      const side = character.displayObject.x <= npcX ? -1 : 1
      character.setTarget(npcX + side * TALK_GAP, npcY, () => {
        if (r.kind === 'dialog') {
          beginDialogue(r.dialog, { id, char: npcChar })
        } else {
          character.faceToward(npcX, npcY)
          if (r.text) store.getState().say(r.text)
          if (r.audio) {
            const audio = r.audio
            void import('../audio/audio').then((m) => m.playSoundById(audio))
          }
        }
      })
    })
  }

  // Publish a hit-tester so the DOM cursor shows the right icon over a (moving) NPC —
  // it can't see live entities itself. Pointer → design space, then the NPC's box
  // (its view's local bounds × the depth scale, around the feet).
  sceneHit.kindAt = (clientX, clientY) => {
    const wx = (clientX - cameraOffset.x) / cameraOffset.scale
    const wy = (clientY - cameraOffset.y) / cameraOffset.scale
    const state = store.getState()
    for (const n of npcs) {
      const disp = n.character.displayObject
      if (!disp.visible) continue
      const r = resolveNpc(n.interaction, state)
      if (!r) continue
      const b = disp.getLocalBounds()
      const sc = disp.scale.x
      if (
        wx >= disp.x + b.minX * sc &&
        wx <= disp.x + b.maxX * sc &&
        wy >= disp.y + b.minY * sc &&
        wy <= disp.y + b.maxY * sc
      ) {
        return r.kind === 'dialog' ? 'talk' : 'inspect'
      }
    }
    return null
  }

  // Trigger volumes: run effects when the player's feet ENTER (debounced to the enter
  // edge; `once` stops a re-fire this visit). NPC triggers wait for NPCs (step 2+).
  const triggers = scene.interactables
    .filter((it): it is Extract<InteractableData, { kind: 'trigger' }> => it.kind === 'trigger')
    .map((it) => ({
      data: it,
      polygon: resolvePolygon(it.hitArea, design),
      inside: new Set<string>(), // ids of characters in the AREA (drives the exit edge)
      active: new Set<string>(), // ids for whom the fire condition holds (the fire edge)
      fired: false,
    }))
  const checkTriggers = () => {
    if (triggers.length === 0) return
    if (sequenceStore.getState().active) return // a cutscene owns the stage
    const state = store.getState()
    for (const t of triggers) {
      const by = t.data.by ?? 'player'
      const movers: { id: string; c: Character }[] = []
      if (by === 'player' || by === 'any') movers.push({ id: 'player', c: character })
      if (by === 'npc' || by === 'any')
        for (const n of npcs)
          if (n.character.displayObject.visible) movers.push({ id: n.id, c: n.character })
      for (const m of movers) {
        const inArea = containsPoint(
          { polygon: t.polygon },
          m.c.displayObject.x,
          m.c.displayObject.y,
        )
        // 'rest' fires once the mover has stopped inside (reached a target there); the
        // default 'enter' fires the moment its feet cross in.
        const fireNow = t.data.on === 'rest' ? inArea && !m.c.isMoving() : inArea
        if (fireNow && !t.active.has(m.id) && !(t.data.once && t.fired)) {
          if (!t.data.when || checkCondition(state, t.data.when)) {
            run(t.data.effects, m.id) // the enterer is the subject (receives `wait`)
            t.fired = true
          }
        }
        if (fireNow) t.active.add(m.id)
        else t.active.delete(m.id)
        // Area containment drives the exit edge, independent of the fire mode.
        if (inArea) {
          t.inside.add(m.id)
        } else {
          // Leaving edge — e.g. un-set a `hidden` flag when stepping out of cover.
          if (t.inside.has(m.id) && t.data.exitEffects) run(t.data.exitEffects, m.id)
          t.inside.delete(m.id)
        }
      }
    }
  }

  // Stealth: each frame test the player against every watcher's range + cone + LOS,
  // suppressed while `unless` passes (the player is hidden). Fire the beat on the
  // unseen→seen edge (subject = the watcher), once if `once`.
  const checkVision = () => {
    if (visions.length === 0) return
    if (sequenceStore.getState().active) return // no stealth detection during a cutscene
    const state = store.getState()
    const px = character.displayObject.x
    const py = character.displayObject.y
    for (const v of visions) {
      const disp = v.char.displayObject
      let sees = disp.visible
      if (sees) {
        const dx = px - disp.x
        const dy = py - disp.y
        sees = Math.hypot(dx, dy) <= v.rangePx
        if (sees && v.half < Math.PI) {
          let ad = Math.atan2(dy, dx) - facingToAngle(v.char.getFacing())
          ad = Math.atan2(Math.sin(ad), Math.cos(ad)) // normalise to [-π, π]
          sees = Math.abs(ad) <= v.half
        }
        if (sees && v.cfg.unless && checkCondition(state, v.cfg.unless)) sees = false
        if (sees && !nav.los(disp.x, disp.y, px, py)) sees = false
      }
      if (sees && !v.seen && !(v.cfg.once && v.fired)) {
        run(v.cfg.effects, v.id) // the stealth beat — the watcher is the subject
        v.fired = true
      }
      v.seen = sees
    }
  }

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  // The game hides the native cursor (the DOM GameCursor draws the pointer). The editor's live
  // view has no GameCursor, so keep the native cursor there (else it vanishes over the canvas).
  app.stage.cursor = gameplayInput ? 'none' : 'default'
  const onTap = (event: FederatedPointerEvent) => {
    // Dialogue / a running cutscene capture input; the world isn't clickable.
    if (dialogueStore.getState().active || sequenceStore.getState().active) return
    const local = interactive.toLocal(event.global)
    const state = store.getState()
    const hit = pickInteractable(scene.interactables, local.x, local.y, design, state)
    const selected = state.selectedItem
    if (selected) store.getState().select(null) // any click consumes the selection
    // "look at" flavour (inspect has its own `text`, handled below).
    if (hit && hit.kind !== 'inspect' && hit.examine && !selected) {
      store.getState().say(hit.examine)
    }

    // Using the selected item on the object (if it has a matching rule).
    if (hit && selected) {
      const usageEffects = effectsForUse(hit, selected)
      if (usageEffects) {
        character.setTarget(local.x, local.y, () => run(usageEffects), 'interact')
        return
      }
    }
    // Walk to the interactable, then: for `inspect` the protagonist comments
    // (text + optional voice), otherwise run its effects. Or just walk.
    if (hit && hit.kind === 'inspect') {
      const { text, audio } = hit
      character.setTarget(local.x, local.y, () => {
        if (text) store.getState().say(text)
        // Dynamic import keeps audio out of the editor preview's module graph.
        if (audio) void import('../audio/audio').then((m) => m.playSoundById(audio))
      })
    } else if (hit) {
      const effects = effectsFor(hit)
      character.setTarget(local.x, local.y, () => run(effects), ONE_SHOT[hit.kind])
    } else {
      character.setTarget(local.x, local.y)
    }
  }
  if (gameplayInput) app.stage.on('pointertap', onTap)

  // M9 audio: this scene's ambient bed (its own `ambient` if its `when` passes, else the
  // document default) + footsteps while the player walks. The dynamic import keeps audio
  // out of the editor preview's module graph; `audioMod` then drives footsteps per-frame.
  // NPCs with their own footsteps (M9 9c) — each gets a footstep channel keyed by its id.
  const footstepNpcs = npcs.filter((n) => cast[n.id]?.footstep)
  if (!muteAudio) {
    void import('../audio/audio').then((m) => {
      if (torn) return
      audioMod = m
      const a = scene.ambient
      const ambient =
        a && (!a.when || checkCondition(store.getState(), a.when)) ? a : audio.ambient
      m.applySceneAudio({ ambient, footstep: audio.footstep, footstepsOff: audio.footstepsOff })
      applyWeatherAmbient() // the active weather's loop (resolved now the module is ready)
      for (const n of footstepNpcs) {
        const fs = cast[n.id]?.footstep
        m.setFootstepSound(n.id, m.resolveSrc(fs?.sound) ?? null, fs?.volume ?? 0.5)
      }
    })
  }

  const onTick = (ticker: Ticker) => {
    character.update(ticker.deltaMS)
    for (const n of npcs) n.character.update(ticker.deltaMS)
    updateCamera(ticker.deltaMS)
    atmosphere.update(ticker.deltaMS)
    lighting?.update(
      store.getState(),
      character.displayObject.x,
      character.displayObject.y,
      character.getFacing(),
    )
    // Gameplay reactions (enter triggers, stealth vision) only in the game. The editor's live
    // view authors over the world — firing a `startSequence` trigger there would grab the
    // stage with a cutscene that can't be advanced (no input), freezing NPC routines. Drive
    // state from the World window instead.
    if (gameplayInput) {
      checkTriggers()
      checkVision()
    }
    audioMod?.setFootstepsMoving('player', character.isMoving())
    for (const n of footstepNpcs)
      audioMod?.setFootstepsMoving(n.id, n.character.displayObject.visible && n.character.isMoving())
  }
  app.ticker.add(onTick)

  // Scene-entry effects (M8): run once on mount — e.g. a scene-entry cutscene
  // (`startSequence`) or setting a flag. Deferred a microtask so the first frame /
  // camera is in place before a cutscene grabs the stage. Skipped in the editor's live view
  // (same reason as triggers — it shows the base world; drive state from the World window).
  if (gameplayInput && scene.onEnter?.length) queueMicrotask(() => run(scene.onEnter ?? []))

  // ME.6 hot-param live apply: the editor calls `applyLive` on every doc edit; each hot system
  // is diffed against the mount's values so only what changed is re-applied (atmosphere is the
  // expensive one — a full lightmap rebuild — hence the tight hash).
  const atmoHash = (sc: SceneData, a: PreviewAtmosphere): string =>
    JSON.stringify([
      sc.ambientLight,
      sc.lights,
      sc.darkAreas,
      sc.weather,
      a.ambientLight,
      a.playerLight,
      a.weatherPresets,
    ])
  const castHash = (c: Record<NpcId, NpcDef>): string =>
    JSON.stringify(npcs.map((n) => [n.id, c[n.id]?.speed ?? 1]))
  let lastAtmoHash = atmoHash(scene, {
    ambientLight: lightingDefaults.ambientLight,
    playerLight: lightingDefaults.playerLight,
    weatherPresets,
  })
  let lastCharScale = scene.characterScale ?? 1
  let lastCastHash = castHash(cast)

  let torn = false
  return {
    destroy() {
      if (torn) return
      torn = true
      sceneHit.kindAt = null
      // Stop footsteps + drop the NPC channels (the scene ambient is swapped by the next
      // mount; the per-scene weather ambient is stopped here).
      audioMod?.setFootstepsMoving('player', false)
      for (const n of footstepNpcs) audioMod?.setFootstepSound(n.id, null)
      audioMod?.setAmbient('weather', null)
      // Close a conversation / cutscene tied to this scene (e.g. a `goTo` swapped scenes).
      if (dialogueStore.getState().active) dialogueStore.getState().end()
      if (sequenceStore.getState().active) sequenceStore.getState().end()
      unsubscribeVisibility()
      app.ticker.remove(onTick)
      app.stage.off('pointertap', onTap)
      app.stage.eventMode = 'auto'
      app.stage.hitArea = null
      app.stage.cursor = 'default'
      app.stage.sortableChildren = false
      character.destroy()
      for (const n of npcs) n.character.destroy()
      lighting?.destroy() // frees the lightmap render-texture (not a world child)
      atmosphere.destroy() // removes the screen-space `screenFx` (world slots ride world.destroy)
      world.destroy({ children: true })
    },
    // Re-apply the hot params in place (the editor; the game never calls this). Each is diffed
    // so a cheap edit (e.g. NPC speed) doesn't rebuild the expensive lightmap.
    applyLive({ scene: sc, atmo, cast: castNow }) {
      if (torn) return
      // Atmosphere (weather + lighting) — swap in the edited scene + doc defaults, rebuild.
      const ah = atmoHash(sc, atmo)
      if (ah !== lastAtmoHash) {
        lastAtmoHash = ah
        weatherScene = sc
        weatherPresetsRef = atmo.weatherPresets ?? {}
        lightScene = sc
        lightDefaults = { ambientLight: atmo.ambientLight, playerLight: atmo.playerLight }
        weatherSystem?.destroy()
        weatherSystem = null
        weatherId = null
        syncWeather(store.getState())
        buildLighting()
      }
      // Character size — the per-scene multiplier on top of each actor's depth scale.
      const cs = sc.characterScale ?? 1
      if (cs !== lastCharScale) {
        lastCharScale = cs
        for (const a of actors.values()) a.setCharScale(cs)
      }
      // NPC walk speed (per cast def).
      const ch = castHash(castNow)
      if (ch !== lastCastHash) {
        lastCastHash = ch
        for (const n of npcs) n.character.setSpeedScale(castNow[n.id]?.speed ?? 1)
      }
    },
  }
}

/** Document-level atmosphere config the editor preview needs (M10 ME.0). */
export interface PreviewAtmosphere {
  ambientLight?: AmbientLight
  playerLight?: PlayerLight
  weatherPresets?: Record<WeatherId, WeatherPreset>
}

/** The latest doc pieces the editor's live preview re-applies as it edits — the **hot**
 *  params that update in place (no re-mount). The host diffs each internally and applies only
 *  what changed, so this is the single place hot params are wired (ME.6 policy). */
export interface LivePatch {
  /** The edited scene — its atmosphere (ambient / lights / dark areas / weather) + character
   *  size multiplier. */
  scene: SceneData
  /** Document-level atmosphere defaults (ambient / player light / weather presets). */
  atmo: PreviewAtmosphere
  /** The cast — for hot per-NPC params (currently walk speed). */
  cast: Record<NpcId, NpcDef>
}

/** A mounted editor preview — like a Scene, but its **hot** params (atmosphere, character
 *  size, NPC speed) can be re-applied live as the author edits, without re-mounting. */
export interface PreviewScene extends Scene {
  applyLive(patch: LivePatch): void
}

/**
 * Make an image layer draggable in the editor's live world: drag to move it, then
 * commit the new fractional position on release. Only the dragged sprite moves, so
 * it's smooth; the store just records where it landed.
 */
function makeLayerDraggable(
  display: Container,
  index: number,
  screen: Size,
  onMove: (index: number, xFrac: number, yFrac: number) => void,
  axis: 'xy' | 'y' = 'xy',
  /** Called each move with the new (px) position — the live world keeps a parallax layer's
   *  rest base in sync so the camera's per-frame pin doesn't snap the drag back. */
  onMoveLive?: (x: number, y: number) => void,
): void {
  const clamp = (v: number, hi: number) => Math.max(0, Math.min(hi, v))
  display.eventMode = 'static'
  display.cursor = axis === 'y' ? 'ns-resize' : 'move'
  let dragging = false
  // Offset from the pointer to the sprite origin at grab time, so the layer moves
  // relative to where it was grabbed (no jump) and resumes from its saved spot.
  let grabX = 0
  let grabY = 0
  display.on('pointerdown', (e: FederatedPointerEvent) => {
    if (!display.parent) return
    dragging = true
    // Work in the parent's (design) space, so the drag tracks the pointer through
    // the preview's fit scale.
    const p = display.parent.toLocal(e.global)
    grabX = display.position.x - p.x
    grabY = display.position.y - p.y
  })
  display.on('globalpointermove', (e: FederatedPointerEvent) => {
    if (!dragging || !display.parent) return
    const p = display.parent.toLocal(e.global)
    const x = axis === 'y' ? display.position.x : clamp(p.x + grabX, screen.width)
    const y = clamp(p.y + grabY, screen.height)
    display.position.set(x, y)
    onMoveLive?.(x, y)
  })
  const drop = () => {
    if (!dragging) return
    dragging = false
    onMove(index, display.position.x / screen.width, display.position.y / screen.height)
  }
  display.on('pointerup', drop)
  display.on('pointerupoutside', drop)
}

/** Fade duration each way, in ms; and how long a mount may run before the loading
 *  spinner appears (so quick swaps stay clean). */
const FADE_MS = 180
const SPINNER_DELAY_MS = 220

/**
 * Mounts whichever scene the store says is current, and swaps when it changes.
 * Swaps **fade through a wash** (`GameDoc.transition`: colour / art / min hold;
 * default black) — fade out → destroy + mount → fade in — so the async mount and the
 * hard cut are hidden (no blank frame), and a slow mount shows a loading spinner.
 * The first scene fades in. Swaps are deferred to a microtask so a transition fired
 * from inside the ticker (click → walk → goTo) never tears the old scene down mid-update.
 */
export function createSceneHost(
  app: Application,
  scenes: Record<SceneId, SceneData>,
  store: SceneStore,
  playerView: ViewDescriptor = placeholderView,
  referenceHeight: number = DEFAULT_REFERENCE_HEIGHT,
  transition?: TransitionConfig,
  cast: Record<NpcId, NpcDef> = {},
  dialogs: Record<DialogId, Dialog> = {},
  sequences: Record<SequenceId, Sequence> = {},
  audio: AudioConfig = {},
  weatherPresets: Record<WeatherId, WeatherPreset> = {},
  lightingDefaults: { ambientLight?: AmbientLight; playerLight?: PlayerLight } = {},
  options: SceneOptions = {},
): SceneHost {
  let current: PreviewScene | undefined
  let destroyed = false
  let shownId: SceneId | undefined

  // Each NPC's start scene: its `home`, else the first scene it's placed in. The runtime
  // location (`StoryState.npcScene`) defaults to this; `moveNpc` / `despawnNpc` override it.
  const npcHome: Record<NpcId, SceneId> = {}
  for (const [sid, sc] of Object.entries(scenes)) {
    for (const p of sc.npcs ?? []) {
      if (!(p.npc in npcHome)) npcHome[p.npc] = cast[p.npc]?.home ?? sid
    }
  }

  // The per-NPC routine engine — runs globally (independent of the mounted scene) so
  // routine NPCs travel between scenes on their own. Created before the first mount so it
  // seeds each routine NPC's start node (→ `npcScene`/`npcNode`) before the scene reads it.
  // The `isBusy` predicate freezes an NPC's routine while the player is talking to it.
  // Timing of an NPC's current `once` path, so the runner can complete an `onArrive` edge by
  // the estimated walk time when its scene isn't mounted (B-lite persistent routines). On-scene
  // the visual walk drives arrival, so this only times out off-scene.
  const pathInfo = (npcId: NpcId): RoutinePathInfo | null => {
    const routine = cast[npcId]?.routine
    if (!routine) return null
    const node = routineNode(routine, store.getState().npcNode?.[npcId])
    if (!node?.pathId) return null
    const sc = scenes[node.scene]
    const path = sc?.npcs?.find((p) => p.npc === npcId)?.paths?.find((p) => p.id === node.pathId)
    if (!path || path.mode !== 'once') return null
    const len = polylineLengthPx(path.points, designSize(sc, referenceHeight))
    const speed = WALK_SPEED * (cast[npcId]?.speed ?? 1)
    if (len <= 0 || speed <= 0) return null
    return { durationMs: (len / speed) * 1000, onScene: node.scene === shownId }
  }
  const routines = createRoutineRunner(
    cast,
    store,
    (npc) => {
      if (sequenceStore.getState().active) return true // a cutscene owns the stage
      const d = dialogueStore.getState()
      return d.active && d.partner === npc
    },
    pathInfo,
  )
  const onRoutineTick = (ticker: Ticker) => routines.tick(ticker.deltaMS)
  app.ticker.add(onRoutineTick)

  // The overlay swaps cross through: a colour wash (default black) + optional art,
  // animated on the ticker. Starts opaque so the first mount fades in. A huge rect
  // covers any viewport size.
  app.stage.sortableChildren = true
  const fade = new Container()
  fade.zIndex = 10000
  fade.eventMode = 'none'
  fade.alpha = 1
  const wash = new Graphics()
    .rect(-5000, -5000, 10000, 10000)
    .fill({ color: transition?.color ?? 0x000000 })
  fade.addChild(wash)
  app.stage.addChild(fade)

  // Optional transition art, centred + covering the viewport (placed each tick).
  let art: Sprite | undefined
  if (transition?.image) {
    void Assets.load(transition.image).then((tex) => {
      if (destroyed) return
      art = new Sprite(tex)
      art.anchor.set(0.5)
      fade.addChild(art)
    })
  }

  // Loading spinner — a rotating arc in the corner, above the wash, shown only when
  // a mount outlasts SPINNER_DELAY_MS.
  const spinner = new Graphics()
    .arc(0, 0, 13, 0, Math.PI * 1.5)
    .stroke({ width: 3, color: 0xffffff, alpha: 0.85, cap: 'round' })
  spinner.zIndex = 10001
  spinner.eventMode = 'none'
  spinner.visible = false
  app.stage.addChild(spinner)

  let fadeTarget = 1
  let fadeResolve: (() => void) | null = null
  const onFadeTick = (ticker: Ticker) => {
    if (spinner.visible) {
      spinner.position.set(app.screen.width - 38, app.screen.height - 38)
      spinner.rotation += ticker.deltaMS / 110
    }
    if (art && fade.alpha > 0) {
      art.position.set(app.screen.width / 2, app.screen.height / 2)
      art.scale.set(
        Math.max(app.screen.width / art.texture.width, app.screen.height / art.texture.height),
      )
    }
    if (fade.alpha === fadeTarget) return
    const step = ticker.deltaMS / FADE_MS
    fade.alpha =
      fade.alpha < fadeTarget
        ? Math.min(fadeTarget, fade.alpha + step)
        : Math.max(fadeTarget, fade.alpha - step)
    if (fade.alpha === fadeTarget && fadeResolve) {
      fadeResolve()
      fadeResolve = null
    }
  }
  app.ticker.add(onFadeTick)

  const fadeTo = (target: number): Promise<void> => {
    fadeTarget = target
    if (fade.alpha === target) return Promise.resolve()
    return new Promise((resolve) => {
      fadeResolve = resolve
    })
  }

  async function show(id: SceneId): Promise<void> {
    if (destroyed || id === shownId) return
    shownId = id
    if (current) await fadeTo(1) // fade out (the first scene is already washed)
    if (destroyed) return
    current?.destroy()
    current = undefined
    // The fade-in never starts until the new scene (and its assets) is fully mounted;
    // a slow mount raises the spinner, and `minMs` can hold a styled wash longer.
    const startedAt = performance.now()
    const spinTimer = setTimeout(() => {
      if (!destroyed) spinner.visible = true
    }, SPINNER_DELAY_MS)
    const mounted = await mountScene(
      app,
      scenes[id],
      store,
      playerView,
      referenceHeight,
      cast,
      dialogs,
      npcHome,
      sequences,
      audio,
      weatherPresets,
      lightingDefaults,
      // Seed routine NPCs at their global path progress so they resume mid-walk (B-lite).
      { ...options, npcPathProgress: (npc) => routines.progressOf(npc) },
    )
    clearTimeout(spinTimer)
    spinner.visible = false
    if (destroyed || shownId !== id) {
      mounted.destroy()
      return
    }
    const wait = (transition?.minMs ?? 0) - (performance.now() - startedAt)
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    if (destroyed || shownId !== id) {
      mounted.destroy()
      return
    }
    current = mounted
    await fadeTo(0) // fade in
  }

  const sync = () => {
    const id = store.getState().currentScene
    if (id !== shownId) queueMicrotask(() => void show(id))
  }

  sync() // initial mount
  const unsubscribe = store.subscribe(sync)

  return {
    applyLive(patch) {
      current?.applyLive(patch)
    },
    destroy() {
      destroyed = true
      unsubscribe()
      app.ticker.remove(onFadeTick)
      app.ticker.remove(onRoutineTick)
      routines.destroy()
      current?.destroy()
      current = undefined
      // Stop the ambient beds (no next scene to swap them) when the world tears down.
      // Skipped when muted (the editor's live view) — nothing started, so don't load audio.
      if (!options.muteAudio)
        void import('../audio/audio').then((m) => {
          m.setAmbient('scene', null)
          m.setAmbient('weather', null)
        })
      spinner.destroy()
      fade.destroy({ children: true })
    },
  }
}
