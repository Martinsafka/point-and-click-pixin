import type { NpcDef, NpcId, SceneId, SpawnPoint } from '../data/schema'
import { editorStore } from './editor-store'

/**
 * The Scene tab's **Spawn points** section (M12.5 #7) — fixed-shape markers that say where a
 * character starts in this scene, overriding the default spawn. **+ Spawn point** adds one,
 * **Place** then a preview click positions it, and the **who** picker assigns it to the player,
 * a specific NPC, or `all`. A specific-id point wins over an `all` point.
 */
export function SceneSpawns({
  sceneId,
  spawnPoints,
  cast,
  selected,
  onSelect,
  placeMode,
  onTogglePlace,
}: {
  sceneId: SceneId
  spawnPoints: SpawnPoint[]
  cast: Record<NpcId, NpcDef>
  selected: number | null
  onSelect: (i: number) => void
  placeMode: boolean
  onTogglePlace: () => void
}) {
  const s = () => editorStore.getState()
  const sp = selected !== null ? spawnPoints[selected] : undefined

  return (
    <>
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addSpawnPoint(sceneId)}>
          + Spawn point
        </button>
      </div>

      {spawnPoints.length > 0 && (
        <ul className="editor__interactables">
          {spawnPoints.map((p, i) => (
            <li key={i} className="intr-row">
              <button
                type="button"
                className={`intr-row__select${i === selected ? ' intr-row__select--active' : ''}`}
                onClick={() => onSelect(i)}
              >
                <span className="intr-row__kind">◎</span> {p.target}
              </button>
              <button
                type="button"
                className="intr-row__del"
                onClick={() => s().removeSpawnPoint(sceneId, i)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {sp && selected !== null && (
        <div className="intr-form">
          <div className="editor__toolbar">
            <button
              type="button"
              className={placeMode ? 'editor__btn--active' : undefined}
              onClick={onTogglePlace}
            >
              {placeMode ? 'Done' : 'Place'}
            </button>
          </div>
          <div className="intr-form__field">
            <span>who spawns</span>
            <select
              className="logic__in"
              value={sp.target}
              onChange={(e) => s().setSpawnPoint(sceneId, selected, { target: e.target.value })}
            >
              <option value="player">player</option>
              <option value="all">all</option>
              {Object.keys(cast).map((id) => (
                <option key={id} value={id}>
                  {cast[id].name ?? id}
                </option>
              ))}
            </select>
          </div>
          <p className="intr-form__note">Click Place, then click the preview to position it.</p>
        </div>
      )}
    </>
  )
}
