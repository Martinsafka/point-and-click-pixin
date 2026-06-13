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
 * Edits the selected interactable: id + essential field (pickable → item, exit →
 * target scene), the `when` gate, its `effects`, and (interact / exit) item-`uses`
 * rules, plus its hit-area (draw / clear).
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

      <label className="intr-form__field">
        <span>look</span>
        <input
          value={interactable.examine ?? ''}
          placeholder="examine text…"
          onChange={(e) => s().setInteractableExamine(sceneId, index, e.target.value)}
        />
      </label>

      <div className="intr-form__field intr-form__field--col">
        <span>when</span>
        <ConditionEditor
          condition={interactable.when}
          onChange={(c) => s().setInteractableWhen(sceneId, index, c)}
          items={items}
          sceneIds={sceneIds}
        />
      </div>

      <EffectList
        effects={interactable.effects ?? []}
        onChange={(e) => s().setInteractableEffects(sceneId, index, e)}
        items={items}
        sceneIds={sceneIds}
      />

      {interactable.kind !== 'pickable' && (
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
