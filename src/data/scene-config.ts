import type { DepthConfig } from './schema'
import type { DepthScale } from '../systems/depth'

/** Resolve a scene's fractional depth config to concrete pixel values. */
export function resolveDepthScale(config: DepthConfig, screenHeight: number): DepthScale {
  return {
    yNear: screenHeight * config.yNearFrac,
    yFar: screenHeight * config.yFarFrac,
    scaleNear: config.scaleNear,
    scaleFar: config.scaleFar,
  }
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
