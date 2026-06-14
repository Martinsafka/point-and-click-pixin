import type { Effect, InteractableData, ItemId } from '../data/schema'
import { checkCondition, type StoryState } from './conditions'
import { containsPoint } from './walkable'

/**
 * A pickable, once taken, is gated out by this internal flag (set on pickup) —
 * so it stays gone even if the item is later consumed by a combine or use.
 */
function pickedFlag(id: string): string {
  return `picked:${id}`
}

/** The Effects a plain click on an interactable produces (before gating). */
export function effectsFor(it: InteractableData): Effect[] {
  switch (it.kind) {
    case 'pickable':
      return [
        { kind: 'giveItem', item: it.item },
        { kind: 'setFlag', flag: pickedFlag(it.id) },
        ...(it.effects ?? []),
      ]
    case 'interact':
      return it.effects
    case 'exit':
      return [{ kind: 'goTo', scene: it.to }, ...(it.effects ?? [])]
    case 'inspect':
    case 'trigger':
      return []
  }
}

/** The Effects of using `item` on an interactable, or undefined if no rule. */
export function effectsForUse(it: InteractableData, item: ItemId): Effect[] | undefined {
  if (it.kind === 'pickable' || it.kind === 'inspect' || it.kind === 'trigger') return undefined
  return it.uses?.find((u) => u.item === item)?.effects
}

/**
 * The topmost interactable whose (resolved) hit area contains the point and
 * whose gates pass — or undefined. Pickables are auto-gated by their picked
 * flag. Hit-area polygons are screen fractions, resolved against the viewport.
 */
export function pickInteractable(
  interactables: readonly InteractableData[],
  x: number,
  y: number,
  screen: { width: number; height: number },
  state: StoryState,
): Exclude<InteractableData, { kind: 'trigger' }> | undefined {
  for (let i = interactables.length - 1; i >= 0; i -= 1) {
    const it = interactables[i]
    if (it.kind === 'trigger') continue // enter-driven, never clicked
    if (it.kind === 'pickable' && state.flags[pickedFlag(it.id)]) continue
    if (it.when && !checkCondition(state, it.when)) continue
    const polygon = it.hitArea.map((v, idx) => v * (idx % 2 === 0 ? screen.width : screen.height))
    if (containsPoint({ polygon }, x, y)) return it
  }
  return undefined
}
