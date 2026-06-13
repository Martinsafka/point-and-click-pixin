import { useStory } from './use-story'
import { storyStore } from '../state/story'
import { gameDoc } from '../data/game'

/**
 * The inventory bar — a DOM overlay reading `inventory` + `selectedItem` from the
 * story store. Click a slot to select it; click the selected slot to deselect;
 * click a different slot to try a recipe (combine). A selected item is also used
 * on the world by clicking an object in the scene (handled in the engine).
 */
export function Inventory() {
  const items = useStory((s) => s.inventory)
  const selected = useStory((s) => s.selectedItem)
  if (items.length === 0) return null

  const onSlot = (id: string) => {
    const store = storyStore.getState()
    const def = gameDoc.items[id]
    if (def?.examine) store.say(def.examine) // "look at" the item on click
    if (selected === id) {
      store.select(null)
    } else if (selected) {
      // Combine the two; if no recipe matches, just switch the selection.
      if (!store.combine(selected, id)) store.select(id)
    } else {
      store.select(id)
    }
  }

  return (
    <div className="inventory">
      {items.map((id) => {
        const def = gameDoc.items[id]
        const className = `inventory__slot${selected === id ? ' inventory__slot--selected' : ''}`
        return (
          <button
            key={id}
            type="button"
            className={className}
            title={def?.name ?? id}
            onClick={() => onSlot(id)}
          >
            {def?.icon ? (
              <img className="inventory__icon" src={def.icon} alt={def?.name ?? id} />
            ) : (
              <span className="inventory__label">{def?.name ?? id}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
