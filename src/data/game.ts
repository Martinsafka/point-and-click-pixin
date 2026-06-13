import type { GameDoc } from './schema'
import { streetScene } from '../scenes/street'
import { roomScene } from '../scenes/room'

/**
 * The authored game. For now two hand-written scenes; the editor (M2+) will
 * produce this document, and it will eventually load from JSON. Importing a
 * scene module also registers its `builtin` layer painters (side effect).
 */
export const gameDoc: GameDoc = {
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
}
