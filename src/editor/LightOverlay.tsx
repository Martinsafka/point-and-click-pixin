import type { MouseEvent } from 'react'
import type { DarkArea, LightSource } from '../data/schema'

function toPoints(poly: number[]): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i + 1 < poly.length; i += 2) pts.push([poly[i], poly[i + 1]])
  return pts
}

/**
 * Editor preview overlay for lighting (M10 10b): light **markers** (a ☀ at each light's
 * position, the selected one highlighted) + **dark-area** polygons (dashed outline + dots).
 * In `light` mode a click positions the selected light; in `darkarea` mode a click adds a
 * polygon point. (The actual lighting only renders in-game; this just places it.)
 */
export function LightOverlay({
  lights,
  darkAreas,
  selectedLight,
  selectedDarkArea,
  mode,
  onPlaceLight,
  onAddDarkPoint,
}: {
  lights: LightSource[]
  darkAreas: DarkArea[]
  selectedLight: number | null
  selectedDarkArea: number | null
  mode: 'light' | 'darkarea' | null
  onPlaceLight: (xFrac: number, yFrac: number) => void
  onAddDarkPoint: (xFrac: number, yFrac: number) => void
}) {
  const areas = darkAreas.map((a) => toPoints(a.polygon))
  const click = (cb: (x: number, y: number) => void) => (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    cb((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }

  return (
    <div className="npc-overlay">
      {areas.some((a) => a.length >= 2) && (
        <svg className="npc-overlay__svg" viewBox="0 0 1 1" preserveAspectRatio="none">
          {areas.map((pts, i) =>
            pts.length >= 2 ? (
              <polygon
                key={i}
                className="dark-overlay__poly"
                points={pts.map((p) => p.join(',')).join(' ')}
                style={{ opacity: i === selectedDarkArea ? 1 : 0.5 }}
              />
            ) : null,
          )}
        </svg>
      )}
      {areas.flatMap((pts, ai) =>
        pts.map(([x, y], i) => (
          <span
            key={`d${ai}-${i}`}
            className="npc-overlay__waypoint"
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
          />
        )),
      )}
      {lights.map((l, i) => (
        <span
          key={l.id}
          className={`light-overlay__marker${i === selectedLight ? ' light-overlay__marker--selected' : ''}`}
          style={{ left: `${l.x * 100}%`, top: `${l.y * 100}%`, color: l.color }}
        >
          ☀
        </span>
      ))}
      {mode === 'light' && <div className="npc-overlay__catcher" onClick={click(onPlaceLight)} />}
      {mode === 'darkarea' && (
        <div className="npc-overlay__catcher" onClick={click(onAddDarkPoint)} />
      )}
    </div>
  )
}
