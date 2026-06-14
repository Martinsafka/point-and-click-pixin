import type { MouseEvent } from 'react'
import type { NpcDef, NpcId, NpcPlacement, VisionConfig } from '../data/schema'

function toPoints(poly: number[]): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i + 1 < poly.length; i += 2) pts.push([poly[i], poly[i + 1]])
  return pts
}

/**
 * An SVG path (fractional 0-1 coords) for a placement's vision cone, drawn in design
 * space then squished by `aspect` (= width / height) so the `preserveAspectRatio="none"`
 * stretch un-squishes it to true proportions. The cone points at the first patrol
 * waypoint (the initial facing), else straight down; all-round vision draws a full
 * ellipse. Editor-only — the runtime cone follows the live facing.
 */
function conePath(p: NpcPlacement, vision: VisionConfig, aspect: number): string {
  const cx = p.spawn.xFrac
  const cy = p.spawn.yFrac
  let dir = Math.PI / 2 // straight down (S) by default
  if (p.path && p.path.points.length >= 2) {
    const dx = (p.path.points[0] - cx) * aspect
    const dy = p.path.points[1] - cy
    if (dx !== 0 || dy !== 0) dir = Math.atan2(dy, dx)
  }
  const r = vision.range
  const half = ((vision.angle ?? 360) / 2) * (Math.PI / 180)
  const pt = (a: number) => `${cx + (r * Math.cos(a)) / aspect},${cy + r * Math.sin(a)}`
  const N = 22
  if (half >= Math.PI) {
    let d = ''
    for (let k = 0; k <= N; k += 1) d += `${k === 0 ? 'M' : 'L'} ${pt((2 * Math.PI * k) / N)} `
    return `${d}Z`
  }
  let d = `M ${cx},${cy} `
  for (let k = 0; k <= N; k += 1) d += `L ${pt(dir - half + (2 * half * k) / N)} `
  return `${d}Z`
}

/**
 * DOM overlay over the scene preview: each NPC placement's spawn (a dot + id, the
 * selected one highlighted), the selected placement's **patrol path** (dashed polyline
 * + waypoints), and a **vision cone** for any placement whose cast NPC has stealth
 * vision. In `place` mode a click sets the spawn; in `path` mode a click appends a
 * waypoint.
 */
export function NpcOverlay({
  placements,
  cast,
  aspect,
  selectedIndex,
  mode,
  onPlace,
  onAddPathPoint,
}: {
  placements: NpcPlacement[]
  cast: Record<NpcId, NpcDef>
  aspect: number
  selectedIndex: number | null
  mode: 'place' | 'path' | null
  onPlace: (xFrac: number, yFrac: number) => void
  onAddPathPoint: (xFrac: number, yFrac: number) => void
}) {
  const sel = selectedIndex !== null ? placements[selectedIndex] : undefined
  // The selected NPC's route(s): the default `path` plus any conditional `paths`.
  const routes = sel
    ? [...(sel.path ? [sel.path] : []), ...(sel.paths ?? [])].map((p) => toPoints(p.points))
    : []
  const cones = placements.flatMap((p, i) => {
    const vision = cast[p.npc]?.vision
    return vision ? [{ i, d: conePath(p, vision, aspect) }] : []
  })
  const click = (cb: (x: number, y: number) => void) => (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    cb((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }

  return (
    <div className="npc-overlay">
      {(cones.length > 0 || routes.some((r) => r.length >= 2)) && (
        <svg className="npc-overlay__svg" viewBox="0 0 1 1" preserveAspectRatio="none">
          {cones.map(({ i, d }) => (
            <path key={`cone${i}`} className="npc-overlay__cone" d={d} />
          ))}
          {routes.map((pts, ri) =>
            pts.length >= 2 ? (
              <polyline
                key={`route${ri}`}
                className="npc-overlay__path"
                points={pts.map((p) => p.join(',')).join(' ')}
              />
            ) : null,
          )}
        </svg>
      )}
      {routes.flatMap((pts, ri) =>
        pts.map(([x, y], i) => (
          <span
            key={`wp${ri}-${i}`}
            className="npc-overlay__waypoint"
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          />
        )),
      )}
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
