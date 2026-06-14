import type { CharacterView } from './character-view'
import { facingFromVector, WALK_SPEED, type Facing, type MoveState } from '../systems/movement'
import { depthScaleAt, type DepthScale } from '../systems/depth'
import type { Navigation, Point } from '../systems/navmesh'

/**
 * One logical entity = mutable per-frame state + a swappable view. Every
 * fast-changing field below is a plain mutable number updated in the ticker —
 * never routed through Zustand (agent_docs/architecture.md, "State").
 *
 * Positioned by its **feet** (x, y): the view sits on it, depth scale + Y-sort
 * come from its Y. It walks a **nav-mesh path** (waypoints) to a target — routing
 * around concave walls + obstacle holes instead of a straight line — and an
 * optional `onArrive` fires once it reaches the final waypoint (used to trigger an
 * interaction after walking to it).
 */
export class Character {
  private x = 0
  private y = 0
  private path: Point[] = []
  private pathIndex = 0
  private onArrive?: () => void
  private action?: string
  private facing: Facing = 'S'
  private state: MoveState = 'idle'
  private readonly speed = WALK_SPEED

  constructor(
    private readonly view: CharacterView,
    private readonly depthScale: DepthScale,
    private readonly nav?: Navigation,
    /** Per-scene size multiplier on top of the depth scale (default 1). */
    private readonly charScale = 1,
  ) {
    this.syncView()
  }

  /** The Pixi container to drop into a scene layer. */
  get displayObject(): CharacterView['container'] {
    return this.view.container
  }

  /** Place the character instantly (clamped onto the walkable), cancelling any walk. */
  setPosition(x: number, y: number): void {
    const p = this.nav ? this.nav.clamp(x, y) : { x, y }
    this.x = p.x
    this.y = p.y
    this.path = []
    this.pathIndex = 0
    this.onArrive = undefined
    this.action = undefined
    this.state = 'idle'
    this.syncView()
  }

  /**
   * Walk to a feet target along a nav-mesh path. `onArrive` fires once (after an
   * optional one-shot `action`), replacing any pending one. With no nav, walks
   * straight to the point.
   */
  setTarget(x: number, y: number, onArrive?: () => void, action?: string): void {
    this.path = this.nav ? this.nav.findPath(this.x, this.y, x, y) : [{ x, y }]
    if (this.path.length === 0) this.path = [{ x, y }]
    this.pathIndex = 0
    this.onArrive = onArrive
    this.action = action
  }

  /** Advance one frame. `deltaMS` is real elapsed milliseconds from the ticker. */
  update(deltaMS: number): void {
    let arrived: (() => void) | undefined
    let action: string | undefined

    if (this.pathIndex < this.path.length) {
      let step = (this.speed * deltaMS) / 1000
      // Consume waypoints — several can be crossed in one frame on short segments.
      while (this.pathIndex < this.path.length && step > 0) {
        const wp = this.path[this.pathIndex]
        const dx = wp.x - this.x
        const dy = wp.y - this.y
        const d = Math.hypot(dx, dy)
        if (d <= step || d < 0.5) {
          this.x = wp.x
          this.y = wp.y
          step -= d
          this.pathIndex += 1
        } else {
          this.facing = facingFromVector(dx, dy)
          this.state = 'walk'
          this.x += (dx / d) * step
          this.y += (dy / d) * step
          step = 0
        }
      }
      if (this.pathIndex >= this.path.length) {
        this.path = []
        this.pathIndex = 0
        this.state = 'idle'
        arrived = this.onArrive
        this.onArrive = undefined
        action = this.action
        this.action = undefined
      }
    }

    this.syncView()
    // After syncView so this frame is consistent. On arrival an optional one-shot
    // plays first and the callback fires on its completion; otherwise it fires now.
    // The callback may trigger a scene swap (the host defers that past the tick).
    if (action) this.view.playOnce(action, this.facing, () => arrived?.())
    else arrived?.()
  }

  destroy(): void {
    this.view.destroy()
  }

  private syncView(): void {
    const { container } = this.view
    container.position.set(this.x, this.y)
    container.scale.set(depthScaleAt(this.y, this.depthScale) * this.charScale)
    container.zIndex = this.y
    this.view.setPose(this.state, this.facing)
  }
}
