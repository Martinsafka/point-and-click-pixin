import { createStore } from 'zustand/vanilla'
import type { GameDoc } from '../data/schema'
import {
  applyEffects,
  checkCondition,
  type StoryState,
  type StoryStore,
} from '../systems/conditions'
import { findRecipe } from '../systems/recipes'
import { gameDoc } from '../data/active-doc'

export type { StoryStore }

/**
 * The discrete/meta state store — inventory, flags, current scene, visited,
 * selected item. The ONLY place reactive game state lives (per-frame motion
 * stays in plain objects; see agent_docs/architecture.md, "State").
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
    selectedItem: null,
    npcScene: {},
    npcNode: {},
    screen: null,
    clockMinutes: doc.clock ? (doc.clock.startMinutes ?? 0) : undefined,
  }
}

export function createStoryStore(doc: GameDoc) {
  return createStore<StoryStore>((set, get) => ({
    ...freshState(doc),
    narration: null,
    check: (cond) => checkCondition(get(), cond),
    run: (effects) => set(applyEffects(get(), effects)),
    select: (item) => set({ selectedItem: item }),
    combine: (a, b) => {
      // Recipes resolve against the LIVE active document (data/active-doc), not the `doc`
      // captured when this store was created. The app store is built at module load while the
      // active doc is still the empty default (the real game is published later via
      // setActiveDoc), so a captured `doc` would leave combine matching against zero recipes —
      // and `load`/continue never re-seeds it. Reading the live binding fixes new + continue.
      const recipe = findRecipe(gameDoc.recipes ?? [], a, b)
      if (!recipe) return false
      set(
        applyEffects({ ...get(), selectedItem: null }, [
          { kind: 'takeItem', item: a },
          { kind: 'takeItem', item: b },
          { kind: 'giveItem', item: recipe.output },
        ]),
      )
      return true
    },
    load: (state) => set({ ...state, selectedItem: null, narration: null, screen: null }),
    reset: (nextDoc) => set({ ...freshState(nextDoc), narration: null, screen: null }),
    say: (text) => set({ narration: text }),
    setScreen: (screen) => set({ screen }),
    setClock: (minutes) => set({ clockMinutes: minutes }),
    enterRoutine: (npc, node, scene) =>
      set({
        npcNode: { ...(get().npcNode ?? {}), [npc]: node },
        npcScene: { ...(get().npcScene ?? {}), [npc]: scene },
      }),
  }))
}

export type StoryStoreApi = ReturnType<typeof createStoryStore>

/** The app's single story store, created from the authored game. */
export const storyStore = createStoryStore(gameDoc)
