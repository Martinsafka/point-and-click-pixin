import type { Condition, Effect, FlagId, GameDoc, ItemId, NpcId, SceneId } from '../data/schema'

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
  /** Each NPC's current scene (runtime location), overriding its placement's home;
   *  `''` = despawned (nowhere). Absent → the NPC is at its home / placement scene. */
  npcScene?: Record<NpcId, SceneId>
  /** Each routine-driven NPC's active routine node id (M7 step 6). Absent → not yet
   *  entered (the runner seeds it to the routine's `start`). */
  npcNode?: Record<NpcId, string>
  /** A requested full-screen end screen (M11) — set by the `gameOver` / `endGame` effects;
   *  the App reads it, switches screens, and clears it. Absent → none. */
  screen?: 'gameOver' | 'endGame' | null
  /** Current time-of-day in minutes past midnight (0..1439), advanced by the game clock
   *  (M12c). Absent → no clock running. */
  clockMinutes?: number
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
  /** Clear the requested end screen (M11) once the App has switched to it. */
  setScreen(screen: 'gameOver' | 'endGame' | null): void
  /** Set the current time-of-day (minutes past midnight) — driven by the game clock (M12c). */
  setClock(minutes: number): void
  /** Enter a routine node: set the NPC's active node + sync its scene location (the
   *  routine runner drives this; `onEnter` effects run separately via `run`). */
  enterRoutine(npc: NpcId, node: string, scene: SceneId): void
}

/**
 * Is the time-of-day `now` (minutes past midnight) inside the window `[from, to)`? Either bound
 * may be omitted (open); wraps past midnight when `from` > `to`. When no clock is running (`now`
 * undefined) or no window is set, it's always in (the gate is inert). (M12c — also used by the
 * routine runner and the `timeOfDay` condition.)
 */
export function inTimeWindow(
  now: number | undefined,
  from: number | undefined,
  to: number | undefined,
): boolean {
  if (from === undefined && to === undefined) return true
  if (now === undefined) return true
  const f = from ?? 0
  const t = to ?? 1440
  return f <= t ? now >= f && now < t : now >= f || now < t
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
    case 'timeOfDay':
      return inTimeWindow(state.clockMinutes, cond.from, cond.to)
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
    case 'startSequence':
      // The scene starts the dialogue / cutscene (it needs the actor registry); inert here.
      return state
    case 'gameOver':
      return { ...state, screen: 'gameOver' }
    case 'endGame':
      return { ...state, screen: 'endGame' }
    case 'moveNpc':
      return { ...state, npcScene: { ...(state.npcScene ?? {}), [effect.npc]: effect.scene } }
    case 'despawnNpc':
      return { ...state, npcScene: { ...(state.npcScene ?? {}), [effect.npc]: '' } }
    case 'playSound':
    case 'playAnim':
    case 'wait':
    case 'setStance':
    case 'say':
      // Engine effects (audio / animation / timing / speech bubble): handled by the scene.
      return state
  }
}

/** Apply a sequence of Effects left to right. */
export function applyEffects(state: StoryState, effects: readonly Effect[]): StoryState {
  return effects.reduce(applyEffect, state)
}
