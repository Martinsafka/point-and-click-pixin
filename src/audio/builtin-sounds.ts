import type { SoundAsset, SoundId } from '../data/schema'
import { ambientUri, footstepUri, pickupUri, rainUri, transitionUri } from './sounds'

/**
 * The built-in **procedural** sounds, exposed as real library entries (M9 9b) so they
 * appear in the Sounds tab and can be referenced (and replaced) like any uploaded clip.
 * Seeded into every document's `GameDoc.sounds` at load (`data/seed-sounds.ts`) under
 * these stable ids — the demo's ambient / footstep / pickup / transition reference them.
 */
export const BUILTIN_SOUND_IDS = {
  ambient: 'sfx-ambient',
  pickup: 'sfx-pickup',
  transition: 'sfx-transition',
  footstep: 'sfx-footstep',
  rain: 'sfx-rain',
} as const

export const BUILTIN_SOUNDS: Record<SoundId, SoundAsset> = {
  [BUILTIN_SOUND_IDS.ambient]: {
    id: BUILTIN_SOUND_IDS.ambient,
    name: 'Ambient drone',
    src: ambientUri,
  },
  [BUILTIN_SOUND_IDS.pickup]: { id: BUILTIN_SOUND_IDS.pickup, name: 'Pickup blip', src: pickupUri },
  [BUILTIN_SOUND_IDS.transition]: {
    id: BUILTIN_SOUND_IDS.transition,
    name: 'Scene transition',
    src: transitionUri,
  },
  [BUILTIN_SOUND_IDS.footstep]: {
    id: BUILTIN_SOUND_IDS.footstep,
    name: 'Footstep',
    src: footstepUri,
  },
  [BUILTIN_SOUND_IDS.rain]: { id: BUILTIN_SOUND_IDS.rain, name: 'Rain loop', src: rainUri },
}
