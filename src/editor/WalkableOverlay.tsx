import type { MouseEvent } from 'react'

interface Props {
  /** The walkable polygon as flat screen fractions [x0, y0, x1, y1, ...]. */
  walkable: number[]
  /** In draw mode, clicking the preview adds a vertex. */
  drawMode: boolean
  onAddPoint: (xFrac: number, yFrac: number) => void
}

/**
 * A DOM/SVG overlay over the scene preview that draws the walkable polygon
 * (outline + vertices) and, in draw mode, turns clicks into vertices. Uses screen
 * fractions directly (SVG viewBox 0–1, stretched to the pane) so it aligns with
 * the Pixi scene, which also positions everything by fractions.
 */
export function WalkableOverlay({ walkable, drawMode, onAddPoint }: Props) {
  const points: [number, number][] = []
  for (let i = 0; i + 1 < walkable.length; i += 2) points.push([walkable[i], walkable[i + 1]])
  const pointsStr = points.map(([x, y]) => `${x},${y}`).join(' ')

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onAddPoint((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }

  return (
    <div className="walkable-overlay">
      {points.length >= 2 && (
        <svg className="walkable-overlay__svg" viewBox="0 0 1 1" preserveAspectRatio="none">
          <polygon points={pointsStr} />
        </svg>
      )}
      {points.map(([x, y], i) => (
        <span
          key={i}
          className="walkable-overlay__vertex"
          style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
        />
      ))}
      {drawMode && <div className="walkable-overlay__catcher" onClick={onClick} />}
    </div>
  )
}
