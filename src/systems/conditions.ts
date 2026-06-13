import type { Condition, Effect, FlagId, GameDoc, ItemId, SceneId } from '../data/schema'

/**
 * Live discrete state of a playthrough — what Conditions read and Effects mutate.
 * The Zustand store (src/state/story.ts) holds the canonical instance; these
 * functions are pure so they're trivially testable and usable outside React.
 */
export interface StoryState {
  currentScene: SceneId
  flags: Record<FlagId, boolean>
  inventory: ItemId[]
  visited: SceneId[]
  /** Item selected in the inventory (for combine / use-on), or null. */
  selectedItem: ItemId | null
}

/**
 * The story store's full surface: discrete state + actions over it. Defined here
 * (next to the evaluator) so both the store (state/story.ts) and the engine can
 * depend on it without importing each other.
 */
export interface StoryStore extends StoryState {
  /** Transient "look at" / narration line — UI only, not part of the saved state. */
  narration: string | null
  check(cond: Condition): boolean
  run(effects: readonly Effect[]): void
  /** Select an inventory item (or null to clear) for combine / use-on. */
  select(item: ItemId | null): void
  /** Combine two inventory items via a recipe; returns whether one matched. */
  combine(a: ItemId, b: ItemId): boolean
  /** Replace the whole story state — used to load a save. */
  load(state: StoryState): void
  reset(doc: GameDoc): void
  /** Set or clear (null) the narration line. */
  say(text: string | null): void
}

/** Evaluate a Condition against the current story state. */
export function checkCondition(state: StoryState, cond: Condition): boolean {
  switch (cond.kind) {
    case 'hasItem':
      return state.inventory.includes(cond.item)
    case 'flag':
      return (state.flags[cond.flag] ?? false) === (cond.value ?? true)
    case 'visited':
      return state.visited.includes(cond.scene)
    case 'all':
      return cond.of.every((c) => checkCondition(state, c))
    case 'any':
      return cond.of.some((c) => checkCondition(state, c))
    case 'not':
      return !checkCondition(state, cond.of)
  }
}

/** Apply one Effect, returning a new StoryState (immutable update). */
export function applyEffect(state: StoryState, effect: Effect): StoryState {
  switch (effect.kind) {
    case 'setFlag':
      return { ...state, flags: { ...state.flags, [effect.flag]: effect.value ?? true } }
    case 'giveItem':
      return state.inventory.includes(effect.item)
        ? state
        : { ...state, inventory: [...state.inventory, effect.item] }
    case 'takeItem':
      return { ...state, inventory: state.inventory.filter((i) => i !== effect.item) }
    case 'goTo':
      return {
        ...state,
        currentScene: effect.scene,
        visited: state.visited.includes(effect.scene)
          ? state.visited
          : [...state.visited, effect.scene],
      }
    case 'startDialog':
      // Dialog runtime arrives in M4; for now this is an inert marker.
      return state
  }
}

/** Apply a sequence of Effects left to right. */
export function applyEffects(state: StoryState, effects: readonly Effect[]): StoryState {
  return effects.reduce(applyEffect, state)
}
