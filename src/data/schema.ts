// The serializable game document — the data the runtime plays and the editor
// edits. This is the project's public schema (eventual npm API): keep it minimal
// and extend via discriminated-union `kind`s, which stays backward-compatible.
//
// Coordinate convention: ALL positions/polygons are FRACTIONS of the screen
// (0..1), so a document is resolution-independent; the engine resolves them to
// pixels at mount time. Runtime story state lives in src/state/story.ts; the
// Condition/Effect evaluator in src/systems/conditions.ts.

export type SceneId = string
export type ItemId = string
export type FlagId = string
export type DialogId = string

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

/** Per-scene 2.5D perspective (fractions of screen height). */
export interface DepthConfig {
  yNearFrac: number
  yFarFrac: number
  scaleNear: number
  scaleFar: number
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

/** Using `item` on an interactable runs `effects`. */
export interface UseRule {
  item: ItemId
  effects: Effect[]
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

export interface SceneData {
  id: SceneId
  name: string
  layers: LayerData[]
  /** Where the character may walk (polygon as screen fractions). */
  walkable: Polygon
  interactables: InteractableData[]
  depth: DepthConfig
  /** Character spawn (feet), as fractions of the screen. */
  spawn: { xFrac: number; yFrac: number }
}

/**
 * Pointer cursor per interaction context — an optional uploaded icon (image URL),
 * else an emoji fallback shown by the runtime.
 */
export type CursorKind = 'walk' | 'pickable' | 'interact' | 'exit' | 'inspect' | 'default'

/** The whole authored game. */
export interface GameDoc {
  start: SceneId
  scenes: Record<SceneId, SceneData>
  items: Record<ItemId, ItemDef>
  initialFlags: Record<FlagId, boolean>
  recipes?: Recipe[]
  /** Optional per-context cursor icons (image URLs); missing → emoji fallback. */
  cursors?: Partial<Record<CursorKind, string>>
}
