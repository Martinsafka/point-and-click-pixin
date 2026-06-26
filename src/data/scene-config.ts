import type { DepthConfig } from './schema'
import type { DepthScale } from '../systems/depth'

/** Resolve a scene's fractional depth config to concrete pixel values. */
export function resolveDepthScale(
  config: DepthConfig | undefined,
  screenHeight: number,
): DepthScale {
  // A scene may legitimately omit perspective (a flat scene, or a hand-written / imported document
  // that predates the field) — fall back to a flat scale instead of crashing on `config.stops`.
  if (!config) return { stops: [{ y: 0, scale: 1 }] }
  const raw =
    config.stops && config.stops.length >= 2
      ? config.stops
      : [
          { yFrac: config.yFarFrac, scale: config.scaleFar },
          { yFrac: config.yNearFrac, scale: config.scaleNear },
        ]
  const stops = raw
    .map((s) => ({ y: s.yFrac * screenHeight, scale: s.scale }))
    .sort((a, b) => a.y - b.y)
  return { stops }
}

/** Vertical design resolution (px) used when a document omits `referenceHeight`. */
export const DEFAULT_REFERENCE_HEIGHT = 1080
/** A single screen's aspect — the default scene width is one such screen. */
const DEFAULT_ASPECT = 16 / 9

/**
 * A scene's design-space size in px: its authored `width` × the document height.
 * All fractions resolve against this; the camera fits the height to the viewport.
 */
export function designSize(
  scene: { width?: number },
  referenceHeight: number = DEFAULT_REFERENCE_HEIGHT,
): { width: number; height: number } {
  return {
    width: scene.width ?? Math.round(referenceHeight * DEFAULT_ASPECT),
    height: referenceHeight,
  }
}
