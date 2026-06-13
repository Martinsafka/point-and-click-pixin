import { useStory } from './use-story'
import { gameDoc } from '../data/game'

/**
 * The inventory bar — a DOM overlay strip reading `inventory` from the story
 * store. Display-only for now; selecting an item to combine / use on a world
 * object lands in the next M1 step.
 */
export function Inventory() {
  const items = useStory((s) => s.inventory)
  if (items.length === 0) return null

  return (
    <div className="inventory">
      {items.map((id) => {
        const def = gameDoc.items[id]
        return (
          <div key={id} className="inventory__slot" title={def?.name ?? id}>
            <span className="inventory__label">{def?.name ?? id}</span>
          </div>
        )
      })}
    </div>
  )
}
