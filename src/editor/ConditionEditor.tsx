import type { Condition, ItemDef, ItemId, SceneId } from '../data/schema'
import { ItemSelect, SceneSelect } from './EffectList'

const COND_KINDS = ['hasItem', 'flag', 'visited', 'all', 'any', 'not'] as const

function defaultCondition(kind: string, sceneIds: SceneId[]): Condition | undefined {
  switch (kind) {
    case 'hasItem':
      return { kind: 'hasItem', item: '' }
    case 'flag':
      return { kind: 'flag', flag: '' }
    case 'visited':
      return { kind: 'visited', scene: sceneIds[0] ?? '' }
    case 'all':
      return { kind: 'all', of: [] }
    case 'any':
      return { kind: 'any', of: [] }
    case 'not':
      return { kind: 'not', of: { kind: 'flag', flag: '' } }
    default:
      return undefined
  }
}

interface Props {
  condition: Condition | undefined
  onChange: (c: Condition | undefined) => void
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
  /** Top-level gating may be empty ("(always)"); nested children may not. */
  allowEmpty?: boolean
}

/**
 * Recursive editor for the optional `Condition` vocabulary — leaves (hasItem /
 * flag / visited) plus the combinators (all / any / not) that nest more editors.
 * Controlled: emits the new Condition (or undefined = "always") via `onChange`.
 */
export function ConditionEditor({
  condition,
  onChange,
  items,
  sceneIds,
  allowEmpty = true,
}: Props) {
  return (
    <div className="logic__cond">
      <select
        className="logic__sel"
        value={condition?.kind ?? '(always)'}
        onChange={(e) => onChange(defaultCondition(e.target.value, sceneIds))}
      >
        {allowEmpty && <option value="(always)">(always)</option>}
        {COND_KINDS.map((k) => (
          <option key={k} value={k}>
            {k}
          </option>
        ))}
      </select>

      {condition?.kind === 'hasItem' && (
        <ItemSelect
          value={condition.item}
          items={items}
          onChange={(item) => onChange({ kind: 'hasItem', item })}
        />
      )}

      {condition?.kind === 'flag' && (
        <>
          <input
            className="logic__in"
            placeholder="flag"
            value={condition.flag}
            onChange={(e) =>
              onChange({ kind: 'flag', flag: e.target.value, value: condition.value })
            }
          />
          <label className="logic__chk">
            <input
              type="checkbox"
              checked={condition.value !== false}
              onChange={(e) =>
                onChange({ kind: 'flag', flag: condition.flag, value: e.target.checked })
              }
            />
            on
          </label>
        </>
      )}

      {condition?.kind === 'visited' && (
        <SceneSelect
          value={condition.scene}
          sceneIds={sceneIds}
          onChange={(scene) => onChange({ kind: 'visited', scene })}
        />
      )}

      {(condition?.kind === 'all' || condition?.kind === 'any') && (
        <div className="logic__nested">
          {condition.of.map((c, i) => (
            <div key={i} className="logic__nested-row">
              <ConditionEditor
                condition={c}
                onChange={(nc) => {
                  const next = condition.of.slice()
                  if (nc) next[i] = nc
                  else next.splice(i, 1)
                  onChange({ ...condition, of: next })
                }}
                items={items}
                sceneIds={sceneIds}
                allowEmpty={false}
              />
              <button
                type="button"
                className="logic__del"
                onClick={() => {
                  const next = condition.of.slice()
                  next.splice(i, 1)
                  onChange({ ...condition, of: next })
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="logic__add"
            onClick={() =>
              onChange({ ...condition, of: [...condition.of, { kind: 'flag', flag: '' }] })
            }
          >
            + cond
          </button>
        </div>
      )}

      {condition?.kind === 'not' && (
        <div className="logic__nested">
          <ConditionEditor
            condition={condition.of}
            onChange={(nc) => onChange({ kind: 'not', of: nc ?? { kind: 'flag', flag: '' } })}
            items={items}
            sceneIds={sceneIds}
            allowEmpty={false}
          />
        </div>
      )}
    </div>
  )
}
