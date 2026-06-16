import type { GameDoc } from './schema'
import { BUILTIN_SOUNDS } from '../audio/builtin-sounds'

/**
 * Ensure the built-in procedural sounds (ambient / pickup / transition / footstep) are in
 * the document's library under their stable ids, so they show in the Sounds tab and every
 * sound field can reference them. Non-destructive: an author who renamed / replaced one
 * (same id) keeps their version. Run at load, after `migrateSounds`.
 */
export function seedBuiltinSounds(doc: GameDoc): GameDoc {
  const sounds = { ...(doc.sounds ?? {}) }
  let added = false
  for (const [id, asset] of Object.entries(BUILTIN_SOUNDS)) {
    if (!sounds[id]) {
      sounds[id] = asset
      added = true
    }
  }
  return added || !doc.sounds ? { ...doc, sounds } : doc
}
