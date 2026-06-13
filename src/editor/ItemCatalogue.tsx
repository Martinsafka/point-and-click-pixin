import { type ChangeEvent } from 'react'
import { editorStore } from './editor-store'
import type { ItemDef, ItemId } from '../data/schema'

/**
 * The game's item catalogue (global, not per-scene). Add / remove items, edit the
 * display name + "look at" text, and upload an inventory icon. The **id** is fixed
 * at creation (interactables, uses, effects and recipes reference it).
 */
export function ItemCatalogue({ items }: { items: Record<ItemId, ItemDef> }) {
  const s = () => editorStore.getState()
  const list = Object.values(items)

  const onIcon = (id: ItemId, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      let src = String(reader.result)
      if (/\.svg$/i.test(file.name) && !src.startsWith('data:image/svg+xml')) {
        src = src.replace(/^data:[^,;]*/, 'data:image/svg+xml')
      }
      s().setItemIcon(id, src)
    }
    reader.readAsDataURL(file)
  }

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
          <div className="cat-row__head">
            <input
              className="cat-input cat-row__name"
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
          <input
            className="cat-input"
            placeholder="examine text…"
            value={it.examine ?? ''}
            onChange={(e) => s().setItemExamine(it.id, e.target.value)}
          />
          <div className="cat-row__icon">
            {it.icon && <img className="cat-row__thumb" src={it.icon} alt="" />}
            <label className="editor__import cat-row__upload">
              {it.icon ? 'Change icon' : '+ Icon'}
              <input type="file" accept="image/*,.svg" hidden onChange={(e) => onIcon(it.id, e)} />
            </label>
            {it.icon && (
              <button
                type="button"
                className="logic__del"
                onClick={() => s().setItemIcon(it.id, undefined)}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
