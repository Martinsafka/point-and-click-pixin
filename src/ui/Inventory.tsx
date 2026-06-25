import { useStory } from './use-story'
import { storyStore } from '../state/story'
import { gameDoc } from '../data/game'
import { assetUrl } from '../data/asset-url'
import { resolveExamine } from '../systems/examine'
import { checkCondition, type StoryState } from '../systems/conditions'
import { itemAction } from '../engine/item-action'
import type { Effect, ItemDef } from '../data/schema'

/** The first `use` whose `when` passes → its effects + an optional `startDialog` (M12.5 #5). */
function itemUseEffects(def: ItemDef | undefined, state: StoryState): Effect[] | null {
  for (const u of def?.use ?? []) {
    if (u.when && !checkCondition(state, u.when)) continue
    const fx: Effect[] = [...(u.effects ?? [])]
    if (u.dialog) fx.push({ kind: 'startDialog', dialog: u.dialog })
    return fx
  }
  return null
}

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
    // "Look at" the item on click — conditional examine (M12.5 #1b) wins over the base text.
    const text = resolveExamine(def?.examine, def?.examineWhen, store)
    if (text) store.say(text)
    if (selected === id) {
      store.select(null)
      return
    }
    if (selected) {
      // Combine the two; if no recipe matches, just switch the selection.
      if (!store.combine(selected, id)) store.select(id)
      return
    }
    // An actionable item (M12.5 #5) runs its action instead of selecting; routed through the
    // mounted scene so `startDialog` works. Items without a `use` keep the select-for-combine flow.
    const fx = itemUseEffects(def, store)
    if (fx) {
      store.select(null)
      itemAction.run(fx)
      return
    }
    store.select(id)
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
              <img className="inventory__icon" src={assetUrl(def.icon)} alt={def?.name ?? id} />
            ) : (
              <span className="inventory__label">{def?.name ?? id}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
