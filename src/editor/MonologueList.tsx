import type { ItemDef, ItemId, Monologue, SceneId } from '../data/schema'
import { ConditionEditor } from './ConditionEditor'
import { SoundSelect } from './SoundSelect'

/**
 * Ambient monologues (M12.5 #6) for an NPC — timed world-space speech bubbles. The first whose
 * `when` passes is active; it shows after `after` ms, then repeats every `every` ms (blank =
 * once). A flag thus swaps which line the NPC mutters.
 */
export function MonologueList({
  monologues,
  onChange,
  items,
  sceneIds,
}: {
  monologues: Monologue[]
  onChange: (monologues: Monologue[]) => void
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
}) {
  const patch = (i: number, p: Partial<Monologue>) =>
    onChange(monologues.map((m, j) => (j === i ? { ...m, ...p } : m)))
  const num = (v: string) => (v === '' ? undefined : Number(v))

  return (
    <div className="logic">
      <div className="logic__head">
        <span>Monologues · {monologues.length}</span>
        <button
          type="button"
          className="logic__add"
          onClick={() => onChange([...monologues, { text: '' }])}
        >
          + line
        </button>
      </div>
      <p className="intr-form__note">
        Speech bubbles over the NPC. Lines whose condition passes <strong>cycle</strong> in order;
        each waits its <code>every</code> ms (or a default) before the next. A flag adds / removes
        lines.
      </p>
      {monologues.map((m, i) => (
        <div key={i} className="logic__rule">
          <div className="logic__field">
            <input
              className="logic__in"
              placeholder="line…"
              value={m.text}
              onChange={(e) => patch(i, { text: e.target.value })}
            />
            <button
              type="button"
              className="logic__del"
              onClick={() => onChange(monologues.filter((_, j) => j !== i))}
            >
              ✕
            </button>
          </div>
          <div className="logic__field">
            <span>after ms</span>
            <input
              className="logic__in"
              type="number"
              placeholder="2000"
              value={m.after ?? ''}
              onChange={(e) => patch(i, { after: num(e.target.value) })}
            />
            <span>every ms</span>
            <input
              className="logic__in"
              type="number"
              placeholder="once"
              value={m.every ?? ''}
              onChange={(e) => patch(i, { every: num(e.target.value) })}
            />
          </div>
          <div className="logic__field">
            <span>sound</span>
            <SoundSelect value={m.sound} onChange={(sound) => patch(i, { sound })} />
          </div>
          <div className="logic__field logic__field--col">
            <span>when (active while)</span>
            <ConditionEditor
              condition={m.when}
              onChange={(c) => patch(i, { when: c })}
              items={items}
              sceneIds={sceneIds}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
