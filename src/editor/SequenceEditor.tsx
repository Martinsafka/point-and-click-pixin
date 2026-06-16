import { useState } from 'react'
import { editorStore } from './editor-store'
import { EditorModal } from './EditorModal'
import { EffectList } from './EffectList'
import { actionNames, actorIds } from './effect-options'
import type { SeqStep } from '../data/schema'

const STEP_KINDS: SeqStep['kind'][] = [
  'wait',
  'move',
  'anim',
  'face',
  'dialog',
  'effects',
  'camera',
]

/** A short one-line summary of a step (shown on its row header). */
function stepSummary(step: SeqStep): string {
  switch (step.kind) {
    case 'wait':
      return `${step.ms} ms`
    case 'move':
      return `${step.actor} → ${step.to.xFrac.toFixed(2)}, ${step.to.yFrac.toFixed(2)}`
    case 'anim':
      return `${step.actor} · ${step.action}`
    case 'face':
      return `${step.actor} → ${step.to.xFrac.toFixed(2)}, ${step.to.yFrac.toFixed(2)}`
    case 'dialog':
      return step.dialog || '—'
    case 'effects':
      return `${step.effects.length} effect(s)`
    case 'camera':
      return `${step.actor ?? 'point'} · ×${step.zoom ?? 1}`
  }
}

/** A 0..1 fraction number input (for `to` points). */
function FracInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <input
      className="logic__in"
      type="number"
      min="0"
      max="1"
      step="0.01"
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  )
}

/** Per-kind fields for one step. `actors` / `animations` / `dialogIds` feed the pickers. */
function StepFields({
  step,
  onChange,
  actors,
  animations,
  dialogIds,
}: {
  step: SeqStep
  onChange: (s: SeqStep) => void
  actors: string[]
  animations: string[]
  dialogIds: string[]
}) {
  const s = () => editorStore.getState()
  const doc = s().doc
  const sceneIds = Object.keys(doc.scenes)
  const actorSelect = (value: string, onPick: (v: string) => void, allowPoint = false) => (
    <select className="logic__sel" value={value} onChange={(e) => onPick(e.target.value)}>
      {allowPoint && <option value="">— point —</option>}
      {actors.map((a) => (
        <option key={a} value={a}>
          {a}
        </option>
      ))}
    </select>
  )

  switch (step.kind) {
    case 'wait':
      return (
        <label className="intr-form__field">
          <span>ms</span>
          <input
            className="logic__in"
            type="number"
            min="0"
            step="100"
            value={step.ms}
            onChange={(e) => onChange({ ...step, ms: Number(e.target.value) || 0 })}
          />
        </label>
      )
    case 'move':
    case 'face':
      return (
        <div className="intr-form__field">
          <span>actor</span>
          {actorSelect(step.actor, (actor) => onChange({ ...step, actor }))}
          <span>x</span>
          <FracInput
            value={step.to.xFrac}
            onChange={(xFrac) => onChange({ ...step, to: { ...step.to, xFrac } })}
          />
          <span>y</span>
          <FracInput
            value={step.to.yFrac}
            onChange={(yFrac) => onChange({ ...step, to: { ...step.to, yFrac } })}
          />
        </div>
      )
    case 'anim':
      return (
        <div className="intr-form__field">
          <span>actor</span>
          {actorSelect(step.actor, (actor) => onChange({ ...step, actor }))}
          <span>anim</span>
          <select
            className="logic__sel"
            value={step.action}
            onChange={(e) => onChange({ ...step, action: e.target.value })}
          >
            {(animations.includes(step.action) ? animations : [step.action, ...animations]).map(
              (a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ),
            )}
          </select>
        </div>
      )
    case 'dialog':
      return (
        <label className="intr-form__field">
          <span>dialog</span>
          <select
            className="logic__sel"
            value={step.dialog}
            onChange={(e) => onChange({ ...step, dialog: e.target.value })}
          >
            <option value="">—</option>
            {dialogIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      )
    case 'effects':
      return (
        <EffectList
          effects={step.effects}
          onChange={(effects) => onChange({ ...step, effects })}
          items={doc.items}
          sceneIds={sceneIds}
          animations={animations}
          targets={actors}
          label="Effects"
        />
      )
    case 'camera': {
      const point = step.to ?? { xFrac: 0.5, yFrac: 0.85 }
      return (
        <div className="intr-form__field">
          <span>focus</span>
          {actorSelect(
            step.actor ?? '',
            (v) => onChange({ ...step, actor: v || undefined }),
            true,
          )}
          {!step.actor && (
            <>
              <span>x</span>
              <FracInput
                value={point.xFrac}
                onChange={(xFrac) => onChange({ ...step, to: { ...point, xFrac } })}
              />
              <span>y</span>
              <FracInput
                value={point.yFrac}
                onChange={(yFrac) => onChange({ ...step, to: { ...point, yFrac } })}
              />
            </>
          )}
          <span>zoom</span>
          <input
            className="logic__in"
            type="number"
            min="0.2"
            step="0.1"
            value={step.zoom ?? 1}
            onChange={(e) => onChange({ ...step, zoom: Number(e.target.value) || 1 })}
          />
          <span>ms</span>
          <input
            className="logic__in"
            type="number"
            min="0"
            step="100"
            value={step.ms ?? 600}
            onChange={(e) => onChange({ ...step, ms: Number(e.target.value) || 0 })}
          />
        </div>
      )
    }
  }
}

/**
 * The cutscene **step-list editor** (modal): an ordered list of steps you add (by kind),
 * reorder (↑/↓), remove, and edit per kind — moves / anims / faces (actor + a point),
 * camera (focus + zoom), a dialogue, a wait, or a batch of effects. Points are design-space
 * fractions (0..1). The sequence is started in-game by the `startSequence` effect.
 */
export function SequenceEditor({ seqId, onClose }: { seqId: string; onClose: () => void }) {
  const s = () => editorStore.getState()
  const [addKind, setAddKind] = useState<SeqStep['kind']>('wait')
  const doc = s().doc
  const seq = doc.sequences?.[seqId]
  if (!seq) return null
  const actors = actorIds(doc)
  const animations = actionNames(doc)
  const dialogIds = Object.keys(doc.dialogs ?? {})

  return (
    <EditorModal title={`Cutscene · ${seqId}`} onClose={onClose}>
      <div className="editor__toolbar">
        <span className="intr-form__note">{seq.steps.length} step(s)</span>
      </div>
      {seq.steps.map((step, i) => (
        <div key={i} className="logic">
          <div className="logic__head">
            <span>
              {i + 1}. {step.kind} — {stepSummary(step)}
            </span>
            <div>
              <button type="button" onClick={() => s().moveSeqStep(seqId, i, -1)} disabled={i === 0}>
                ↑
              </button>
              <button
                type="button"
                onClick={() => s().moveSeqStep(seqId, i, 1)}
                disabled={i === seq.steps.length - 1}
              >
                ↓
              </button>
              <button type="button" className="logic__del" onClick={() => s().removeSeqStep(seqId, i)}>
                ✕
              </button>
            </div>
          </div>
          <StepFields
            step={step}
            onChange={(next) => s().setSeqStep(seqId, i, next)}
            actors={actors}
            animations={animations}
            dialogIds={dialogIds}
          />
        </div>
      ))}
      <div className="editor__toolbar">
        <select
          className="logic__sel"
          value={addKind}
          onChange={(e) => setAddKind(e.target.value as SeqStep['kind'])}
        >
          {STEP_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => s().addSeqStep(seqId, addKind)}>
          + Step
        </button>
      </div>
    </EditorModal>
  )
}
