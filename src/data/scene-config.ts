import type { DepthScale } from '../systems/depth'

/**
 * Per-scene perspective config, stored as fractions of screen height so it
 * survives different viewport sizes; resolved to pixels at scene-build time.
 * Perspective differs per background, so this is scene data, not hardcoded
 * (agent_docs/architecture.md, "Depth scaling"). Concrete values live with each
 * scene in src/scenes/.
 */
export interface SceneConfig {
  /** Feet Y (fraction of screen height) nearest the camera — biggest. */
  readonly yNearFrac: number
  /** Feet Y (fraction) at the far edge / horizon — smallest. */
  readonly yFarFrac: number
  readonly scaleNear: number
  readonly scaleFar: number
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
