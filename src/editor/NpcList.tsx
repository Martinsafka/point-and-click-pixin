import type { ItemDef, ItemId, NpcDef, NpcId, NpcPath, NpcPlacement, SceneId } from '../data/schema'
import { editorStore } from './editor-store'
import { ConditionEditor } from './ConditionEditor'

/**
 * Per-scene NPC **placements**: place a cast NPC here (click the preview for its
 * spawn), pick which one, edit its `when` gate. A cast NPC can be placed in several
 * scenes (its runtime location picks the active one; `moveNpc` moves it) — the pickers
 * only block a duplicate placement within *this* scene. Its **home** (the start scene
 * when placed in more than one) is set in the NPC modal. The global cast is edited in
 * the Characters tab.
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
  drawPathIndex,
  onToggleDrawPath,
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
  drawPathIndex: number | null
  onToggleDrawPath: (pathIdx: number) => void
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
}) {
  const s = () => editorStore.getState()
  const dialogIds = Object.keys(s().doc.dialogs ?? {})
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
          <label className="intr-form__field">
            <span>dialog</span>
            <select
              className="logic__sel"
              value={sel.dialog ?? ''}
              onChange={(e) =>
                s().setNpcPlacementDialog(sceneId, selectedIndex, e.target.value || undefined)
              }
            >
              <option value="">— cast default —</option>
              {dialogIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </label>
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
          <div className="intr-form__field intr-form__field--col">
            <span>paths (draw on the scene; routine nodes pick one)</span>
            <div className="editor__toolbar">
              <button type="button" onClick={() => s().addNpcPath(sceneId, selectedIndex)}>
                + Path
              </button>
            </div>
            {(sel.paths ?? []).map((pa, j) => (
              <div key={pa.id ?? j} className="npc-path-row">
                <input
                  className="logic__in"
                  value={pa.name ?? pa.id ?? ''}
                  placeholder="name"
                  title={`id: ${pa.id ?? '—'} (referenced by routine nodes)`}
                  onChange={(e) => s().setNpcPathName(sceneId, selectedIndex, j, e.target.value)}
                />
                <select
                  className="logic__sel"
                  value={pa.mode}
                  onChange={(e) =>
                    s().setNpcPathMode(sceneId, selectedIndex, j, e.target.value as NpcPath['mode'])
                  }
                >
                  <option value="once">once</option>
                  <option value="loop">loop</option>
                  <option value="pingpong">pingpong</option>
                </select>
                <button
                  type="button"
                  className={drawPathIndex === j ? 'editor__btn--active' : undefined}
                  onClick={() => onToggleDrawPath(j)}
                >
                  {drawPathIndex === j ? 'Done' : `Draw · ${pa.points.length / 2}`}
                </button>
                <button
                  type="button"
                  onClick={() => s().clearNpcPathPoints(sceneId, selectedIndex, j)}
                >
                  Clear
                </button>
                <button
                  type="button"
                  className="logic__del"
                  onClick={() => s().removeNpcPath(sceneId, selectedIndex, j)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
