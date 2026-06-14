import type { GameDoc, ViewDescriptor } from '../data/schema'
import { placeholderView } from '../entities/placeholder-atlas'

/**
 * Option lists for the effect editor's pickers — so authors choose real, valid
 * values instead of guessing free-text. Pure derives over the working `GameDoc`.
 */

/**
 * The distinct **action names** a `playAnim` / `wait` effect can reference. Derived
 * from each clip key's base (the part before any `.facing`, e.g. `walk.E` → `walk`),
 * unioned across the built-in placeholder (every NPC still uses it) and the player's
 * uploaded view. Per-NPC views join in 4d.
 */
export function actionNames(doc: GameDoc): string[] {
  const views: ViewDescriptor[] = [placeholderView]
  if (doc.player) views.push(doc.player)
  const names = new Set<string>()
  for (const v of views) for (const key of Object.keys(v.clips)) names.add(key.split('.')[0])
  return [...names].sort()
}

/** The character ids a `playAnim` can **target** — the player plus the NPC cast. */
export function actorIds(doc: GameDoc): string[] {
  return ['player', ...Object.keys(doc.npcs ?? {})]
}
