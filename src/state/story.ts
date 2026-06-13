import { createStore } from 'zustand/vanilla'
import type { GameDoc } from '../data/schema'
import {
  applyEffects,
  checkCondition,
  type StoryState,
  type StoryStore,
} from '../systems/conditions'
import { gameDoc } from '../data/game'

export type { StoryStore }

/**
 * The discrete/meta state store — inventory, flags, current scene, visited. The
 * ONLY place reactive game state lives (per-frame motion stays in plain objects;
 * see agent_docs/architecture.md, "State — two kinds, never mixed").
 *
 * A *vanilla* Zustand store so Pixi/engine code can read/write outside React via
 * getState/subscribe; React UI binds with the `useStory` hook (ui/use-story.ts).
 */
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
