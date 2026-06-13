import { editorStore } from './editor-store'
import type { InteractableData, ItemDef, ItemId, SceneId } from '../data/schema'

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
 * Edits the selected interactable: its id, the essential field (pickable → item,
 * exit → target scene), and its hit-area (draw / clear). The Condition + Effect +
 * `uses` forms come in M4 step 2.
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

      {interactable.kind === 'interact' && <p className="intr-form__note">Effects: M4 step 2.</p>}

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
