import type { CharacterView } from './character-view'
import { facingFromVector, WALK_SPEED, type Facing, type MoveState } from '../systems/movement'
import { depthScaleAt, type DepthScale } from '../systems/depth'
import { clampToArea, type WalkArea } from '../systems/walkable'

/**
 * One logical entity = mutable per-frame state + a swappable view. Every
 * fast-changing field below is a plain mutable number updated in the ticker —
 * never routed through Zustand (agent_docs/architecture.md, "State").
 *
 * Positioned by its **feet** (x, y): the view sits on it, depth scale + Y-sort
 * come from its Y, and movement is clamped to an optional walkable area. An
 * optional `onArrive` callback fires once the character reaches a target — used
 * to trigger an interaction after walking to it.
 */
export class Character {
  private x = 0
  private y = 0
  private targetX: number | null = null
  private targetY: number | null = null
  private onArrive?: () => void
  private facing: Facing = 'S'
  private state: MoveState = 'idle'
  private readonly speed = WALK_SPEED

  constructor(
    private readonly view: CharacterView,
    private readonly depthScale: DepthScale,
    private readonly walkable?: WalkArea,
  ) {
    this.syncView()
  }

  /** The Pixi container to drop into a scene layer. */
  get displayObject(): CharacterView['container'] {
    return this.view.container
  }

  /** Place the character instantly (e.g. on scene entry), cancelling any walk. */
  setPosition(x: number, y: number): void {
    this.moveTo(x, y)
    this.targetX = null
    this.targetY = null
    this.onArrive = undefined
    this.state = 'idle'
    this.syncView()
  }

  /**
   * Walk toward a feet target (clamped onto the walkable area). `onArrive` fires
   * once, after the character reaches it — replacing any previous pending one.
   */
  setTarget(x: number, y: number, onArrive?: () => void): void {
    const t = this.walkable ? clampToArea(this.walkable, x, y) : { x, y }
    this.targetX = t.x
    this.targetY = t.y
    this.onArrive = onArrive
  }

  /** Advance one frame. `deltaMS` is real elapsed milliseconds from the ticker. */
  update(deltaMS: number): void {
    let arrived: (() => void) | undefined

    if (this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y
      const dist = Math.hypot(dx, dy)
      const step = (this.speed * deltaMS) / 1000

      if (dist <= step || dist < 0.5) {
        this.moveTo(this.targetX, this.targetY)
        this.targetX = null
        this.targetY = null
        this.state = 'idle'
        arrived = this.onArrive
        this.onArrive = undefined
      } else {
        this.facing = facingFromVector(dx, dy)
        this.state = 'walk'
        this.moveTo(this.x + (dx / dist) * step, this.y + (dy / dist) * step)
      }
    }

    this.syncView()
    // Fire after syncView so this frame is consistent; the callback may trigger a
    // scene swap, which the host defers past the current tick.
    arrived?.()
  }

  destroy(): void {
    this.view.destroy()
  }

  /** Move to a point, clamped to the walkable area if one is set. */
  private moveTo(x: number, y: number): void {
    if (this.walkable) {
      const c = clampToArea(this.walkable, x, y)
      this.x = c.x
      this.y = c.y
    } else {
      this.x = x
      this.y = y
    }
  }

  private syncView(): void {
    const { container } = this.view
    container.position.set(this.x, this.y)
    container.scale.set(depthScaleAt(this.y, this.depthScale))
    container.zIndex = this.y
    this.view.setPose(this.state, this.facing)
  }
}
