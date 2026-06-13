// Walkable-area system: keeps a character on a polygon (e.g. the road). Pure
// geometry, no Pixi — the entity owns the area and clamps against it while
// moving. A concave polygon (the L/⊥ road) is fine: off-area points snap to the
// nearest boundary point, so movement slides along edges. A* over a walk-mesh is
// the richer follow-up (agent_docs/architecture.md).

export interface WalkArea {
  /** Closed simple polygon as flat [x0, y0, x1, y1, ...], in mid-layer coords. */
  readonly polygon: readonly number[]
}

/** Ray-casting point-in-polygon test. */
export function containsPoint(area: WalkArea, x: number, y: number): boolean {
  const p = area.polygon
  let inside = false
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const yi = p[i + 1]
    const yj = p[j + 1]
    if (yi > y !== yj > y) {
      const xCross = ((p[j] - p[i]) * (y - yi)) / (yj - yi) + p[i]
      if (x < xCross) inside = !inside
    }
  }
  return inside
}

/** The point itself if inside the area, else the nearest point on its boundary. */
export function clampToArea(area: WalkArea, x: number, y: number): { x: number; y: number } {
  if (containsPoint(area, x, y)) return { x, y }

  const p = area.polygon
  let bestX = x
  let bestY = y
  let bestDist = Infinity
  for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) {
    const [cx, cy] = nearestOnSegment(x, y, p[j], p[j + 1], p[i], p[i + 1])
    const dx = x - cx
    const dy = y - cy
    const d = dx * dx + dy * dy
    if (d < bestDist) {
      bestDist = d
      bestX = cx
      bestY = cy
    }
  }
  return { x: bestX, y: bestY }
}

function nearestOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): [number, number] {
  const abx = bx - ax
  const aby = by - ay
  const len2 = abx * abx + aby * aby
  if (len2 === 0) return [ax, ay]
  let t = ((px - ax) * abx + (py - ay) * aby) / len2
  t = t < 0 ? 0 : t > 1 ? 1 : t
  return [ax + t * abx, ay + t * aby]
}
