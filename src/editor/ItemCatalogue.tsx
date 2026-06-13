import { editorStore } from './editor-store'
import type { ItemDef, ItemId } from '../data/schema'

/**
 * The game's item catalogue (global, not per-scene). Add / remove items and edit
 * their display name. The **id** is fixed at creation — interactables, uses,
 * effects and recipes reference it — so only the name is editable here.
 */
export function ItemCatalogue({ items }: { items: Record<ItemId, ItemDef> }) {
  const s = () => editorStore.getState()
  const list = Object.values(items)

  return (
    <div className="catalogue">
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addItem()}>
          + Item
        </button>
      </div>
      {list.length === 0 && <p className="layer-list__empty">No items yet.</p>}
      {list.map((it) => (
        <div key={it.id} className="cat-row">
          <input
            className="logic__in cat-row__name"
            value={it.name}
            onChange={(e) => s().setItemName(it.id, e.target.value)}
          />
          <code className="cat-row__id" title="item id (fixed)">
            {it.id}
          </code>
          <button type="button" className="logic__del" onClick={() => s().removeItem(it.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
