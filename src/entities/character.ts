import type { CharacterView } from './character-view'
import { facingFromVector, WALK_SPEED, type Facing, type MoveState } from '../systems/movement'

/**
 * One logical entity = mutable per-frame state + a swappable view. Every
 * fast-changing field below is a plain mutable number updated in the ticker —
 * never routed through Zustand, which is for discrete/meta state only
 * (agent_docs/architecture.md, "State — two kinds, never mixed").
 *
 * The character is positioned by its **feet** (x, y): the view's origin is the
 * feet, and the click target is a feet target. That single logical point is
 * what depth scaling and Y-sort will consume next.
 */
export class Character {
  private x = 0
  private y = 0
  private targetX: number | null = null
  private targetY: number | null = null
  private facing: Facing = 'S'
  private state: MoveState = 'idle'
  private readonly speed = WALK_SPEED

  constructor(private readonly view: CharacterView) {
    this.syncView()
  }

  /** The Pixi container to drop into a scene layer. */
  get displayObject(): CharacterView['container'] {
    return this.view.container
  }

  /** Place the character instantly (e.g. on scene entry), cancelling any walk. */
  setPosition(x: number, y: number): void {
    this.x = x
    this.y = y
    this.targetX = null
    this.targetY = null
    this.state = 'idle'
    this.syncView()
  }

  /** Send the character walking toward a feet target, in view-local coords. */
  setTarget(x: number, y: number): void {
    this.targetX = x
    this.targetY = y
  }

  /** Advance one frame. `deltaMS` is real elapsed milliseconds from the ticker. */
  update(deltaMS: number): void {
    if (this.targetX !== null && this.targetY !== null) {
      const dx = this.targetX - this.x
      const dy = this.targetY - this.y
      const dist = Math.hypot(dx, dy)
      const step = (this.speed * deltaMS) / 1000

      if (dist <= step || dist < 0.5) {
        // Close enough — snap and stop.
        this.x = this.targetX
        this.y = this.targetY
        this.targetX = null
        this.targetY = null
        this.state = 'idle'
      } else {
        this.x += (dx / dist) * step
        this.y += (dy / dist) * step
        this.facing = facingFromVector(dx, dy)
        this.state = 'walk'
      }
    }

    this.syncView()
  }

  destroy(): void {
    this.view.destroy()
  }

  private syncView(): void {
    this.view.container.position.set(this.x, this.y)
    this.view.setPose(this.state, this.facing)
  }
}
