import type { MouseEvent } from 'react'
import type { SpawnPoint } from '../data/schema'

/**
 * Preview overlay for spawn points (M12.5 #7): a small ◎ circle marker + the target label at
 * each point (the selected one highlighted). In `place` mode a click on the preview positions
 * the selected spawn point. The shape is fixed (a dot) — only the position + target are authored.
 */
export function SpawnOverlay({
  spawnPoints,
  selected,
  placeMode,
  onPlace,
}: {
  spawnPoints: SpawnPoint[]
  selected: number | null
  placeMode: boolean
  onPlace: (xFrac: number, yFrac: number) => void
}) {
  const click = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onPlace((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }

  return (
    <div className="npc-overlay">
      {spawnPoints.map((sp, i) => (
        <span
          key={i}
          className={`spawn-overlay__marker${i === selected ? ' spawn-overlay__marker--selected' : ''}`}
          style={{ left: `${sp.at.xFrac * 100}%`, top: `${sp.at.yFrac * 100}%` }}
        >
          <span className="spawn-overlay__dot" />
          <span className="spawn-overlay__label">{sp.target}</span>
        </span>
      ))}
      {placeMode && <div className="npc-overlay__catcher" onClick={click} />}
    </div>
  )
}
