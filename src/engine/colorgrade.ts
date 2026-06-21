import { Color, ColorMatrixFilter } from 'pixi.js'
import type { ColorGrade } from '../data/schema'

/** True when a grade actually changes anything (so we can skip the filter entirely). */
export function gradeActive(g: ColorGrade): boolean {
  return (
    g.brightness !== 1 ||
    g.contrast !== 1 ||
    g.saturation !== 1 ||
    g.hue !== 0 ||
    (g.tint !== undefined && (g.tintStrength ?? 0) > 0)
  )
}

/**
 * Build a `ColorMatrixFilter` for a per-scene colour grade (M10 10d). The config is `1 = no
 * change` for brightness / contrast / saturation and degrees for hue; mapped to the filter's
 * native deltas (0 = no change) and chained (`multiply`).
 */
/** Apply a colour grade to an existing filter (resets, then chains) — for live / time-driven updates. */
export function setColorGrade(f: ColorMatrixFilter, g: ColorGrade): void {
  f.brightness(g.brightness, false) // resets the matrix, then we chain
  f.saturate(g.saturation - 1, true)
  f.contrast(g.contrast - 1, true)
  if (g.hue) f.hue(g.hue, true)
  // Colour cast (M13d): multiply toward `tint`, scaled by `tintStrength` (0..1). The effective
  // colour is lerped from white (0 = no-op) to the full tint (1), so it adds a warm / blue cast a
  // hue rotation can't paint onto near-grey pixels (e.g. a blue night over a stone statue).
  const strength = g.tint ? Math.max(0, Math.min(1, g.tintStrength ?? 0)) : 0
  if (strength > 0) {
    const [r, gr, b] = Color.shared.setValue(g.tint as string).toArray()
    f.tint([1 - strength * (1 - r), 1 - strength * (1 - gr), 1 - strength * (1 - b)], true)
  }
}

export function makeColorGradeFilter(g: ColorGrade): ColorMatrixFilter {
  const f = new ColorMatrixFilter()
  setColorGrade(f, g)
  return f
}
