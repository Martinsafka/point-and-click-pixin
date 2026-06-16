import { useState } from 'react'
import type { GameDoc } from '../data/schema'
import { editorStore } from './editor-store'
import { SequenceEditor } from './SequenceEditor'

/**
 * The Sequences library (Sequences tab): reusable **cutscenes**, started in-game by the
 * `startSequence` effect (on an interactable, trigger, dialogue node, or scene-entry).
 * Add / remove a sequence here; **Edit** opens the step-list editor. Ids are fixed at
 * creation (the `startSequence` effect points at them).
 */
export function SequenceList({ sequences }: { sequences: GameDoc['sequences'] }) {
  const s = () => editorStore.getState()
  const map = sequences ?? {}
  const ids = Object.keys(map)
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="catalogue">
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addSequence()}>
          + Cutscene
        </button>
      </div>
      {ids.length === 0 && (
        <p className="layer-list__empty">
          No cutscenes yet — add one, build its steps, then fire it with a `startSequence`
          effect.
        </p>
      )}
      {ids.map((id) => (
        <div key={id} className="cursor-row">
          <span className="cursor-row__kind">{id}</span>
          <span className="dlg-list__count">{map[id].steps.length} steps</span>
          <button type="button" onClick={() => setEditing(id)}>
            Edit
          </button>
          <button type="button" className="logic__del" onClick={() => s().removeSequence(id)}>
            ✕
          </button>
        </div>
      ))}
      {editing && <SequenceEditor seqId={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
