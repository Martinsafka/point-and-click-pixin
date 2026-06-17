import type { CharacterAppearance, ItemDef, ItemId, SceneId } from '../data/schema'
import { ConditionEditor } from './ConditionEditor'
import { CharacterEditor } from './CharacterEditor'
import { placeholderView } from '../entities/placeholder-atlas'

/**
 * Conditional appearance variants (M12.5 #3) for a character (the player or an NPC). Each
 * variant is a `when` condition + a full alternate view (reusing `CharacterEditor`); the first
 * whose condition passes replaces the base view at runtime, swapped live. Shared by the
 * Characters tab (player) and the NPC modal.
 */
export function AppearanceList({
  variants,
  onChange,
  items,
  sceneIds,
}: {
  variants: CharacterAppearance[]
  onChange: (variants: CharacterAppearance[]) => void
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
}) {
  const patch = (i: number, p: Partial<CharacterAppearance>) =>
    onChange(variants.map((v, j) => (j === i ? { ...v, ...p } : v)))

  return (
    <div className="logic">
      <div className="logic__head">
        <span>Appearance variants · {variants.length}</span>
        <button
          type="button"
          className="logic__add"
          onClick={() => onChange([...variants, { view: structuredClone(placeholderView) }])}
        >
          + variant
        </button>
      </div>
      <p className="intr-form__note">
        The first variant whose condition passes replaces the base view (swapped live when a flag
        flips).
      </p>
      {variants.map((v, i) => (
        <div key={i} className="logic__rule">
          <div className="logic__field logic__field--col">
            <span>when</span>
            <ConditionEditor
              condition={v.when}
              onChange={(c) => patch(i, { when: c })}
              items={items}
              sceneIds={sceneIds}
              allowEmpty={false}
            />
          </div>
          <CharacterEditor
            view={v.view}
            onCreate={() => {}}
            onChange={(p) => patch(i, { view: { ...v.view, ...p } })}
            onRemove={() => onChange(variants.filter((_, j) => j !== i))}
          />
        </div>
      ))}
    </div>
  )
}
