import { type ChangeEvent } from 'react'
import { editorStore } from './editor-store'
import { EditorModal } from './EditorModal'
import { ConditionEditor } from './ConditionEditor'
import { CharacterEditor } from './CharacterEditor'
import { placeholderView } from '../entities/placeholder-atlas'

/** Drop an inspect with no text + no audio (so an emptied form clears the field). */
function trimInspect(inspect: { text?: string; audio?: string }) {
  const text = inspect.text?.trim() || undefined
  const audio = inspect.audio || undefined
  return text || audio ? { text, audio } : undefined
}

/**
 * The NPC's definition (modal): how the player interacts with it — a **dialogue** (from
 * the Dialogs library) gated by `dialogWhen`, with an **inspect** ("look at") fallback
 * when the gate fails or there's no dialogue. Appearance + voice land here next
 * (4d.3 / 4c). Reads the cast NPC live from the store; edits via `patchNpcDef`.
 */
export function NpcEditor({ npcId, onClose }: { npcId: string; onClose: () => void }) {
  const s = () => editorStore.getState()
  const doc = s().doc
  const npc = doc.npcs?.[npcId]
  if (!npc) return null
  const dialogIds = Object.keys(doc.dialogs ?? {})
  const sceneIds = Object.keys(doc.scenes)

  const onAudio = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      s().patchNpcDef(npcId, { inspect: { ...npc.inspect, audio: String(reader.result) } })
    reader.readAsDataURL(file)
  }

  return (
    <EditorModal title={`NPC · ${npc.name ?? npc.id}`} onClose={onClose}>
      <div className="intr-form__field">
        <span>dialog</span>
        <select
          className="logic__sel"
          value={npc.dialog ?? ''}
          onChange={(e) => s().patchNpcDef(npcId, { dialog: e.target.value || undefined })}
        >
          <option value="">— none —</option>
          {dialogIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      <div className="intr-form__field intr-form__field--col">
        <span>dialog when (else falls back to inspect)</span>
        <ConditionEditor
          condition={npc.dialogWhen}
          onChange={(c) => s().patchNpcDef(npcId, { dialogWhen: c })}
          items={doc.items}
          sceneIds={sceneIds}
        />
      </div>

      <div className="intr-form__field intr-form__field--col">
        <span>inspect text ("look at")</span>
        <input
          className="logic__in"
          placeholder="what the player says when looking…"
          value={npc.inspect?.text ?? ''}
          onChange={(e) =>
            s().patchNpcDef(npcId, {
              inspect: trimInspect({ ...npc.inspect, text: e.target.value }),
            })
          }
        />
      </div>
      <div className="intr-form__field">
        <span>inspect audio</span>
        <label className="editor__import">
          {npc.inspect?.audio ? 'Change' : '+ Audio'}
          <input type="file" accept="audio/*" hidden onChange={onAudio} />
        </label>
        {npc.inspect?.audio && (
          <button
            type="button"
            className="logic__del"
            onClick={() =>
              s().patchNpcDef(npcId, { inspect: trimInspect({ ...npc.inspect, audio: undefined }) })
            }
          >
            ✕
          </button>
        )}
      </div>

      <div className="intr-form__field intr-form__field--col">
        <span>appearance</span>
        <CharacterEditor
          view={npc.view}
          onCreate={() => s().patchNpcDef(npcId, { view: structuredClone(placeholderView) })}
          onChange={(patch) =>
            npc.view && s().patchNpcDef(npcId, { view: { ...npc.view, ...patch } })
          }
          onRemove={() => s().patchNpcDef(npcId, { view: undefined })}
        />
      </div>
    </EditorModal>
  )
}
