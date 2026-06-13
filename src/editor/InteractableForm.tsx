import { type ChangeEvent } from 'react'
import { editorStore } from './editor-store'
import type { InteractableData, ItemDef, ItemId, SceneId } from '../data/schema'
import { EffectList } from './EffectList'
import { ConditionEditor } from './ConditionEditor'
import { UsesList } from './UsesList'

interface Props {
  sceneId: SceneId
  index: number
  interactable: InteractableData
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
  drawMode: boolean
  onToggleDraw: () => void
}

/**
 * Edits the selected interactable: id + the kind-specific fields (pickable → item,
 * exit → target, inspect → protagonist text + voice), plus the `when` gate, the
 * `examine` text, `effects`, item-`uses`, and the hit-area. Inspect is the "look /
 * comment" kind — text + optional audio, no effects/uses.
 */
export function InteractableForm({
  sceneId,
  index,
  interactable,
  items,
  sceneIds,
  drawMode,
  onToggleDraw,
}: Props) {
  const s = () => editorStore.getState()
  const points = interactable.hitArea.length / 2
  const isInspect = interactable.kind === 'inspect'

  const onAudio = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => s().setInteractableAudio(sceneId, index, String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <div className="intr-form">
      <label className="intr-form__field">
        <span>id</span>
        <input
          value={interactable.id}
          onChange={(e) => s().setInteractableId(sceneId, index, e.target.value)}
        />
      </label>

      {interactable.kind === 'pickable' && (
        <label className="intr-form__field">
          <span>item</span>
          <select
            value={interactable.item}
            onChange={(e) => s().setInteractableItem(sceneId, index, e.target.value)}
          >
            <option value="">—</option>
            {Object.values(items).map((it) => (
              <option key={it.id} value={it.id}>
                {it.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {interactable.kind === 'exit' && (
        <label className="intr-form__field">
          <span>to</span>
          <select
            value={interactable.to}
            onChange={(e) => s().setInteractableTo(sceneId, index, e.target.value)}
          >
            {sceneIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
      )}

      {interactable.kind === 'inspect' && (
        <>
          <label className="intr-form__field intr-form__field--col">
            <span>text</span>
            <input
              value={interactable.text ?? ''}
              placeholder="what the character says…"
              onChange={(e) => s().setInteractableText(sceneId, index, e.target.value)}
            />
          </label>
          <div className="intr-form__field">
            <span>audio</span>
            <label className="editor__import">
              {interactable.audio ? 'Change' : '+ Audio'}
              <input type="file" accept="audio/*" hidden onChange={onAudio} />
            </label>
            {interactable.audio && (
              <button
                type="button"
                className="logic__del"
                onClick={() => s().setInteractableAudio(sceneId, index, undefined)}
              >
                ✕
              </button>
            )}
          </div>
        </>
      )}

      {!isInspect && (
        <label className="intr-form__field">
          <span>look</span>
          <input
            value={interactable.examine ?? ''}
            placeholder="examine text…"
            onChange={(e) => s().setInteractableExamine(sceneId, index, e.target.value)}
          />
        </label>
      )}

      <div className="intr-form__field intr-form__field--col">
        <span>when</span>
        <ConditionEditor
          condition={interactable.when}
          onChange={(c) => s().setInteractableWhen(sceneId, index, c)}
          items={items}
          sceneIds={sceneIds}
        />
      </div>

      {!isInspect && (
        <EffectList
          effects={interactable.effects ?? []}
          onChange={(e) => s().setInteractableEffects(sceneId, index, e)}
          items={items}
          sceneIds={sceneIds}
        />
      )}

      {(interactable.kind === 'interact' || interactable.kind === 'exit') && (
        <UsesList
          uses={interactable.uses ?? []}
          onChange={(u) => s().setInteractableUses(sceneId, index, u)}
          items={items}
          sceneIds={sceneIds}
        />
      )}

      <div className="editor__toolbar">
        <button
          type="button"
          className={drawMode ? 'editor__btn--active' : undefined}
          onClick={onToggleDraw}
        >
          {drawMode ? 'Done' : `Hit-area · ${points} pts`}
        </button>
        <button type="button" onClick={() => s().setHitArea(sceneId, index, [])}>
          Clear
        </button>
      </div>
    </div>
  )
}
