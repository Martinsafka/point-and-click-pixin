import type { Effect } from '../data/schema'

/**
 * DOM → mounted-scene bridge for inventory item actions (M12.5 #5). The inventory overlay lives
 * in the DOM and has no access to the scene's effect dispatch (the actor registry, `startDialog`
 * handling). The mounted scene sets `run` here on mount and clears it on teardown — a module
 * singleton like `sceneHit` / `cameraOffset` — so clicking an item routes its effects (incl.
 * `startDialog`) through the live scene. No scene mounted → a no-op.
 */
export const itemAction: { run: (effects: readonly Effect[]) => void } = { run: () => {} }
