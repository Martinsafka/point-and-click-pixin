import type { MouseEvent } from 'react'

interface Props {
  holes: number[][]
  selectedIndex: number | null
  /** In draw mode, clicking the preview adds a vertex to the selected hole. */
  drawMode: boolean
  onAddPoint: (xFrac: number, yFrac: number) => void
}

function toPoints(poly: number[]): [number, number][] {
  const pts: [number, number][] = []
  for (let i = 0; i + 1 < poly.length; i += 2) pts.push([poly[i], poly[i + 1]])
  return pts
}

/**
 * DOM/SVG overlay drawing the scene's obstacle holes (cut out of the walkable), the
 * selected one highlighted with vertices. In draw mode, clicks become vertices of
 * the selected hole. Fractions map to the pane via an SVG 0–1 viewBox.
 */
export function HoleOverlay({ holes, selectedIndex, drawMode, onAddPoint }: Props) {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onAddPoint((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }
  const selected = selectedIndex !== null ? holes[selectedIndex] : undefined
  const selectedPts = selected ? toPoints(selected) : []

  return (
    <div className="hole-overlay">
      <svg className="hole-overlay__svg" viewBox="0 0 1 1" preserveAspectRatio="none">
        {holes.map((h, i) => {
          const pts = toPoints(h)
          if (pts.length < 2) return null
          return (
            <polygon
              key={i}
              className={`hole${i === selectedIndex ? ' hole--selected' : ''}`}
              points={pts.map((p) => p.join(',')).join(' ')}
            />
          )
        })}
      </svg>
      {selectedPts.map(([x, y], i) => (
        <span
          key={i}
          className="hole-overlay__vertex"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      ))}
      {drawMode && <div className="hole-overlay__catcher" onClick={onClick} />}
    </div>
  )
}
