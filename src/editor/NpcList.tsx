import type { ItemDef, ItemId, NpcData, SceneId } from '../data/schema'
import { editorStore } from './editor-store'
import { ConditionEditor } from './ConditionEditor'

/**
 * Per-scene NPC list: add / remove / select a character, edit its id + `when` gate,
 * and **Place** it (click the preview to set its spawn). NPCs are static for now;
 * movement paths arrive in M7 step 3.
 */
export function NpcList({
  sceneId,
  npcs,
  selectedIndex,
  onSelect,
  placeMode,
  onTogglePlace,
  items,
  sceneIds,
}: {
  sceneId: SceneId
  npcs: NpcData[]
  selectedIndex: number | null
  onSelect: (i: number) => void
  placeMode: boolean
  onTogglePlace: () => void
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
}) {
  const s = () => editorStore.getState()
  const sel = selectedIndex !== null ? npcs[selectedIndex] : undefined

  return (
    <>
      <div className="editor__toolbar">
        <button
          type="button"
          onClick={() => {
            const i = npcs.length
            s().addNpc(sceneId)
            onSelect(i)
          }}
        >
          + NPC
        </button>
      </div>
      {npcs.length > 0 && (
        <ul className="editor__interactables">
          {npcs.map((npc, i) => (
            <li key={i} className="intr-row">
              <button
                type="button"
                className={`intr-row__select intr-row__select--trigger${
                  i === selectedIndex ? ' intr-row__select--active' : ''
                }`}
                onClick={() => onSelect(i)}
              >
                <span className="intr-row__kind">npc</span> {npc.id}
              </button>
              <button
                type="button"
                className="intr-row__del"
                onClick={() => s().removeNpc(sceneId, i)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {sel && selectedIndex !== null && (
        <div className="intr-form">
          <label className="intr-form__field">
            <span>id</span>
            <input
              value={sel.id}
              onChange={(e) => s().setNpcId(sceneId, selectedIndex, e.target.value)}
            />
          </label>
          <div className="intr-form__field intr-form__field--col">
            <span>when</span>
            <ConditionEditor
              condition={sel.when}
              onChange={(c) => s().setNpcWhen(sceneId, selectedIndex, c)}
              items={items}
              sceneIds={sceneIds}
            />
          </div>
          <div className="editor__toolbar">
            <button
              type="button"
              className={placeMode ? 'editor__btn--active' : undefined}
              onClick={onTogglePlace}
            >
              {placeMode ? 'Done' : 'Place'}
            </button>
            <span className="intr-form__note">
              spawn {sel.spawn.xFrac.toFixed(2)}, {sel.spawn.yFrac.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </>
  )
}
