// The serializable game document — the data the runtime plays and the editor
// edits. This is the project's public schema (eventual npm API): keep it minimal
// and extend via discriminated-union `kind`s, which stays backward-compatible.
//
// Runtime story state (flags/inventory in flight) lives in src/state/story.ts;
// the evaluator for Condition/Effect lives in src/systems/conditions.ts.

export type SceneId = string
export type ItemId = string
export type FlagId = string
export type DialogId = string

/** Which depth band a layer sits in (background < mid < foreground). */
export type SceneBand = 'background' | 'mid' | 'foreground'

/** What a layer is for beyond drawing — drives editor tooling + runtime roles. */
export type LayerRole = 'scenery' | 'occluder' | 'floor'

/** Flat polygon [x0, y0, x1, y1, ...] (matches systems/walkable WalkArea). */
export type Polygon = number[]

/** Per-scene 2.5D perspective (fractions of screen height). */
export interface DepthConfig {
  yNearFrac: number
  yFarFrac: number
  scaleNear: number
  scaleFar: number
}

export interface ItemDef {
  id: ItemId
  name: string
  /** Inventory icon (image/SVG URL); optional while using placeholders. */
  icon?: string
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

// --- Scene content ----------------------------------------------------------

/**
 * One stacked part of a scene. `image` is the art target (SVG/PNG URL — fully
 * serializable); `builtin` references a code-registered painter by key, for
 * geometric placeholders (e.g. the current street) until real art arrives.
 */
export type LayerData =
  | {
      kind: 'image'
      band: SceneBand
      src: string
      x?: number
      y?: number
      anchorY?: number
      role?: LayerRole
    }
  | {
      kind: 'builtin'
      band: SceneBand
      builder: string
      anchorY?: number
      role?: LayerRole
    }

/** A clickable thing in a scene. All gated by an optional `when` Condition. */
export type InteractableData =
  | {
      kind: 'pickable'
      id: string
      item: ItemId
      hitArea: Polygon
      when?: Condition
      effects?: Effect[]
    }
  | { kind: 'interact'; id: string; hitArea: Polygon; when?: Condition; effects: Effect[] }
  | {
      kind: 'exit'
      id: string
      to: SceneId
      hitArea: Polygon
      when?: Condition
      effects?: Effect[]
    }

export interface SceneData {
  id: SceneId
  name: string
  layers: LayerData[]
  /** Where the character may walk. */
  walkable: Polygon
  interactables: InteractableData[]
  depth: DepthConfig
  /** Character spawn (feet), as fractions of the screen. */
  spawn: { xFrac: number; yFrac: number }
}

/** The whole authored game. */
export interface GameDoc {
  start: SceneId
  scenes: Record<SceneId, SceneData>
  items: Record<ItemId, ItemDef>
  initialFlags: Record<FlagId, boolean>
}
