import earcut from 'earcut'

/**
 * Navigation mesh over the walkable polygon (minus hole/obstacle polygons): the
 * area is triangulated (earcut), A* searches the triangle adjacency graph, and the
 * funnel (string-pulling) algorithm turns the triangle channel into a smooth,
 * shortest path of straight segments. Pure geometry (no Pixi) so it's unit-testable.
 *
 * All coordinates are pixels (the engine resolves the fractional polygons first).
 */
export interface Point {
  x: number
  y: number
}

interface Mesh {
  verts: number[] // flat [x0, y0, x1, y1, ...]
  tris: [number, number, number][] // vertex indices, re-wound to a consistent order
  adj: { tri: number; a: number; b: number }[][] // per-tri neighbours + shared edge
}

export interface Navigation {
  /** Waypoints from (sx, sy) to (gx, gy), the last being the (clamped) goal. */
  findPath(sx: number, sy: number, gx: number, gy: number): Point[]
  /** Nearest point inside the mesh (for spawning / snapping a target). */
  clamp(x: number, y: number): Point
  contains(x: number, y: number): boolean
}

const vx = (m: Mesh, i: number) => m.verts[i * 2]
const vy = (m: Mesh, i: number) => m.verts[i * 2 + 1]
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** 2× signed area of triangle (a, b, c); sign encodes winding / side. */
const area2 = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
  (bx - ax) * (cy - ay) - (cx - ax) * (by - ay)

function centroid(m: Mesh, t: number): Point {
  const [i, j, k] = m.tris[t]
  return { x: (vx(m, i) + vx(m, j) + vx(m, k)) / 3, y: (vy(m, i) + vy(m, j) + vy(m, k)) / 3 }
}

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
    const a = flat[i]
    let b = flat[i + 1]
    let c = flat[i + 2]
    // Re-wind to a consistent order so portal left/right is consistent.
    if (
      area2(
        verts[a * 2],
        verts[a * 2 + 1],
        verts[b * 2],
        verts[b * 2 + 1],
        verts[c * 2],
        verts[c * 2 + 1],
      ) < 0
    ) {
      ;[b, c] = [c, b]
    }
    tris.push([a, b, c])
  }

  const adj: { tri: number; a: number; b: number }[][] = tris.map(() => [])
  const edgeMap = new Map<string, { tri: number; a: number; b: number }>()
  tris.forEach((t, ti) => {
    const edges: [number, number][] = [
      [t[0], t[1]],
      [t[1], t[2]],
      [t[2], t[0]],
    ]
    for (const [a, b] of edges) {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`
      const found = edgeMap.get(key)
      if (found) {
        adj[ti].push({ tri: found.tri, a, b })
        adj[found.tri].push({ tri: ti, a, b })
        edgeMap.delete(key)
      } else {
        edgeMap.set(key, { tri: ti, a, b })
      }
    }
  })

  return { verts, tris, adj }
}

/** A* over triangle adjacency → the triangle channel (or null). */
function findChannel(m: Mesh, startTri: number, goalTri: number): number[] | null {
  const goalC = centroid(m, goalTri)
  const open = [startTri]
  const came = new Map<number, number>()
  const g = new Map<number, number>([[startTri, 0]])
  const f = new Map<number, number>([[startTri, dist(centroid(m, startTri), goalC)]])
  const closed = new Set<number>()

  while (open.length) {
    open.sort((p, q) => (f.get(p) ?? Infinity) - (f.get(q) ?? Infinity))
    const cur = open.shift() as number
    if (cur === goalTri) {
      const path = [cur]
      let c = cur
      while (came.has(c)) {
        c = came.get(c) as number
        path.unshift(c)
      }
      return path
    }
    closed.add(cur)
    for (const n of m.adj[cur]) {
      if (closed.has(n.tri)) continue
      const tentative = (g.get(cur) ?? Infinity) + dist(centroid(m, cur), centroid(m, n.tri))
      if (tentative < (g.get(n.tri) ?? Infinity)) {
        came.set(n.tri, cur)
        g.set(n.tri, tentative)
        f.set(n.tri, tentative + dist(centroid(m, n.tri), goalC))
        if (!open.includes(n.tri)) open.push(n.tri)
      }
    }
  }
  return null
}

/** Build the funnel portals (left, right) for a triangle channel. */
function buildPortals(m: Mesh, channel: number[], start: Point, goal: Point): [Point, Point][] {
  const portals: [Point, Point][] = [[start, start]]
  for (let i = 0; i + 1 < channel.length; i += 1) {
    const curr = channel[i]
    const next = channel[i + 1]
    const shared = m.adj[curr].find((e) => e.tri === next)
    if (!shared) continue
    // Orient left / right by the travel direction (curr centroid → next centroid),
    // so the funnel is correct whichever way the channel runs.
    const cl = centroid(m, curr)
    const nl = centroid(m, next)
    const aIsLeft = area2(cl.x, cl.y, nl.x, nl.y, vx(m, shared.a), vy(m, shared.a)) < 0
    const left = aIsLeft ? shared.a : shared.b
    const right = aIsLeft ? shared.b : shared.a
    portals.push([
      { x: vx(m, left), y: vy(m, left) },
      { x: vx(m, right), y: vy(m, right) },
    ])
  }
  portals.push([goal, goal])
  return portals
}

const eq = (a: Point, b: Point) => a.x === b.x && a.y === b.y
const tri2 = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)

/** Simple Stupid Funnel — string-pull a smooth path through the portals. */
function funnel(portals: [Point, Point][]): Point[] {
  const pts: Point[] = [portals[0][0]]
  let apex = portals[0][0]
  let left = portals[0][0]
  let right = portals[0][1]
  // eslint-disable-next-line no-useless-assignment -- apex index; the SSFA resets it before each read
  let apexI = 0
  let leftI = 0
  let rightI = 0

  for (let i = 1; i < portals.length; i += 1) {
    const pLeft = portals[i][0]
    const pRight = portals[i][1]

    if (tri2(apex, right, pRight) <= 0) {
      if (eq(apex, right) || tri2(apex, left, pRight) > 0) {
        right = pRight
        rightI = i
      } else {
        pts.push(left)
        apex = left
        apexI = leftI
        left = apex
        right = apex
        leftI = apexI
        rightI = apexI
        i = apexI
        continue
      }
    }

    if (tri2(apex, left, pLeft) >= 0) {
      if (eq(apex, left) || tri2(apex, right, pLeft) < 0) {
        left = pLeft
        leftI = i
      } else {
        pts.push(right)
        apex = right
        apexI = rightI
        left = apex
        right = apex
        leftI = apexI
        rightI = apexI
        i = apexI
        continue
      }
    }
  }

  const last = portals[portals.length - 1][0]
  if (!eq(pts[pts.length - 1], last)) pts.push(last)
  return pts
}

function findPath(m: Mesh, sx: number, sy: number, gx: number, gy: number): Point[] {
  const start = clampToMesh(m, sx, sy)
  const goal = clampToMesh(m, gx, gy)
  const st = triangleAt(m, start.x, start.y)
  const gt = triangleAt(m, goal.x, goal.y)
  if (st < 0 || gt < 0 || st === gt) return [goal]
  const channel = findChannel(m, st, gt)
  if (!channel) return [goal]
  const path = funnel(buildPortals(m, channel, start, goal))
  // Drop the start point (the character is already there); keep the waypoints + goal.
  const waypoints = path.slice(1)
  return waypoints.length ? waypoints : [goal]
}

/** Build a `Navigation` from the walkable polygon + obstacle holes (all in px). */
export function buildNavigation(walkable: number[], holes: number[][] = []): Navigation {
  const mesh = buildMesh(walkable, holes)
  return {
    findPath: (sx, sy, gx, gy) => findPath(mesh, sx, sy, gx, gy),
    clamp: (x, y) => clampToMesh(mesh, x, y),
    contains: (x, y) => triangleAt(mesh, x, y) >= 0,
  }
}
