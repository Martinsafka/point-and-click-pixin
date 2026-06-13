import type { Effect, InteractableData } from '../data/schema'
import { checkCondition, type StoryState } from './conditions'
import { containsPoint } from './walkable'

/** The Effects a click on an interactable produces (before gating). */
export function effectsFor(it: InteractableData): Effect[] {
  switch (it.kind) {
    case 'pickable':
      return [{ kind: 'giveItem', item: it.item }, ...(it.effects ?? [])]
    case 'interact':
      return it.effects
    case 'exit':
      return [{ kind: 'goTo', scene: it.to }, ...(it.effects ?? [])]
  }
}

/**
 * The topmost interactable whose (resolved) hit area contains the point and
 * whose `when` Condition passes — or undefined. Hit-area polygons are screen
 * fractions, resolved against the viewport here.
 */
export function pickInteractable(
  interactables: readonly InteractableData[],
  x: number,
  y: number,
  screen: { width: number; height: number },
  state: StoryState,
): InteractableData | undefined {
  for (let i = interactables.length - 1; i >= 0; i -= 1) {
    const it = interactables[i]
    if (it.when && !checkCondition(state, it.when)) continue
    const polygon = it.hitArea.map((v, idx) => v * (idx % 2 === 0 ? screen.width : screen.height))
    if (containsPoint({ polygon }, x, y)) return it
  }
  return undefined
}
