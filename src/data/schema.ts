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
  // Engine effects (touch the scene / characters, not the story state):
  | { kind: 'playSound'; sound: string }
  | { kind: 'playAnim'; action: string; target?: string }
  // Lingers the *entering* actor (an NPC / dialogue partner) for `ms`, optionally
  // looping `anim` meanwhile. Never pauses the player. Composes with `playAnim`
  // ("longest wins" — the actor resumes once the longest pause has elapsed).
  | { kind: 'wait'; ms: number; anim?: string }

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
      /** Who fires it: the player, an NPC, or any character (default 'player'). */
      by?: 'player' | 'npc' | 'any'
      /** Fire once per scene visit (always debounced to the enter edge). */
      once?: boolean
      when?: Condition
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
}

/** A patrol route for a placed NPC: waypoints (design-space fractions) walked in
 *  order, then `once` (stop), `loop` (back to start), or `pingpong` (reverse). */
export interface NpcPath {
  points: Polygon
  mode: 'once' | 'loop' | 'pingpong'
}

/** Places a cast NPC into a scene at a spawn, optionally gated by `when`, with an
 *  optional in-scene patrol `path`. */
export interface NpcPlacement {
  npc: NpcId
  spawn: { xFrac: number; yFrac: number }
  when?: Condition
  path?: NpcPath
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
  /** The game's vertical design resolution in px (default 1080). Every scene is
   *  this tall; the viewport height maps onto it with one uniform scale, so art and
   *  characters keep a consistent size across devices. Scene `width` is in these px. */
  referenceHeight?: number
  /** Scene-swap transition (wash colour / art / minimum hold; default black). */
  transition?: TransitionConfig
}
