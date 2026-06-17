// The serializable game document — the data the runtime plays and the editor
// edits. This is the project's public schema (eventual npm API): keep it minimal
// and extend via discriminated-union `kind`s, which stays backward-compatible.
//
// Coordinate convention: ALL positions/polygons are FRACTIONS (0..1) of the
// scene's design space — its `width` × the document `referenceHeight` (px) — so a
// document is resolution-independent. At mount the engine resolves them to px and
// fits the design *height* to the viewport (one uniform scale; the camera scrolls
// the width). Runtime story state lives in src/state/story.ts; the Condition/Effect
// evaluator in src/systems/conditions.ts.

export type SceneId = string
export type ItemId = string
export type FlagId = string
export type DialogId = string
export type NpcId = string

/** Which depth band a layer sits in (background < mid < foreground). */
export type SceneBand = 'background' | 'mid' | 'foreground'

/** What a layer is for beyond drawing — drives editor tooling + runtime roles. */
export type LayerRole = 'scenery' | 'occluder' | 'floor'

/**
 * How an `image` layer sizes to the viewport (default 'none' = natural size).
 * 'width' fills the width keeping aspect (a horizontal strip) and is positioned
 * vertically by `yFrac` — for composing scenes from sky / land / road bands.
 */
export type LayerFit = 'stretch' | 'cover' | 'contain' | 'width' | 'none'

/** Flat polygon as fractions [x0, y0, x1, y1, ...]. */
export type Polygon = number[]

/** One point on a scene's depth curve: the character's `scale` when its feet sit
 *  at `yFrac` (a fraction of the design height). */
export interface DepthStop {
  yFrac: number
  scale: number
}

/**
 * Per-scene 2.5D perspective (fractions of the design height). `stops` (≥2 points),
 * when set, defines the scale curve (piecewise-linear, clamped at the ends);
 * otherwise the near/far pair is used as a 2-point ramp.
 */
export interface DepthConfig {
  yNearFrac: number
  yFarFrac: number
  scaleNear: number
  scaleFar: number
  stops?: DepthStop[]
}

/** One animation: frame indices into the atlas grid + playback. */
export interface AnimClip {
  frames: number[]
  fps: number
  loop: boolean
  /** A library `SoundId` auto-played when this clip runs as a one-shot (e.g. `interact`).
   *  M9 9c — so a gesture's sound isn't hand-chained with a separate `playSound`. */
  sound?: SoundId
}

/**
 * A character's view: a baked sprite atlas + how to play it. Drives the swappable
 * `AnimatedSprite` view (entities/sprite-view.ts) — the placeholder figure and real
 * uploaded atlases share this shape. `clips` are keyed by state (e.g. `idle`,
 * `walk`); 8-direction keys (e.g. `walk.E`) arrive in M5.2.
 */
export interface ViewDescriptor {
  /** Atlas image URL (a data-URL for the placeholder / uploads). */
  atlas: string
  frameWidth: number
  frameHeight: number
  /** Frames per row in the atlas grid. */
  columns: number
  /** Sprite anchor (0..1); feet at the bottom = `anchorY: 1`. */
  anchorX: number
  anchorY: number
  clips: Record<string, AnimClip>
}

export type SoundId = string

/** One clip in the global sound library (`GameDoc.sounds`): uploaded once, referenced by
 *  id everywhere (ambient, footstep, `playSound`, voice, inspect). `src` is a URL / data-URL. */
export interface SoundAsset {
  id: SoundId
  name: string
  src: string
}

/** A sound **reference** + an optional volume (0..1). `sound` is a `SoundId` into the
 *  library — never an inline clip; upload it in the Sounds tab first. */
export interface SoundConfig {
  sound: SoundId
  volume?: number
}

export interface ItemDef {
  id: ItemId
  name: string
  /** Inventory icon (image/SVG URL); optional while using placeholders. */
  icon?: string
  /** "Look at" flavour text shown when the item is examined. */
  examine?: string
}

/** Combining `a` + `b` (order-independent) consumes both and yields `output`. */
export interface Recipe {
  a: ItemId
  b: ItemId
  output: ItemId
}

// --- Logic vocabulary (serializable; evaluated by systems/conditions.ts) ----

export type Condition =
  | { kind: 'hasItem'; item: ItemId }
  | { kind: 'flag'; flag: FlagId; value?: boolean }
  | { kind: 'visited'; scene: SceneId }
  | { kind: 'all'; of: Condition[] }
  | { kind: 'any'; of: Condition[] }
  | { kind: 'not'; of: Condition }

export type Effect =
  | { kind: 'setFlag'; flag: FlagId; value?: boolean }
  | { kind: 'giveItem'; item: ItemId }
  | { kind: 'takeItem'; item: ItemId }
  | { kind: 'goTo'; scene: SceneId }
  | { kind: 'startDialog'; dialog: DialogId }
  // Play a cutscene (id into `GameDoc.sequences`); blocks input until it ends / is skipped.
  | { kind: 'startSequence'; sequence: SequenceId }
  // Move a cast NPC to another scene (its runtime location; needs a placement there)
  // or remove it from play. Drive cross-scene NPC behaviour from dialogue / triggers.
  | { kind: 'moveNpc'; npc: NpcId; scene: SceneId }
  | { kind: 'despawnNpc'; npc: NpcId }
  // Engine effects (touch the scene / characters, not the story state):
  | { kind: 'playSound'; sound: string }
  | { kind: 'playAnim'; action: string; target?: string }
  // Lingers the *entering* actor (an NPC / dialogue partner) for `ms`, optionally
  // looping `anim` meanwhile. Never pauses the player. Composes with `playAnim`
  // ("longest wins" — the actor resumes once the longest pause has elapsed).
  | { kind: 'wait'; ms: number; anim?: string }
  // Holds an idle posture on `target` (default the player) — a looping clip shown in
  // place of the default idle until cleared (omit `action`). Walking still animates
  // normally. For crouch-at-cover: set on arrival, clear on exit.
  | { kind: 'setStance'; action?: string; target?: string }

/** Using `item` on an interactable runs `effects`. */
export interface UseRule {
  item: ItemId
  effects: Effect[]
}

// --- Dialogue ---------------------------------------------------------------

export type DialogNodeId = string

/** One selectable reply at a choice node: offered when `when` passes; picking it runs
 *  `effects`, then goes to `next` (absent → ends the dialogue). */
export interface DialogChoice {
  text: string
  when?: Condition
  effects?: Effect[]
  next?: DialogNodeId
}

/** A conditional jump evaluated when a node is entered (a state-driven router): the
 *  first branch whose `when` passes redirects to `to`, showing nothing of this node. */
export interface DialogBranch {
  when?: Condition
  to: DialogNodeId
}

/**
 * One step of a dialogue. On entry, `branch` routes first (state-driven openings,
 * evaluated against the incoming state); if none matches, `effects` run and `text` is
 * shown (spoken by `speaker` — a character id, or the conversation partner when
 * absent). `choices` present replies; otherwise it is a click-to-continue line that
 * advances to `next` (absent → ends).
 */
export interface DialogNode {
  speaker?: string
  text?: string
  effects?: Effect[]
  choices?: DialogChoice[]
  next?: DialogNodeId
  branch?: DialogBranch[]
}

/** A reusable dialogue tree: nodes entered from `start`. Lives in the `GameDoc.dialogs`
 *  library; referenced by an NPC (`NpcDef.dialog`) or a placement override. */
export interface Dialog {
  start: DialogNodeId
  nodes: Record<DialogNodeId, DialogNode>
}

// --- Cutscenes / scripted sequences (M8) ------------------------------------

export type SequenceId = string

/**
 * One step of a cutscene, run in order by the sequence runner. Steps that take time
 * (`wait`, `move`, `anim`, `dialog`, `camera`) are awaited before the next runs; `face`
 * and `effects` are instant. `actor` is an actor id (`'player'` or a cast NPC id) in the
 * current scene. Positions are design-space fractions. A cutscene plays in the mounted
 * scene (an `effects` step's `goTo` ends it by swapping scenes).
 */
export type SeqStep =
  | { kind: 'wait'; ms: number }
  // Walk `actor` to a point along the nav-mesh; awaits arrival.
  | { kind: 'move'; actor: string; to: { xFrac: number; yFrac: number } }
  // Play a one-shot animation on `actor`; awaits completion.
  | { kind: 'anim'; actor: string; action: string }
  // Turn `actor` to face a point (instant).
  | { kind: 'face'; actor: string; to: { xFrac: number; yFrac: number } }
  // Play a dialogue tree (reuses the dialogue runtime); awaits its end.
  | { kind: 'dialog'; dialog: DialogId }
  // Run state / engine effects instantly (setFlag / giveItem / playSound / moveNpc …).
  | { kind: 'effects'; effects: Effect[] }
  // Move the camera: focus a point or follow an `actor`, with optional `zoom` (1 = the
  // normal height-fill), transitioning over `ms`; awaits the transition. Released (back
  // to following the player) when the cutscene ends.
  | {
      kind: 'camera'
      actor?: string
      to?: { xFrac: number; yFrac: number }
      zoom?: number
      ms?: number
    }

/** A reusable cutscene: an ordered list of steps. Lives in `GameDoc.sequences`; started
 *  by the `startSequence` effect (from a trigger / interaction / dialogue / scene-entry). */
export interface Sequence {
  steps: SeqStep[]
}

// --- Atmosphere: weather / particles (M10 10a) ------------------------------

export type WeatherId = string

/** Particle shape: a soft round dot (snow / dust) or a thin streak (rain). */
export type WeatherShape = 'round' | 'streak'

/**
 * A **parametric** weather/particle preset (not per-weather code): all sliders. Lives in
 * `GameDoc.weatherPresets`; a scene references it via `SceneData.weather` (gated by `when`).
 * Pre-seeded rain / snow / dust are editable like any preset.
 */
export interface WeatherPreset {
  id: WeatherId
  name: string
  /** Target particle count (capped by the quality budget). */
  count: number
  /** Particle colour (hex) + opacity. */
  color: string
  alpha: number
  /** Particle size in px. */
  size: number
  shape: WeatherShape
  /** Fall direction in degrees (90 = straight down; <90 leans right = wind). */
  angle: number
  /** Fall speed in px/sec. */
  speed: number
  /** Horizontal sway amplitude (px) + frequency (cycles/sec) — drift for snow / dust. */
  sway: number
  swayFreq: number
  /** Blend: `add` makes snow / dust glow; `normal` for rain. */
  blend: 'normal' | 'add'
  /** A looping **ambient sound** (a library reference) played while this weather is active,
   *  layered *over* the scene's ambient (e.g. a rain / wind loop). M10 10a. */
  ambient?: SoundConfig
}

/**
 * A **localized point emitter** (M10) — particles streaming from one scene position: chimney
 * smoke, a fire's embers, a dripping pipe, a dust plume. Unlike full-screen weather it's
 * **world-space** (placed at a scene point, scrolls with the scene). Each particle is launched
 * along `angle` (± `spread`) at `speed`, accelerated by `gravity` (negative = rises), grows by
 * `grow`, fades over `life`, then respawns. Placed in the editor like a light, gated by `when`.
 */
export interface PointEmitter {
  id: string
  /** Emission point — scene fractions (0..1). */
  x: number
  y: number
  /** Particles spawned per second (live count ≈ rate × life, capped by the quality budget). */
  rate: number
  /** Particle lifetime in seconds (fades to 0 over it). */
  life: number
  color: string
  alpha: number
  /** Start size in px; grows by `grow` px/sec. */
  size: number
  grow: number
  shape: WeatherShape
  /** Launch direction in degrees (90 = down, -90 / 270 = up) + random spread (± deg). */
  angle: number
  spread: number
  /** Initial speed (px/sec) + vertical acceleration (px/sec²; negative rises like smoke). */
  speed: number
  gravity: number
  /** Spawn jitter radius around the point (px). */
  spawnRadius: number
  blend: 'normal' | 'add'
  /** Shown only while this Condition holds (else always). */
  when?: Condition
}

/**
 * Animated **fog / clouds** (M10 10c) — a scrolling soft-noise fake (not volumetrics). A back
 * layer sits behind characters; `frontOpacity` adds a faster layer over them for depth.
 */
export interface FogConfig {
  color: string
  /** Back-layer drift velocity (px/sec) — horizontal + vertical, so the fog can flow any
   *  direction (negative = the other way). The front layer leads faster for a depth feel. */
  parallaxX: number
  parallaxY: number
  /** Noise pattern seed — change it for a different cloud shape (deterministic). */
  seed: number
  /** Noise **aspect** — relative width / height of the cloud texture. */
  scaleX: number
  scaleY: number
  /** Overall noise zoom as a **percent** (100 = the W/H above unchanged) — scales W and H
   *  together, keeping their ratio. */
  scale: number
  /** Back-layer opacity (0 = none) + its **depth** (world zIndex: scene bands are background 0,
   *  characters 10, foreground 20 — so 8 = behind characters & in front of the background). */
  opacity: number
  backZ: number
  /** Optional: place the **back** layer **behind this scene layer** (index into
   *  `SceneData.layers`) — slots it inside that layer's band (e.g. behind the buildings, over
   *  the sky) instead of using `backZ`. The front layer always stays a world overlay. */
  backLayer?: number
  /** Front-layer opacity (0 = none) + its depth (e.g. 26 = over the whole scene). */
  frontOpacity: number
  frontZ: number
}

/**
 * Per-scene **colour grade** (M10 10d) — a `ColorMatrixFilter` over the scene art (brightness /
 * contrast / saturation / hue). The mood pass on top of the painted layers; lighting + weather
 * still composite over it.
 */
export interface ColorGrade {
  /** 1 = unchanged. */
  brightness: number
  contrast: number
  saturation: number
  /** Hue rotation in degrees (0 = unchanged). */
  hue: number
}

/** A **vignette** (M10 10d) — a soft darkened frame, screen-space. */
export interface Vignette {
  /** Edge darkness 0..1. */
  intensity: number
  /** How far in the dark reaches (0 = thin rim, 1 = most of the frame). */
  size: number
  /** Tint of the darkening (usually black). */
  color: string
}

/** **Lightning + thunder** (M10 10d) — a screen-space flash on a random interval, with an
 *  optional thunder `SoundId` a beat later. Gated by `when` (e.g. only during a storm). */
export interface LightningConfig {
  color: string
  /** Peak flash opacity 0..1. */
  intensity: number
  /** Min / max seconds between flashes (a random wait in the range). */
  minGap: number
  maxGap: number
  /** Thunder sound (library reference), played shortly after the flash. */
  sound?: SoundId
  /** Only active while this Condition holds. */
  when?: Condition
}

// --- Atmosphere: lighting (M10 10b) -----------------------------------------

/** Global/ambient light level — a scene-wide tint + darken. `intensity` 1 = full daylight,
 *  0 = black (a dark scene the player lights with a flashlight). `color` tints the dark
 *  (e.g. cold blue night). `GameDoc.ambientLight` is the project default; `SceneData`
 *  overrides per scene. */
export interface AmbientLight {
  color: string
  intensity: number
}

/** A placed local light — an additive glow pool (in the lightmap) that brightens / reveals
 *  the scene. Positions are design-space fractions. Gated by `when` (a switch flag). Like the
 *  player light it has a **shape** (sphere / cone) + **deform** (rotation, width, height). */
export interface LightSource {
  id: string
  x: number
  y: number
  /** Radius as a fraction of the design height. */
  radius: number
  color: string
  /** Brightness (0..~2). */
  intensity: number
  /** Flicker amount 0..1 (candle / fire / broken neon); 0 = steady. */
  flicker?: number
  /** `sphere` (radial, default) or `cone` (directional, aimed by `rotation`). */
  shape?: PlayerLightShape
  /** Cone width in degrees (cone shape). */
  angle?: number
  /** Rotation in degrees (aims a cone; rotates a deformed sphere). */
  rotation?: number
  /** Width / height deform (multipliers on the radius; default 1 → a circle). */
  scaleX?: number
  scaleY?: number
  when?: Condition
}

/** A dark zone cut into an otherwise-lit scene: a polygon (design fractions) pushed toward
 *  black in the lightmap, with a feathered (`feather`) gradient edge. Visual only. */
export interface DarkArea {
  polygon: Polygon
  /** Edge softness as a fraction of the design height (blur radius); default a small value. */
  feather?: number
}

export type PlayerLightShape = 'sphere' | 'cone'

/** The light the player carries (M10 10b) — a radial **sphere** around them, or a **cone**
 *  following their facing. Reveals the scene in a dark area. Gated by `when` (e.g.
 *  `hasItem: flashlight`). Global (`GameDoc.playerLight`). */
export interface PlayerLight {
  shape: PlayerLightShape
  /** Reach as a fraction of the design height. */
  radius: number
  color: string
  intensity: number
  /** Cone width in degrees (cone shape only). */
  angle?: number
  when?: Condition
}

// --- Scene content ----------------------------------------------------------

/**
 * One stacked part of a scene. `image` is the art target (SVG/PNG URL — fully
 * serializable); `builtin` references a code-registered painter by key (with an
 * optional numeric `params` bag), for geometric placeholders. `anchorYFrac` on a
 * `mid` layer drives Y-sort + depth scale. `when` toggles visibility reactively.
 */
export type LayerData =
  | {
      kind: 'image'
      band: SceneBand
      /** Parallax scroll factor: 1 = moves with the world (default), <1 = farther /
       *  slower, 0 = locked to the viewport, >1 = nearer / faster. Background &
       *  foreground only (mid is the gameplay plane). */
      parallax?: number
      src: string
      xFrac?: number
      yFrac?: number
      anchorYFrac?: number
      role?: LayerRole
      fit?: LayerFit
      when?: Condition
    }
  | {
      kind: 'builtin'
      band: SceneBand
      /** Parallax scroll factor (see the `image` variant). */
      parallax?: number
      builder: string
      params?: Record<string, number>
      anchorYFrac?: number
      role?: LayerRole
      when?: Condition
    }

/**
 * A clickable thing in a scene, gated by an optional `when` Condition. `uses`
 * lets an item be used on it (select item in inventory → click the object).
 */
export type InteractableData =
  | {
      kind: 'pickable'
      id: string
      item: ItemId
      hitArea: Polygon
      examine?: string
      when?: Condition
      effects?: Effect[]
    }
  | {
      kind: 'interact'
      id: string
      hitArea: Polygon
      examine?: string
      when?: Condition
      effects: Effect[]
      uses?: UseRule[]
    }
  | {
      kind: 'exit'
      id: string
      to: SceneId
      hitArea: Polygon
      examine?: string
      when?: Condition
      effects?: Effect[]
      uses?: UseRule[]
    }
  | {
      kind: 'inspect'
      id: string
      hitArea: Polygon
      /** What the protagonist says when this is clicked. */
      text?: string
      /** Optional voice clip (audio URL) played alongside the text. */
      audio?: string
      when?: Condition
    }
  | {
      // A volume that runs `effects` when a character's feet ENTER it (not on a
      // click) — for sounds, animations, cutscenes, stealth beats, NPC chaining.
      kind: 'trigger'
      id: string
      hitArea: Polygon
      effects: Effect[]
      /** When `effects` fire: `'enter'` (default) when feet cross in, or `'rest'` when a
       *  character comes to a stop inside (reaches a target there) — e.g. crouch at cover
       *  only on arrival, not while passing through. */
      on?: 'enter' | 'rest'
      /** Effects run when a character LEAVES the area (the exit edge) — e.g. un-set a
       *  `hidden` flag when stepping out of cover. */
      exitEffects?: Effect[]
      /** Who fires it: the player, an NPC, or any character (default 'player'). */
      by?: 'player' | 'npc' | 'any'
      /** Fire once per scene visit (always debounced to the enter edge). */
      once?: boolean
      when?: Condition
    }

/**
 * An NPC's stealth vision. Each frame the engine checks the player against the NPC's
 * range + cone (the cone follows the NPC's facing; omit `angle` for all-round) with
 * line-of-sight (obstacle holes occlude). On the first detection it runs `effects` (the
 * stealth beat); `unless` suppresses detection (e.g. the player is `hidden` at cover).
 */
export interface VisionConfig {
  /** Detection range as a fraction of the design height. */
  range: number
  /** Cone width in degrees (centred on the NPC's facing); omit → all-round (360°). */
  angle?: number
  /** Effects run when the NPC first sees the player. */
  effects: Effect[]
  /** Detection is suppressed while this Condition passes (e.g. `flag: hidden`). */
  unless?: Condition
  /** Fire once per scene visit (else re-fires on each fresh detection edge). */
  once?: boolean
}

/**
 * An NPC's "voice" — the blips played while a dialogue line types out. Default is
 * procedural gibberish (an oscillator, pitched per NPC); an uploaded `sound` replaces
 * it with a custom blip clip.
 */
export interface VoiceConfig {
  /** Uploaded blip sound (data-URL) — replaces the procedural gibberish. */
  sound?: string
  /** Procedural pitch multiplier (default 1) — gives each NPC a distinct voice. */
  pitch?: number
}

/**
 * A character in the global cast (the player is "character 0"). Identity for now —
 * appearance / sounds / dialogue / routine layer in over M7. A cast NPC is placed
 * into a scene via `SceneData.npcs`, and lives in at most one scene at a time.
 */
export interface NpcDef {
  id: NpcId
  name?: string
  /** Walk-speed multiplier (default 1). */
  speed?: number
  /** Default dialogue (id into `GameDoc.dialogs`), played when the NPC is talked to;
   *  a placement can override it per scene. */
  dialog?: DialogId
  /** Gate on the dialogue: when set and it fails, clicking the NPC falls back to
   *  `inspect`. Flip the flag behind it from anywhere (any `setFlag` — a trigger,
   *  a dialogue, an interaction) to switch the NPC between talk and look. */
  dialogWhen?: Condition
  /** "Look at" the NPC — the player walks up and comments (text + optional audio).
   *  Used when there is no dialogue, or its `dialogWhen` gate fails. */
  inspect?: { text?: string; audio?: string }
  /** The NPC's appearance (atlas + clips); absent → the built-in placeholder figure. */
  view?: ViewDescriptor
  /** The NPC's dialogue voice (procedural pitch / an uploaded blip); absent → default. */
  voice?: VoiceConfig
  /** Footsteps for this NPC while it walks (a library sound + volume); absent → silent.
   *  M9 9c — per-NPC footsteps (the player's are `GameDoc.footstep`). */
  footstep?: SoundConfig
  /** Stealth vision — on seeing the player, run its effects; absent → the NPC doesn't watch. */
  vision?: VisionConfig
  /** The NPC's **starting** scene when it's placed in more than one (its runtime location
   *  then moves via `moveNpc`); defaults to the scene of its first placement. */
  home?: SceneId
  /** A per-NPC routine (cross-scene state machine); absent → the NPC stays where placed
   *  and only moves via explicit `moveNpc` effects. Drives this one NPC. */
  routine?: Routine
}

/** A patrol route for a placed NPC: waypoints (design-space fractions) walked in
 *  order, then `once` (stop), `loop` (back to start), or `pingpong` (reverse). */
export interface NpcPath {
  points: Polygon
  mode: 'once' | 'loop' | 'pingpong'
  /** When set, this route is active only while the Condition passes — for **conditional
   *  routes** (e.g. walk to the exit once a flag is set). Used inside `NpcPlacement.paths`. */
  when?: Condition
  /** Stable id so a routine node can **reference** this path (`RoutineNode.pathId`). */
  id?: string
  /** Author-facing label for the path picker (defaults to the id). */
  name?: string
}

// --- NPC routine (per-NPC cross-scene state machine, M7 step 6) --------------

/**
 * One station in an NPC's routine: while this node is active the NPC is in `scene`,
 * optionally walking `path` there (overriding the placement's path in that scene);
 * `onEnter` state effects run on entry. `ui` is the editor's graph position only.
 */
export interface RoutineNode {
  id: string
  scene: SceneId
  /** **References** one of the NPC's named placement paths in `scene` (by `NpcPath.id`);
   *  the NPC walks it while this node is active. Absent → the NPC just stands there.
   *  Paths are drawn on the scene canvas (per placement), never in the routine graph. */
  pathId?: string
  /** State effects (setFlag / give / take / goTo / moveNpc …) run when the NPC enters
   *  this node. Engine effects (playAnim / playSound) only fire if the scene is mounted. */
  onEnter?: Effect[]
  /** Editor-only: node position in the routine graph. */
  ui?: { x: number; y: number }
}

/**
 * A transition between routine nodes: eligible when ALL of its set conditions hold —
 * `when` passes, `after` ms have elapsed in the source node, and (`onArrive`) the node's
 * referenced path has finished. With none set it's taken immediately (an auto-advance).
 * The first eligible edge out of the active node is taken.
 */
export interface RoutineEdge {
  from: RoutineNodeId
  to: RoutineNodeId
  when?: Condition
  /** Milliseconds to linger in `from` before this transition is eligible (a timed beat). */
  after?: number
  /** Fire when the source node's referenced path **completes** (a `once` path reaches its
   *  end) — i.e. the NPC arrived. Ignored for looping / pathless nodes. */
  onArrive?: boolean
}

export type RoutineNodeId = string

/**
 * A per-NPC routine: a state machine that moves ONE NPC between scenes (and along
 * in-scene paths) as story state + time advance. Entered at `start`; the runtime tracks
 * the active node in story state (`npcNode`). The full time-of-day scheduler stays M12.
 */
export interface Routine {
  start: RoutineNodeId
  nodes: RoutineNode[]
  edges: RoutineEdge[]
}

/** Places a cast NPC into a scene at a spawn, optionally gated by `when`, with an
 *  optional in-scene patrol `path`. */
export interface NpcPlacement {
  npc: NpcId
  spawn: { xFrac: number; yFrac: number }
  when?: Condition
  path?: NpcPath
  /** Conditional in-scene routes — the **first** whose `when` passes is walked
   *  (recomputed reactively as state changes), else the single `path`. So a flag can
   *  switch the NPC onto a new route (e.g. head for the door, then a trigger moves it). */
  paths?: NpcPath[]
  /** Per-scene dialogue override (id into `GameDoc.dialogs`); falls back to `NpcDef.dialog`. */
  dialog?: DialogId
}

export interface SceneData {
  id: SceneId
  name: string
  layers: LayerData[]
  /** Where the character may walk (polygon as design-space fractions). */
  walkable: Polygon
  /** Obstacles cut out of the walkable area (polygons as design-space fractions). */
  holes?: Polygon[]
  interactables: InteractableData[]
  /** A looping **ambient** sound while this scene is shown (gated by `when`); overrides
   *  the document default (`GameDoc.ambient`). M9 audio. */
  ambient?: SoundConfig & { when?: Condition }
  /** Weather in this scene (M10 10a): a conditional list of presets — the **first** whose
   *  `when` passes plays (recomputed reactively, so a story flag triggers / swaps weather).
   *  `preset` is an id into `GameDoc.weatherPresets`. */
  weather?: { preset: WeatherId; when?: Condition }[]
  /** Ambient light for this scene (M10 10b), overriding `GameDoc.ambientLight`. */
  ambientLight?: AmbientLight
  /** Placed local lights (M10 10b). */
  lights?: LightSource[]
  /** Placed point particle emitters — smoke / embers / drips (M10). */
  emitters?: PointEmitter[]
  /** Animated fog / clouds (M10 10c). */
  fog?: FogConfig
  /** Colour grade over the scene art (M10 10d). */
  colorGrade?: ColorGrade
  /** Vignette — darkened edges (M10 10d). */
  vignette?: Vignette
  /** Lightning flashes + thunder (M10 10d). */
  lightning?: LightningConfig
  /** Dark zones cut into the scene (M10 10b). */
  darkAreas?: DarkArea[]
  /** Effects run once when the scene is entered (mounted), gated by their own logic —
   *  e.g. a scene-entry cutscene (`startSequence`) or setting a "visited here" flag. */
  onEnter?: Effect[]
  /** NPC placements (reference the global cast `GameDoc.npcs`). */
  npcs?: NpcPlacement[]
  depth: DepthConfig
  /** Character spawn (feet), as design-space fractions. */
  spawn: { xFrac: number; yFrac: number }
  /** Scene width in design px (its height is the document `referenceHeight`).
   *  Wider than the viewport's aspect → the camera scrolls horizontally to follow
   *  the character. Default = one 16:9 screen (`referenceHeight × 16/9`). */
  width?: number
  /** Per-scene size multiplier for the cast (player + NPCs), default 1. Lets a
   *  scene drawn from a closer/different angle render characters larger or smaller
   *  without retuning the perspective gradient (`depth`). */
  characterScale?: number
}

/**
 * Pointer cursor per interaction context — an optional uploaded icon (image URL),
 * else an emoji fallback shown by the runtime.
 */
export type CursorKind = 'walk' | 'pickable' | 'interact' | 'exit' | 'inspect' | 'talk' | 'default'

/** Scene-swap transition: a colour wash (default black) + optional art, held ≥ `minMs`. */
export interface TransitionConfig {
  /** Wash colour (CSS string / hex), default black. */
  color?: string
  /** Optional centred image (data-URL) shown over the wash during the swap. */
  image?: string
  /** Minimum time (ms) the wash is held — for a styled transition. */
  minMs?: number
}

/** The whole authored game. */
export interface GameDoc {
  start: SceneId
  scenes: Record<SceneId, SceneData>
  items: Record<ItemId, ItemDef>
  initialFlags: Record<FlagId, boolean>
  recipes?: Recipe[]
  /** Optional per-context cursor icons (image URLs); missing → emoji fallback. */
  cursors?: Partial<Record<CursorKind, string>>
  /** The protagonist's view (atlas + clips); absent → the built-in placeholder. */
  player?: ViewDescriptor
  /** The global NPC cast (id → definition); placed into scenes via `SceneData.npcs`. */
  npcs?: Record<NpcId, NpcDef>
  /** The reusable dialogue library (id → tree); referenced by NPCs / placements. */
  dialogs?: Record<DialogId, Dialog>
  /** The reusable cutscene library (id → sequence); started by `startSequence`. */
  sequences?: Record<SequenceId, Sequence>
  /** The global **sound library** (id → clip); every sound field references one by id. */
  sounds?: Record<SoundId, SoundAsset>
  /** The **weather preset** library (id → preset, M10 10a); scenes reference these. */
  weatherPresets?: Record<WeatherId, WeatherPreset>
  /** Default ambient light (M10 10b); a scene's `ambientLight` overrides it. */
  ambientLight?: AmbientLight
  /** The light the player carries (M10 10b), gated by `when` (e.g. holding a flashlight). */
  playerLight?: PlayerLight
  /** The game's vertical design resolution in px (default 1080). Every scene is
   *  this tall; the viewport height maps onto it with one uniform scale, so art and
   *  characters keep a consistent size across devices. Scene `width` is in these px. */
  referenceHeight?: number
  /** Scene-swap transition (wash colour / art / minimum hold; default black). */
  transition?: TransitionConfig
  /** Default looping **ambient** sound (a scene's own `ambient` overrides it); absent →
   *  a built-in procedural drone. M9 audio. */
  ambient?: SoundConfig
  /** The **footstep** sound played in a cadence while the player walks; absent → a
   *  built-in procedural step. M9 audio. */
  footstep?: SoundConfig
  /** Disable footsteps entirely (else they default on, procedural or `footstep`). */
  footstepsOff?: boolean
  /** SFX (library `SoundId`) played when an item is picked up; absent → the built-in. */
  pickupSound?: SoundId
  /** SFX (library `SoundId`) played on a scene change; absent → the built-in. */
  transitionSound?: SoundId
}
