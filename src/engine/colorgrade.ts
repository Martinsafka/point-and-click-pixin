import { ColorMatrixFilter } from 'pixi.js'
import type { ColorGrade } from '../data/schema'

/** True when a grade actually changes anything (so we can skip the filter entirely). */
export function gradeActive(g: ColorGrade): boolean {
  return g.brightness !== 1 || g.contrast !== 1 || g.saturation !== 1 || g.hue !== 0
}

/**
 * Build a `ColorMatrixFilter` for a per-scene colour grade (M10 10d). The config is `1 = no
 * change` for brightness / contrast / saturation and degrees for hue; mapped to the filter's
 * native deltas (0 = no change) and chained (`multiply`).
 */
export function makeColorGradeFilter(g: ColorGrade): ColorMatrixFilter {
  const f = new ColorMatrixFilter()
  f.brightness(g.brightness, false) // resets the matrix, then we chain
  f.saturate(g.saturation - 1, true)
  f.contrast(g.contrast - 1, true)
  if (g.hue) f.hue(g.hue, true)
  return f
}
