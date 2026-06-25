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
  sceneIds,
  selected,
  onSelect,
  placeMode,
  onTogglePlace,
}: {
  sceneId: SceneId
  spawnPoints: SpawnPoint[]
  cast: Record<NpcId, NpcDef>
  sceneIds: SceneId[]
  selected: number | null
  onSelect: (i: number) => void
  placeMode: boolean
  onTogglePlace: () => void
}) {
  const s = () => editorStore.getState()
  const sceneName = (id: SceneId) => s().doc.scenes[id]?.name ?? id
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
                {p.on === 'start' ? ' · start' : p.from ? ` · from ${sceneName(p.from)}` : ''}
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
          {(sp.target === 'player' || sp.target === 'all') && (
            <div className="intr-form__field">
              <span>spawns on</span>
              <select
                className="logic__in"
                value={sp.on ?? 'transition'}
                onChange={(e) =>
                  s().setSpawnTrigger(sceneId, selected, e.target.value as 'start' | 'transition')
                }
              >
                <option value="transition">scene transition</option>
                <option value="start">game start (once)</option>
              </select>
            </div>
          )}
          {(sp.target === 'player' || sp.target === 'all') &&
            (sp.on ?? 'transition') === 'transition' && (
              <div className="intr-form__field">
                <span>from scene</span>
                <select
                  className="logic__in"
                  value={sp.from ?? ''}
                  title="Apply this spawn only when the player arrives from this scene ((any) = the fallback for other entries)."
                  onChange={(e) => s().setSpawnFrom(sceneId, selected, e.target.value || undefined)}
                >
                  <option value="">(any)</option>
                  {sceneIds
                    .filter((id) => id !== sceneId)
                    .map((id) => (
                      <option key={id} value={id}>
                        {sceneName(id)} ({id})
                      </option>
                    ))}
                </select>
              </div>
            )}
          {sp.on === 'start' && (
            <p className="intr-form__note">
              The game's start position — only one spawn point in the whole game can be this.
            </p>
          )}
          <p className="intr-form__note">Click Place, then click the preview to position it.</p>
        </div>
      )}
    </>
  )
}
