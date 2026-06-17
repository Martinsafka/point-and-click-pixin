import type { Condition, Effect, GameDoc, GameRule } from '../data/schema'
import { editorStore } from './editor-store'
import { ConditionEditor } from './ConditionEditor'
import { EffectList } from './EffectList'
import { actionNames, actorIds } from './effect-options'

/**
 * The Project tab's **Rules** section (M12a global rules engine). Each rule is a game-wide
 * reactive `when → then`: when its Condition holds, its Effects run — evaluated globally on
 * every story-state change, not attached to any object. Reuses `ConditionEditor` (when) +
 * `EffectList` (then). Edits patch `doc.rules` through one `setRules`.
 */
export function RulesEditor({ doc }: { doc: GameDoc }) {
  const rules = doc.rules ?? []
  const sceneIds = Object.keys(doc.scenes)
  const animations = actionNames(doc)
  const targets = actorIds(doc)
  const set = (next: GameRule[]) => editorStore.getState().setRules(next)
  const patchAt = (i: number, patch: Partial<GameRule>) =>
    set(rules.map((r, j) => (j === i ? { ...r, ...patch } : r)))

  return (
    <div className="logic">
      <div className="logic__head">
        <span>Rules · {rules.length}</span>
        <button
          type="button"
          className="logic__add"
          onClick={() => set([...rules, { when: { kind: 'flag', flag: '' }, then: [] }])}
        >
          + Rule
        </button>
      </div>

      {rules.length === 0 && (
        <p className="intr-form__note">
          A rule fires its effects whenever its condition becomes true, anywhere in the game (e.g.
          has all keys → open the gate). State effects only.
        </p>
      )}

      {rules.map((rule, i) => (
        <div key={i} className="logic__rule">
          <div className="logic__field">
            <input
              className="logic__in"
              placeholder="id (optional)"
              value={rule.id ?? ''}
              onChange={(e) => patchAt(i, { id: e.target.value || undefined })}
            />
            <label className="logic__chk">
              <input
                type="checkbox"
                checked={!!rule.once}
                onChange={(e) => patchAt(i, { once: e.target.checked || undefined })}
              />
              once
            </label>
            <button
              type="button"
              className="logic__del"
              onClick={() => set(rules.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>

          <div className="logic__field logic__field--col">
            <span>when</span>
            <ConditionEditor
              condition={rule.when}
              onChange={(c: Condition | undefined) =>
                patchAt(i, { when: c ?? { kind: 'flag', flag: '' } })
              }
              items={doc.items}
              sceneIds={sceneIds}
              allowEmpty={false}
            />
          </div>

          <EffectList
            effects={rule.then}
            onChange={(then: Effect[]) => patchAt(i, { then })}
            items={doc.items}
            sceneIds={sceneIds}
            animations={animations}
            targets={targets}
            label="then"
          />
        </div>
      ))}
    </div>
  )
}
