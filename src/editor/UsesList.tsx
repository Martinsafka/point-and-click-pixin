import type { ItemDef, ItemId, SceneId, UseRule } from '../data/schema'
import { EffectList, ItemSelect } from './EffectList'

interface Props {
  uses: UseRule[]
  onChange: (uses: UseRule[]) => void
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
}

/**
 * Controlled editor for an interactable's `uses` — each rule pairs an item with
 * the effects of using it on the object (reusing `EffectList`). The runtime fires
 * these when the selected inventory item is used on the object.
 */
export function UsesList({ uses, onChange, items, sceneIds }: Props) {
  const setAt = (i: number, rule: UseRule) => onChange(uses.map((u, j) => (j === i ? rule : u)))

  return (
    <div className="logic">
      <div className="logic__head">
        <span>Uses</span>
        <button
          type="button"
          className="logic__add"
          onClick={() => onChange([...uses, { item: Object.keys(items)[0] ?? '', effects: [] }])}
        >
          + Use
        </button>
      </div>
      {uses.map((u, i) => (
        <div key={i} className="logic__use">
          <div className="logic__use-head">
            <ItemSelect
              value={u.item}
              items={items}
              onChange={(item) => setAt(i, { ...u, item })}
            />
            <button
              type="button"
              className="logic__del"
              onClick={() => onChange(uses.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
          <EffectList
            effects={u.effects}
            onChange={(e) => setAt(i, { ...u, effects: e })}
            items={items}
            sceneIds={sceneIds}
            label="→ effects"
          />
        </div>
      ))}
    </div>
  )
}
