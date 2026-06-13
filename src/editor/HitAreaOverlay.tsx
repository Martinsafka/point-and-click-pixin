import type { MouseEvent } from 'react'
import type { InteractableData } from '../data/schema'

interface Props {
  interactables: InteractableData[]
  selectedIndex: number | null
  /** In draw mode, clicking the preview adds a vertex to the selected hit-area. */
  drawMode: boolean
  onAddPoint: (xFrac: number, yFrac: number) => void
}

function toPoints(poly: number[]): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i + 1 < poly.length; i += 2) pts.push([poly[i], poly[i + 1]])
  return pts
}

function centroid(pts: [number, number][]): [number, number] {
  const n = pts.length || 1
  return [pts.reduce((s, p) => s + p[0], 0) / n, pts.reduce((s, p) => s + p[1], 0) / n]
}

/**
 * DOM/SVG overlay drawing every interactable's hit-area (coloured by kind, the
 * selected one highlighted with vertices), each labelled by id at its centroid.
 * In draw mode, clicks become vertices of the selected hit-area. Fractions map to
 * the pane via an SVG 0–1 viewBox, like the walkable overlay.
 */
export function HitAreaOverlay({ interactables, selectedIndex, drawMode, onAddPoint }: Props) {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onAddPoint((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }
  const selected = selectedIndex !== null ? interactables[selectedIndex] : undefined
  const selectedPts = selected ? toPoints(selected.hitArea) : []

  return (
    <div className="hitarea-overlay">
      <svg className="hitarea-overlay__svg" viewBox="0 0 1 1" preserveAspectRatio="none">
        {interactables.map((it, i) => {
          const pts = toPoints(it.hitArea)
          if (pts.length < 2) return null
          const selectedCls = i === selectedIndex ? ' hitarea--selected' : ''
          return (
            <polygon
              key={i}
              className={`hitarea hitarea--${it.kind}${selectedCls}`}
              points={pts.map((p) => p.join(',')).join(' ')}
            />
          )
        })}
      </svg>
      {interactables.map((it, i) => {
        const pts = toPoints(it.hitArea)
        if (pts.length === 0) return null
        const [cx, cy] = centroid(pts)
        const selectedCls = i === selectedIndex ? ' hitarea-overlay__label--selected' : ''
        return (
          <span
            key={i}
            className={`hitarea-overlay__label${selectedCls}`}
            style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
          >
            {it.id}
          </span>
        )
      })}
      {selectedPts.map(([x, y], i) => (
        <span
          key={i}
          className="hitarea-overlay__vertex"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      ))}
      {drawMode && <div className="hitarea-overlay__catcher" onClick={onClick} />}
    </div>
  )
}
