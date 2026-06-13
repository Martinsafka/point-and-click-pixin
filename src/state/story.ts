import { createStore } from 'zustand/vanilla'
import type { Condition, Effect, GameDoc } from '../data/schema'
import { applyEffects, checkCondition, type StoryState } from '../systems/conditions'
import { gameDoc } from '../data/game'

/**
 * The discrete/meta state store — inventory, flags, current scene, visited. This
 * is the ONLY place reactive game state lives (per-frame motion stays in plain
 * objects; see agent_docs/architecture.md, "State — two kinds, never mixed").
 *
 * A *vanilla* Zustand store so Pixi/engine code can read/write outside React via
 * getState/setState/subscribe; React UI binds to it with a `useStore` hook (M1).
 */
export interface StoryStore extends StoryState {
  /** Evaluate a Condition against the current state. */
  check(cond: Condition): boolean
  /** Apply Effects (pickups, flags, scene changes) to the state. */
  run(effects: readonly Effect[]): void
  /** Reset to a fresh playthrough of the given document (new game / load). */
  reset(doc: GameDoc): void
}

function freshState(doc: GameDoc): StoryState {
  return {
    currentScene: doc.start,
    flags: { ...doc.initialFlags },
    inventory: [],
    visited: [doc.start],
  }
}

export function createStoryStore(doc: GameDoc) {
  return createStore<StoryStore>((set, get) => ({
    ...freshState(doc),
    check: (cond) => checkCondition(get(), cond),
    run: (effects) => set(applyEffects(get(), effects)),
    reset: (nextDoc) => set(freshState(nextDoc)),
  }))
}

export type StoryStoreApi = ReturnType<typeof createStoryStore>

/** The app's single story store, created from the authored game. */
export const storyStore = createStoryStore(gameDoc)
