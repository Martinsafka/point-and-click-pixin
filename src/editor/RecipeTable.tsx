import { editorStore } from './editor-store'
import type { ItemDef, ItemId, Recipe } from '../data/schema'
import { ItemSelect } from './EffectList'

/**
 * Combine rules (global): `a + b → output`, order-independent. The runtime
 * consumes `a` + `b` from the inventory and yields `output`. Items come from the
 * catalogue.
 */
export function RecipeTable({
  recipes,
  items,
}: {
  recipes: Recipe[]
  items: Record<ItemId, ItemDef>
}) {
  const s = () => editorStore.getState()
  const setAt = (i: number, r: Recipe) => s().setRecipe(i, r)

  return (
    <div className="catalogue">
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addRecipe()}>
          + Recipe
        </button>
      </div>
      {recipes.length === 0 && <p className="layer-list__empty">No recipes yet.</p>}
      {recipes.map((r, i) => (
        <div key={i} className="recipe-row">
          <ItemSelect value={r.a} items={items} onChange={(a) => setAt(i, { ...r, a })} />
          <span className="recipe-row__sep">+</span>
          <ItemSelect value={r.b} items={items} onChange={(b) => setAt(i, { ...r, b })} />
          <span className="recipe-row__sep">→</span>
          <ItemSelect
            value={r.output}
            items={items}
            onChange={(output) => setAt(i, { ...r, output })}
          />
          <button type="button" className="logic__del" onClick={() => s().removeRecipe(i)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
