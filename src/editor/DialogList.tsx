import { useState } from 'react'
import type { GameDoc } from '../data/schema'
import { editorStore } from './editor-store'
import { DialogEditor } from './DialogEditor'

/**
 * The Dialogs library (Dialogs tab): a reusable set of dialogue trees, referenced by
 * NPCs (`NpcDef.dialog`) or placement overrides. Add / remove a dialog here; **Edit**
 * opens the node-tree editor. Ids are fixed at creation (references point at them).
 */
export function DialogList({ dialogs }: { dialogs: GameDoc['dialogs'] }) {
  const s = () => editorStore.getState()
  const map = dialogs ?? {}
  const ids = Object.keys(map)
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="catalogue">
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addDialog()}>
          + Dialog
        </button>
      </div>
      {ids.length === 0 && (
        <p className="layer-list__empty">
          No dialogs yet — add one, edit its nodes, then assign it to an NPC.
        </p>
      )}
      {ids.map((id) => (
        <div key={id} className="cursor-row">
          <span className="cursor-row__kind">{id}</span>
          <span className="dlg-list__count">{Object.keys(map[id].nodes).length} nodes</span>
          <button type="button" onClick={() => setEditing(id)}>
            Edit
          </button>
          <button type="button" className="logic__del" onClick={() => s().removeDialog(id)}>
            ✕
          </button>
        </div>
      ))}
      {editing && <DialogEditor dialogId={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
