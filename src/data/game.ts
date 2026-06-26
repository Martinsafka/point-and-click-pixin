import type { GameDoc } from './schema'
import { streetScene } from '../scenes/street'
import { roomScene } from '../scenes/room'
import { loadDocDraft } from './doc-draft'
import { migrateSounds } from './migrate-sounds'
import { seedBuiltinSounds } from './seed-sounds'
import { seedWeatherPresets } from './weather-presets'
import { BUILTIN_SOUND_IDS } from '../audio/builtin-sounds'
import { setActiveDoc } from './active-doc'
import { setSoundLibrary } from '../audio/audio'

/**
 * The built-in demo (street + room), assembled in code. Importing the scene
 * modules also registers their `builtin` layer painters (side effect), so a
 * document that reuses those builder keys still renders.
 */
const demoGameDoc: GameDoc = {
  start: 'street',
  scenes: {
    street: streetScene,
    room: roomScene,
  },
  items: {
    key: { id: 'key', name: 'Key' },
    gear: { id: 'gear', name: 'Gear' },
    handle: { id: 'handle', name: 'Handle' },
    crank: { id: 'crank', name: 'Crank' },
    gem: { id: 'gem', name: 'Gem' },
  },
  initialFlags: {},
  recipes: [{ a: 'gear', b: 'handle', output: 'crank' }],
  // Reference the built-in procedural sounds (seeded into the library at load).
  ambient: { sound: BUILTIN_SOUND_IDS.ambient },
  footstep: { sound: BUILTIN_SOUND_IDS.footstep },
  pickupSound: BUILTIN_SOUND_IDS.pickup,
  transitionSound: BUILTIN_SOUND_IDS.transition,
}

/**
 * A published document at `content/game.json` (the editor's Export) takes over
 * from the demo when present. `import.meta.glob` makes the file optional — no
 * file → empty map → the demo runs; committing one bundles it into the build.
 */
const published = import.meta.glob('../../content/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, GameDoc>
const publishedDoc = Object.entries(published).find(([path]) => path.endsWith('/game.json'))?.[1]

export const bakedGameDoc: GameDoc = publishedDoc ?? demoGameDoc

/**
 * The active game document. In dev, an editor draft (IndexedDB) overrides the baked
 * one — the editor → game test loop (`src/data/doc-draft.ts`). The draft load is async
 * (IndexedDB), so this module top-level `await`s it; importers (stores, App) resolve
 * once the draft is read. Top-level await is supported by the `esnext` build target.
 */
// The standalone app's active document: resolve the editor draft (dev) / baked demo, then publish
// it to the shared holder + sound library. The engine + UI read `gameDoc` from `./active-doc`
// (demo-free); the `mountGame` embedding API sets a consumer's doc the same way.
const resolved: GameDoc = seedWeatherPresets(
  seedBuiltinSounds(
    migrateSounds((import.meta.env.DEV ? await loadDocDraft() : null) ?? bakedGameDoc),
  ),
)
setActiveDoc(resolved)
setSoundLibrary(resolved.sounds)

export { gameDoc } from './active-doc'
