import type { MouseEvent } from 'react'
import type { NpcPlacement } from '../data/schema'

function toPoints(poly: number[]): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i + 1 < poly.length; i += 2) pts.push([poly[i], poly[i + 1]])
  return pts
}

/**
 * DOM overlay over the scene preview: each NPC placement's spawn (a dot + id, the
 * selected one highlighted) plus the selected placement's **patrol path** (dashed
 * polyline + waypoints). In `place` mode a click sets the spawn; in `path` mode a
 * click appends a waypoint. NPCs render as real sprites in the game.
 */
export function NpcOverlay({
  placements,
  selectedIndex,
  mode,
  onPlace,
  onAddPathPoint,
}: {
  placements: NpcPlacement[]
  selectedIndex: number | null
  mode: 'place' | 'path' | null
  onPlace: (xFrac: number, yFrac: number) => void
  onAddPathPoint: (xFrac: number, yFrac: number) => void
}) {
  const sel = selectedIndex !== null ? placements[selectedIndex] : undefined
  const pathPts = sel?.path ? toPoints(sel.path.points) : []
  const click = (cb: (x: number, y: number) => void) => (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    cb((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }

  return (
    <div className="npc-overlay">
      {pathPts.length >= 2 && (
        <svg className="npc-overlay__svg" viewBox="0 0 1 1" preserveAspectRatio="none">
          <polyline
            className="npc-overlay__path"
            points={pathPts.map((p) => p.join(',')).join(' ')}
          />
        </svg>
      )}
      {pathPts.map(([x, y], i) => (
        <span
          key={`wp${i}`}
          className="npc-overlay__waypoint"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      ))}
      {placements.map((p, i) => (
        <span
          key={i}
          className={`npc-overlay__marker${i === selectedIndex ? ' npc-overlay__marker--selected' : ''}`}
          style={{ left: `${p.spawn.xFrac * 100}%`, top: `${p.spawn.yFrac * 100}%` }}
        >
          {p.npc}
        </span>
      ))}
      {mode === 'place' && <div className="npc-overlay__catcher" onClick={click(onPlace)} />}
      {mode === 'path' && <div className="npc-overlay__catcher" onClick={click(onAddPathPoint)} />}
    </div>
  )
}
