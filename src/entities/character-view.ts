import { Container, Graphics } from 'pixi.js'
import type { Facing, MoveState } from '../systems/movement'

/**
 * The character's view — the swappable layer. Logic positions `container`
 * (origin = the character's feet) and calls `setPose(state, facing)`; it never
 * reaches inside. Replacing this cube with an `AnimatedSprite` later is a data
 * change here, not a logic refactor (see agent_docs/architecture.md).
 */
export interface CharacterView {
  readonly container: Container
  setPose(state: MoveState, facing: Facing): void
  destroy(): void
}

const BODY_W = 56
const BODY_H = 96

// Idle vs walk tint for the facing marker — proves MoveState reaches the view.
const MARKER_IDLE = 0x55617a
const MARKER_WALK = 0xffd479

// Facing → marker angle (radians). Mirror of facingFromVector's screen-space
// convention: E = 0, S = +90°, N = -90°.
const FACING_ANGLE: Record<Facing, number> = {
  E: 0,
  SE: Math.PI / 4,
  S: Math.PI / 2,
  SW: (3 * Math.PI) / 4,
  W: Math.PI,
  NW: (-3 * Math.PI) / 4,
  N: -Math.PI / 2,
  NE: -Math.PI / 4,
}

/**
 * Placeholder geometric view: a body cube plus a "nose" marker that points in
 * the current facing. Geometric primitives are a legitimate shippable style
 * here, not a stub (see agent_docs/asset_pipeline.md).
 */
export function createCubeView(): CharacterView {
  const container = new Container()

  // Body: bottom edge at y = 0, so the container origin is the feet — the point
  // depth scaling and Y-sort will key off in the next step.
  const body = new Graphics()
    .roundRect(-BODY_W / 2, -BODY_H, BODY_W, BODY_H, 8)
    .fill('#3a4a63')
    .stroke({ width: 2, color: '#6b86b0', alignment: 0 })
  container.addChild(body)

  // Marker orbits the body centre. Drawn pointing +X (east); rotated per facing.
  const reach = BODY_W / 2 + 14
  const marker = new Graphics().poly([reach, 0, reach - 16, -7, reach - 16, 7]).fill(0xffffff)
  marker.position.set(0, -BODY_H / 2)
  container.addChild(marker)

  return {
    container,
    setPose(state, facing) {
      marker.rotation = FACING_ANGLE[facing]
      marker.tint = state === 'walk' ? MARKER_WALK : MARKER_IDLE
    },
    destroy() {
      container.destroy({ children: true })
    },
  }
}
