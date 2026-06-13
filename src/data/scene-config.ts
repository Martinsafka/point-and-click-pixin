import type { DepthScale } from '../systems/depth'

/**
 * Per-scene perspective config. Stored as fractions of screen height so it
 * survives different viewport sizes; resolved to pixels at scene-build time.
 * Perspective differs per background, so this is scene data, not hardcoded
 * (agent_docs/architecture.md, "Depth scaling").
 */
export interface SceneConfig {
  /** Feet Y (fraction of screen height) nearest the camera — biggest. */
  readonly yNearFrac: number
  /** Feet Y (fraction) at the far edge / horizon — smallest. */
  readonly yFarFrac: number
  readonly scaleNear: number
  readonly scaleFar: number
}

/** The single placeholder scene used by the prototype. */
export const demoScene: SceneConfig = {
  yNearFrac: 0.96,
  yFarFrac: 0.5,
  scaleNear: 1,
  scaleFar: 0.45,
}

/** Resolve a scene's fractional depth config to concrete pixel values. */
export function resolveDepthScale(scene: SceneConfig, screenHeight: number): DepthScale {
  return {
    yNear: screenHeight * scene.yNearFrac,
    yFar: screenHeight * scene.yFarFrac,
    scaleNear: scene.scaleNear,
    scaleFar: scene.scaleFar,
  }
}
