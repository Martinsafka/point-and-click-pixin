import type { SceneFactory } from '../engine/scene'
import { streetScene } from './street'

/**
 * Registry of available scenes. To add a scene: write its factory in a new file
 * under src/scenes/, then list it here — `host.show(scenes.<name>)` swaps to it.
 */
export const scenes = {
  street: streetScene,
} satisfies Record<string, SceneFactory>

export type SceneName = keyof typeof scenes
