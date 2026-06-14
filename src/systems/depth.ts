// Depth (2.5D) system: a character's scale is a function of its feet Y — near the
// camera (low on screen) is bigger, far (high, toward the horizon) is smaller.
// Pure math; the per-scene reference values live in src/data, because the
// perspective differs per background (agent_docs/architecture.md, "Depth scaling").

export interface DepthScale {
  /** Scale stops along feet Y (px), sorted ascending; linear between, clamped
   *  outside. A 2-stop list is the classic near/far ramp. */
  stops: { y: number; scale: number }[]
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Scale factor for a character whose feet sit at `feetY` (piecewise-linear). */
export function depthScaleAt(feetY: number, ds: DepthScale): number {
  const { stops } = ds
  if (feetY <= stops[0].y) return stops[0].scale
  const last = stops[stops.length - 1]
  if (feetY >= last.y) return last.scale
  for (let i = 1; i < stops.length; i += 1) {
    const b = stops[i]
    if (feetY <= b.y) {
      const a = stops[i - 1]
      return b.y > a.y ? lerp(a.scale, b.scale, (feetY - a.y) / (b.y - a.y)) : b.scale
    }
  }
  return last.scale
}
