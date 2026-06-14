import type { Effect, ItemDef, ItemId, SceneId } from '../data/schema'

/** Item picker reused across the logic editors (effects, conditions, uses). */
export function ItemSelect({
  value,
  items,
  onChange,
}: {
  value: string
  items: Record<ItemId, ItemDef>
  onChange: (v: string) => void
}) {
  return (
    <select className="logic__sel" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">—</option>
      {Object.values(items).map((it) => (
        <option key={it.id} value={it.id}>
          {it.name}
        </option>
      ))}
    </select>
  )
}

/** Scene picker reused across the logic editors. */
export function SceneSelect({
  value,
  sceneIds,
  onChange,
}: {
  value: string
  sceneIds: SceneId[]
  onChange: (v: string) => void
}) {
  return (
    <select className="logic__sel" value={value} onChange={(e) => onChange(e.target.value)}>
      {sceneIds.map((id) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </select>
  )
}

/** A `<select>` for the effect pickers (animation names, target actors). A current
 *  value not among `options` stays selectable, so custom / stale values are never
 *  silently dropped. `empty` adds a leading "—" for optional fields. */
function OptionSelect({
  value,
  options,
  onChange,
  empty = false,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
  empty?: boolean
}) {
  const opts = value && !options.includes(value) ? [value, ...options] : options
  return (
    <select className="logic__sel" value={value} onChange={(e) => onChange(e.target.value)}>
      {empty && <option value="">—</option>}
      {opts.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

const EFFECT_KINDS: Effect['kind'][] = [
  'setFlag',
  'giveItem',
  'takeItem',
  'goTo',
  'startDialog',
  'playSound',
  'playAnim',
  'wait',
  'setStance',
]

function defaultEffect(kind: Effect['kind'], sceneIds: SceneId[], itemIds: ItemId[]): Effect {
  switch (kind) {
    case 'setFlag':
      return { kind: 'setFlag', flag: '' }
    case 'giveItem':
      return { kind: 'giveItem', item: itemIds[0] ?? '' }
    case 'takeItem':
      return { kind: 'takeItem', item: itemIds[0] ?? '' }
    case 'goTo':
      return { kind: 'goTo', scene: sceneIds[0] ?? '' }
    case 'startDialog':
      return { kind: 'startDialog', dialog: '' }
    case 'playSound':
      return { kind: 'playSound', sound: '' }
    case 'playAnim':
      return { kind: 'playAnim', action: 'interact' }
    case 'wait':
      return { kind: 'wait', ms: 1000 }
    case 'setStance':
      return { kind: 'setStance' }
  }
}

function EffectFields({
  effect,
  onChange,
  items,
  sceneIds,
  animations,
  targets,
}: {
  effect: Effect
  onChange: (e: Effect) => void
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
  animations: string[]
  targets: string[]
}) {
  switch (effect.kind) {
    case 'setFlag':
      return (
        <>
          <input
            className="logic__in"
            placeholder="flag"
            value={effect.flag}
            onChange={(e) => onChange({ ...effect, flag: e.target.value })}
          />
          <label className="logic__chk">
            <input
              type="checkbox"
              checked={effect.value !== false}
              onChange={(e) => onChange({ ...effect, value: e.target.checked })}
            />
            on
          </label>
        </>
      )
    case 'giveItem':
    case 'takeItem':
      return (
        <ItemSelect
          value={effect.item}
          items={items}
          onChange={(item) => onChange({ ...effect, item })}
        />
      )
    case 'goTo':
      return (
        <SceneSelect
          value={effect.scene}
          sceneIds={sceneIds}
          onChange={(scene) => onChange({ ...effect, scene })}
        />
      )
    case 'startDialog':
      return (
        <input
          className="logic__in"
          placeholder="dialog"
          value={effect.dialog}
          onChange={(e) => onChange({ ...effect, dialog: e.target.value })}
        />
      )
    case 'playSound':
      return (
        <label className="editor__import">
          {effect.sound ? 'sound ✓' : '+ Sound'}
          <input
            type="file"
            accept="audio/*"
            hidden
            onChange={(ev) => {
              const file = ev.target.files?.[0]
              ev.target.value = ''
              if (!file) return
              const reader = new FileReader()
              reader.onload = () => onChange({ ...effect, sound: String(reader.result) })
              reader.readAsDataURL(file)
            }}
          />
        </label>
      )
    case 'playAnim':
      return (
        <>
          <OptionSelect
            value={effect.action}
            options={animations}
            onChange={(action) => onChange({ ...effect, action })}
          />
          <OptionSelect
            value={effect.target ?? 'player'}
            options={targets}
            onChange={(t) => onChange({ ...effect, target: t === 'player' ? undefined : t })}
          />
        </>
      )
    case 'wait':
      return (
        <>
          <input
            className="logic__in"
            type="number"
            placeholder="ms"
            value={effect.ms}
            onChange={(e) => onChange({ ...effect, ms: Number(e.target.value) || 0 })}
          />
          <OptionSelect
            value={effect.anim ?? ''}
            options={animations}
            empty
            onChange={(anim) => onChange({ ...effect, anim: anim || undefined })}
          />
        </>
      )
    case 'setStance':
      return (
        <>
          <OptionSelect
            value={effect.action ?? ''}
            options={animations}
            empty
            onChange={(action) => onChange({ ...effect, action: action || undefined })}
          />
          <OptionSelect
            value={effect.target ?? 'player'}
            options={targets}
            onChange={(t) => onChange({ ...effect, target: t === 'player' ? undefined : t })}
          />
        </>
      )
  }
}

/**
 * Controlled editor for an `Effect[]` — add / remove / reorder effects and edit
 * each one's params. Reused for an interactable's effects and for each use rule's
 * effects. The parent persists the new array via `onChange`.
 */
export function EffectList({
  effects,
  onChange,
  items,
  sceneIds,
  animations,
  targets,
  label = 'Effects',
}: {
  effects: Effect[]
  onChange: (effects: Effect[]) => void
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
  /** Action-clip names offered by the `playAnim` / `wait` pickers (see actionNames). */
  animations: string[]
  /** Actor ids offered by the `playAnim` target picker — player + cast (see actorIds). */
  targets: string[]
  label?: string
}) {
  const itemIds = Object.keys(items)
  const setAt = (i: number, e: Effect) => onChange(effects.map((x, j) => (j === i ? e : x)))

  return (
    <div className="logic">
      <div className="logic__head">
        <span>{label}</span>
        <button
          type="button"
          className="logic__add"
          onClick={() => onChange([...effects, defaultEffect('setFlag', sceneIds, itemIds)])}
        >
          + Effect
        </button>
      </div>
      {effects.map((e, i) => (
        <div key={i} className="logic__row">
          <select
            className="logic__sel"
            value={e.kind}
            onChange={(ev) =>
              setAt(i, defaultEffect(ev.target.value as Effect['kind'], sceneIds, itemIds))
            }
          >
            {EFFECT_KINDS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <EffectFields
            effect={e}
            onChange={(e2) => setAt(i, e2)}
            items={items}
            sceneIds={sceneIds}
            animations={animations}
            targets={targets}
          />
          <button
            type="button"
            className="logic__del"
            onClick={() => onChange(effects.filter((_, j) => j !== i))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
