import earcut from 'earcut'

/**
 * Navigation over the walkable polygon (minus hole / obstacle polygons). The area is
 * triangulated (earcut) only for point-in-area tests (spawning / snapping a target);
 * the path itself is the shortest route through a **visibility graph** over the
 * obstacle corners. The visibility graph is robust to how earcut chooses its
 * diagonals — a triangle-adjacency channel can fan "the long way round" for thin or
 * aligned geometry, which a funnel then faithfully (wrongly) follows. Pure geometry
 * (no Pixi) so it's unit-testable.
 *
 * All coordinates are pixels (the engine resolves the fractional polygons first).
 */
export interface Point {
  x: number
  y: number
}

interface Mesh {
  verts: number[] // flat [x0, y0, ...] — walkable ring then each hole ring (the corners)
  tris: [number, number, number][] // triangulation, for point-in-area tests only
  boundary: [Point, Point][] // walkable outline + hole outlines (for line-of-sight)
}

export interface Navigation {
  /** Waypoints from (sx, sy) to (gx, gy), the last being the (clamped) goal. */
  findPath(sx: number, sy: number, gx: number, gy: number): Point[]
  /** Nearest point inside the mesh (for spawning / snapping a target). */
  clamp(x: number, y: number): Point
  contains(x: number, y: number): boolean
  /** Clear line of sight between two points (no obstacle / wall between) — for vision. */
  los(ax: number, ay: number, bx: number, by: number): boolean
}

const vx = (m: Mesh, i: number) => m.verts[i * 2]
const vy = (m: Mesh, i: number) => m.verts[i * 2 + 1]
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** 2× signed area of triangle (a, b, c); sign encodes winding / side. */
const area2 = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
  (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)

function pointInTri(m: Mesh, t: [number, number, number], x: number, y: number): boolean {
  const d1 = area2(vx(m, t[0]), vy(m, t[0]), vx(m, t[1]), vy(m, t[1]), x, y)
  const d2 = area2(vx(m, t[1]), vy(m, t[1]), vx(m, t[2]), vy(m, t[2]), x, y)
  const d3 = area2(vx(m, t[2]), vy(m, t[2]), vx(m, t[0]), vy(m, t[0]), x, y)
  const neg = d1 < 0 || d2 < 0 || d3 < 0
  const pos = d1 > 0 || d2 > 0 || d3 > 0
  return !(neg && pos) // all the same sign (or on an edge) → inside
}

function triangleAt(m: Mesh, x: number, y: number): number {
  for (let i = 0; i < m.tris.length; i += 1) if (pointInTri(m, m.tris[i], x, y)) return i
  return -1
}

function nearestOnSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Point {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2))
  return { x: ax + dx * t, y: ay + dy * t }
}

function clampToMesh(m: Mesh, x: number, y: number): Point {
  if (triangleAt(m, x, y) >= 0) return { x, y }
  let best: Point = { x, y }
  let bestD = Infinity
  for (const t of m.tris) {
    const edges: [number, number][] = [
      [t[0], t[1]],
      [t[1], t[2]],
      [t[2], t[0]],
    ]
    for (const [a, b] of edges) {
      const p = nearestOnSeg(x, y, vx(m, a), vy(m, a), vx(m, b), vy(m, b))
      const d = (p.x - x) ** 2 + (p.y - y) ** 2
      if (d < bestD) {
        bestD = d
        best = p
      }
    }
  }
  return best
}

/** Edges of a polygon ring, as point pairs (closing the loop). */
function ring(poly: number[]): [Point, Point][] {
  const out: [Point, Point][] = []
  const n = poly.length / 2
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n
    out.push([
      { x: poly[i * 2], y: poly[i * 2 + 1] },
      { x: poly[j * 2], y: poly[j * 2 + 1] },
    ])
  }
  return out
}

function buildMesh(walkable: number[], holes: number[][]): Mesh {
  const verts = [...walkable]
  const holeIndices: number[] = []
  for (const hole of holes) {
    holeIndices.push(verts.length / 2)
    verts.push(...hole)
  }
  const flat = earcut(verts, holeIndices.length ? holeIndices : undefined)

  const tris: [number, number, number][] = []
  for (let i = 0; i + 2 < flat.length; i += 3) {
    tris.push([flat[i], flat[i + 1], flat[i + 2]])
  }

  // The obstacle segments for line-of-sight: the walkable outline + each hole
  // outline (the input polygons). Deriving them from the triangulation is unsafe —
  // collinear vertices leave phantom unmatched edges.
  const boundary: [Point, Point][] = [ring(walkable), ...holes.map(ring)].flat()

  return { verts, tris, boundary }
}

/** Do segments ab and cd properly cross (strictly, not merely touch at an endpoint)? */
function segCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const d1 = area2(c.x, c.y, d.x, d.y, a.x, a.y)
  const d2 = area2(c.x, c.y, d.x, d.y, b.x, b.y)
  const d3 = area2(a.x, a.y, b.x, b.y, c.x, c.y)
  const d4 = area2(a.x, a.y, b.x, b.y, d.x, d.y)
  return d1 * d2 < 0 && d3 * d4 < 0
}

/** Clear straight line between two points? (Crosses no walkable / hole outline edge.) */
function lineOfSight(m: Mesh, a: Point, b: Point): boolean {
  // Midpoint inside the walkable: rejects a chord straight through a hole whose two
  // ends are both hole corners — it shares an endpoint with every hole edge, so
  // `segCross` (which ignores shared endpoints) never flags it.
  if (triangleAt(m, (a.x + b.x) / 2, (a.y + b.y) / 2) < 0) return false
  for (const [c, d] of m.boundary) if (segCross(a, b, c, d)) return false
  return true
}

/**
 * Shortest path start → goal through the visibility graph: nodes are the obstacle
 * corners plus start + goal, edges connect mutually visible nodes, A* over Euclidean
 * distance. Returns [start, ...corners, goal]. `cornerVis` is the precomputed
 * corner↔corner visibility (start/goal edges are tested per query).
 */
function visibilityPath(
  m: Mesh,
  corners: Point[],
  cornerVis: boolean[][],
  start: Point,
  goal: Point,
): Point[] {
  const n = corners.length + 2 // node 0 = start, 1 = goal, 2 + i = corners[i]
  const pt = (k: number): Point => (k === 0 ? start : k === 1 ? goal : corners[k - 2])
  const visible = (a: number, b: number): boolean =>
    a >= 2 && b >= 2 ? cornerVis[a - 2][b - 2] : lineOfSight(m, pt(a), pt(b))

  const g = new Map<number, number>([[0, 0]])
  const f = new Map<number, number>([[0, dist(start, goal)]])
  const came = new Map<number, number>()
  const open = new Set<number>([0])
  const closed = new Set<number>()

  while (open.size) {
    let cur = -1
    let best = Infinity
    for (const k of open) {
      const fk = f.get(k) ?? Infinity
      if (fk < best) {
        best = fk
        cur = k
      }
    }
    if (cur === 1) {
      const path = [goal]
      let c = 1
      while (came.has(c)) {
        c = came.get(c) as number
        path.unshift(pt(c))
      }
      return path
    }
    open.delete(cur)
    closed.add(cur)
    for (let nb = 0; nb < n; nb += 1) {
      if (nb === cur || closed.has(nb) || !visible(cur, nb)) continue
      const tentative = (g.get(cur) ?? Infinity) + dist(pt(cur), pt(nb))
      if (tentative < (g.get(nb) ?? Infinity)) {
        came.set(nb, cur)
        g.set(nb, tentative)
        f.set(nb, tentative + dist(pt(nb), goal))
        open.add(nb)
      }
    }
  }
  return [goal] // disconnected (shouldn't happen for in-mesh points) → straight
}

function findPath(
  m: Mesh,
  corners: Point[],
  cornerVis: boolean[][],
  sx: number,
  sy: number,
  gx: number,
  gy: number,
): Point[] {
  const start = clampToMesh(m, sx, sy)
  const goal = clampToMesh(m, gx, gy)
  if (lineOfSight(m, start, goal)) return [goal]
  const path = visibilityPath(m, corners, cornerVis, start, goal)
  // Drop the start point (the character is already there); keep the waypoints + goal.
  const waypoints = path.slice(1)
  return waypoints.length ? waypoints : [goal]
}

/** Build a `Navigation` from the walkable polygon + obstacle holes (all in px). */
export function buildNavigation(walkable: number[], holes: number[][] = []): Navigation {
  const mesh = buildMesh(walkable, holes)
  const corners: Point[] = []
  for (let i = 0; i < mesh.verts.length; i += 2) {
    corners.push({ x: mesh.verts[i], y: mesh.verts[i + 1] })
  }
  // Precompute corner↔corner visibility once (the graph backbone).
  const cornerVis: boolean[][] = corners.map(() => [])
  for (let i = 0; i < corners.length; i += 1) {
    for (let j = 0; j < corners.length; j += 1) {
      cornerVis[i][j] = i !== j && lineOfSight(mesh, corners[i], corners[j])
    }
  }
  return {
    findPath: (sx, sy, gx, gy) => findPath(mesh, corners, cornerVis, sx, sy, gx, gy),
    clamp: (x, y) => clampToMesh(mesh, x, y),
    contains: (x, y) => triangleAt(mesh, x, y) >= 0,
    los: (ax, ay, bx, by) => lineOfSight(mesh, { x: ax, y: ay }, { x: bx, y: by }),
  }
}
