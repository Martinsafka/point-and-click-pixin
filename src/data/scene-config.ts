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
