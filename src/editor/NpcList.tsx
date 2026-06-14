import type { ItemDef, ItemId, NpcDef, NpcId, NpcPlacement, SceneId } from '../data/schema'
import { editorStore } from './editor-store'
import { ConditionEditor } from './ConditionEditor'

/**
 * Per-scene NPC **placements**: place a cast NPC here (click the preview for its
 * spawn), pick which one, edit its `when` gate. A cast NPC can be placed in at most
 * one scene — the pickers only offer NPCs not placed elsewhere. The global cast is
 * edited in the Characters tab.
 */
export function NpcList({
  sceneId,
  placements,
  cast,
  placedNpcIds,
  selectedIndex,
  onSelect,
  placeMode,
  onTogglePlace,
  items,
  sceneIds,
}: {
  sceneId: SceneId
  placements: NpcPlacement[]
  cast: Record<NpcId, NpcDef>
  placedNpcIds: Set<NpcId>
  selectedIndex: number | null
  onSelect: (i: number) => void
  placeMode: boolean
  onTogglePlace: () => void
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
}) {
  const s = () => editorStore.getState()
  const castList = Object.values(cast)
  const firstFree = castList.find((n) => !placedNpcIds.has(n.id))
  const sel = selectedIndex !== null ? placements[selectedIndex] : undefined
  const label = (n: NpcDef) => (n.name ? `${n.name} (${n.id})` : n.id)

  return (
    <>
      <div className="editor__toolbar">
        <button
          type="button"
          disabled={!firstFree}
          onClick={() => {
            if (!firstFree) return
            const i = placements.length
            s().addNpcPlacement(sceneId, firstFree.id)
            onSelect(i)
          }}
        >
          + Place NPC
        </button>
      </div>
      {castList.length === 0 && (
        <p className="layer-list__empty">Add NPCs to the cast (Characters tab) first.</p>
      )}
      {placements.length > 0 && (
        <ul className="editor__interactables">
          {placements.map((p, i) => (
            <li key={i} className="intr-row">
              <button
                type="button"
                className={`intr-row__select intr-row__select--trigger${
                  i === selectedIndex ? ' intr-row__select--active' : ''
                }`}
                onClick={() => onSelect(i)}
              >
                <span className="intr-row__kind">npc</span> {cast[p.npc]?.name ?? p.npc}
              </button>
              <button
                type="button"
                className="intr-row__del"
                onClick={() => s().removeNpcPlacement(sceneId, i)}
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
            <span>npc</span>
            <select
              value={sel.npc}
              onChange={(e) => s().setNpcPlacementNpc(sceneId, selectedIndex, e.target.value)}
            >
              {castList
                .filter((n) => n.id === sel.npc || !placedNpcIds.has(n.id))
                .map((n) => (
                  <option key={n.id} value={n.id}>
                    {label(n)}
                  </option>
                ))}
            </select>
          </label>
          <div className="intr-form__field intr-form__field--col">
            <span>when</span>
            <ConditionEditor
              condition={sel.when}
              onChange={(c) => s().setNpcPlacementWhen(sceneId, selectedIndex, c)}
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
