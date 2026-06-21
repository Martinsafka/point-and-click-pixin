import { editorStore } from './editor-store'
import type { ExamineLine, GameDoc, ItemDef, ItemId, ItemUse } from '../data/schema'
import { AssetSwap } from './AssetSwap'
import { ConditionEditor } from './ConditionEditor'
import { EffectList } from './EffectList'
import { actionNames, actorIds } from './effect-options'

/**
 * The game's item catalogue (global, not per-scene). Add / remove items, edit the display
 * name + "look at" text, upload an inventory icon, and (M12.5) author **conditional examine**
 * variants (#1b) + **click actions** (#5 — effects / a dialog when the item is clicked). The
 * **id** is fixed at creation (interactables, uses, effects and recipes reference it).
 */
export function ItemCatalogue({ items, doc }: { items: Record<ItemId, ItemDef>; doc: GameDoc }) {
  const s = () => editorStore.getState()
  const list = Object.values(items)
  const sceneIds = Object.keys(doc.scenes)
  const animations = actionNames(doc)
  const targets = actorIds(doc)
  const dialogIds = Object.keys(doc.dialogs ?? {})

  const setExamineWhen = (id: ItemId, rules: ExamineLine[]) => s().setItemExamineWhen(id, rules)
  const setUse = (id: ItemId, use: ItemUse[]) => s().setItemUse(id, use)

  return (
    <div className="catalogue">
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addItem()}>
          + Item
        </button>
      </div>
      {list.length === 0 && <p className="layer-list__empty">No items yet.</p>}
      {list.map((it) => {
        const examineWhen = it.examineWhen ?? []
        const use = it.use ?? []
        return (
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

            {/* #1b — conditional examine: first matching `when` wins over the base text. */}
            <div className="logic">
              <div className="logic__head">
                <span>Examine when · {examineWhen.length}</span>
                <button
                  type="button"
                  className="logic__add"
                  onClick={() => setExamineWhen(it.id, [...examineWhen, { text: '' }])}
                >
                  + variant
                </button>
              </div>
              {examineWhen.map((r, i) => (
                <div key={i} className="logic__rule">
                  <div className="logic__field">
                    <input
                      className="logic__in"
                      placeholder="text when…"
                      value={r.text}
                      onChange={(e) =>
                        setExamineWhen(
                          it.id,
                          examineWhen.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)),
                        )
                      }
                    />
                    <button
                      type="button"
                      className="logic__del"
                      onClick={() =>
                        setExamineWhen(
                          it.id,
                          examineWhen.filter((_, j) => j !== i),
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                  <ConditionEditor
                    condition={r.when}
                    onChange={(c) =>
                      setExamineWhen(
                        it.id,
                        examineWhen.map((x, j) => (j === i ? { ...x, when: c } : x)),
                      )
                    }
                    items={items}
                    sceneIds={sceneIds}
                    allowEmpty={false}
                  />
                </div>
              ))}
            </div>

            {/* #5 — click actions: the first matching `use` runs its effects + optional dialog. */}
            <div className="logic">
              <div className="logic__head">
                <span>On click · {use.length}</span>
                <button
                  type="button"
                  className="logic__add"
                  onClick={() => setUse(it.id, [...use, { effects: [] }])}
                >
                  + action
                </button>
              </div>
              {use.map((u, i) => (
                <div key={i} className="logic__rule">
                  <div className="logic__field">
                    <span>dialog</span>
                    <select
                      className="logic__in"
                      value={u.dialog ?? ''}
                      onChange={(e) =>
                        setUse(
                          it.id,
                          use.map((x, j) =>
                            j === i ? { ...x, dialog: e.target.value || undefined } : x,
                          ),
                        )
                      }
                    >
                      <option value="">— none —</option>
                      {dialogIds.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="logic__del"
                      onClick={() =>
                        setUse(
                          it.id,
                          use.filter((_, j) => j !== i),
                        )
                      }
                    >
                      ✕
                    </button>
                  </div>
                  <div className="logic__field logic__field--col">
                    <span>when</span>
                    <ConditionEditor
                      condition={u.when}
                      onChange={(c) =>
                        setUse(
                          it.id,
                          use.map((x, j) => (j === i ? { ...x, when: c } : x)),
                        )
                      }
                      items={items}
                      sceneIds={sceneIds}
                    />
                  </div>
                  <EffectList
                    effects={u.effects ?? []}
                    onChange={(fx) =>
                      setUse(
                        it.id,
                        use.map((x, j) => (j === i ? { ...x, effects: fx } : x)),
                      )
                    }
                    items={items}
                    sceneIds={sceneIds}
                    animations={animations}
                    targets={targets}
                    label="→ effects"
                  />
                </div>
              ))}
            </div>

            <div className="cat-row__icon">
              {it.icon && <img className="cat-row__thumb" src={it.icon} alt="" />}
              <AssetSwap
                accept="image/*,.svg"
                className="editor__import cat-row__upload"
                label={it.icon ? '⇄ Swap' : '+ Icon'}
                onPick={(src) => s().setItemIcon(it.id, src)}
              />
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
        )
      })}
    </div>
  )
}
