// Depth (2.5D) system: a character's scale is a function of its feet Y — near the
// camera (low on screen) is bigger, far (high, toward the horizon) is smaller.
// Pure math; the per-scene reference values live in src/data, because the
// perspective differs per background (agent_docs/architecture.md, "Depth scaling").

export interface DepthScale {
  /** Feet Y nearest the camera — where the character is drawn biggest. */
  yNear: number
  /** Feet Y at the far edge / horizon — where it is drawn smallest. */
  yFar: number
  scaleNear: number
  scaleFar: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(Math.max(v, lo), hi)
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/** Scale factor for a character whose feet sit at `feetY`. */
export function depthScaleAt(feetY: number, ds: DepthScale): number {
  const t = clamp((feetY - ds.yFar) / (ds.yNear - ds.yFar), 0, 1)
  return lerp(ds.scaleFar, ds.scaleNear, t)
}
