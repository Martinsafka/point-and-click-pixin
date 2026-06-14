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
  private speed = WALK_SPEED
  /** Accumulated ticker time (ms) — the clock timed holds (`pauseFor`) measure against. */
  private clock = 0
  /** Indefinite hold (`pause()` / `resume()`) — e.g. while talking to this NPC. */
  private manualHold = false
  /** Timed hold (`pauseFor`): the `clock` value it lapses at; `≤ clock` = expired. */
  private holdUntil = 0
  /** A one-shot gesture (`playOnce`) is freezing the walk until it completes. */
  private oneShotHold = false
  /** Action clip looped while a timed hold lingers (a `wait`'s optional anim). */
  private loopAnim?: string

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

  /** The character's current facing — for an NPC's vision cone. */
  getFacing(): Facing {
    return this.facing
  }

  /** True while actively walking (not idle / held / arrived) — for `rest`-edge triggers. */
  isMoving(): boolean {
    return this.state === 'walk'
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
    this.clearHolds()
    this.state = 'idle'
    this.syncView()
  }

  /** Drop every pause (manual / timed / one-shot) and its loop anim. */
  private clearHolds(): void {
    this.manualHold = false
    this.holdUntil = 0
    this.oneShotHold = false
    this.loopAnim = undefined
  }

  /** True while any hold freezes the walk (manual, timed, or a one-shot gesture). */
  private held(): boolean {
    return this.manualHold || this.oneShotHold || this.holdUntil > this.clock
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
    this.clearHolds() // a new explicit destination cancels any pause / gesture
  }

  /** Advance one frame. `deltaMS` is real elapsed milliseconds from the ticker. */
  update(deltaMS: number): void {
    this.clock += deltaMS
    // A timed hold (a `wait`) lapses once the clock passes it — drop its loop anim so
    // the resume reverts to the idle / walk pose.
    if (this.holdUntil && this.holdUntil <= this.clock) {
      this.holdUntil = 0
      this.loopAnim = undefined
    }
    // Frozen by a gesture, a wait, or dialogue: keep depth scale + Y-sort + position
    // live, but leave the pose exactly as the hold set it (don't restart a loop clip).
    if (this.held()) {
      this.positionView()
      return
    }
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

  /** Scale the walk speed (1 = default); used by NPC patrol paths. */
  setSpeedScale(scale: number): void {
    this.speed = WALK_SPEED * scale
  }

  /** Play a one-shot animation (a gesture). Freezes the walk (a one-shot is cancelled
   *  by the walk pose), plays it, and resumes on completion — unless a `wait` still
   *  holds the character, in which case its pose (loop anim / idle) is restored. */
  playOnce(action: string): void {
    this.oneShotHold = true
    this.state = 'idle'
    this.positionView() // show idle position so the walk pose doesn't override the gesture
    this.view.playOnce(action, this.facing, () => {
      this.oneShotHold = false
      if (this.holdUntil > this.clock) {
        // A wait still lingers — restore its pose; otherwise the next update reverts.
        if (this.loopAnim) this.view.loopAction(this.loopAnim, this.facing)
        else this.view.setPose('idle', this.facing)
      }
    })
  }

  /** Freeze in place (idle), preserving the walk path so `resume()` continues it.
   *  Used while the player talks to this NPC. */
  pause(): void {
    if (this.manualHold) return
    this.manualHold = true
    this.state = 'idle'
    this.positionView()
    if (!this.oneShotHold && !this.loopAnim) this.view.setPose('idle', this.facing)
  }

  /** Release a `pause()`; the character continues its existing path. */
  resume(): void {
    this.manualHold = false
  }

  /** Linger in place for `ms`, optionally looping `anim` meanwhile, then resume the
   *  walk. "Longest wins" — stacking waits / a concurrent gesture extend, never
   *  shorten, the hold. Used by the `wait` effect (never on the player). */
  pauseFor(ms: number, anim?: string): void {
    const until = this.clock + Math.max(0, ms)
    if (until > this.holdUntil) this.holdUntil = until
    this.state = 'idle'
    this.positionView()
    if (anim) {
      this.loopAnim = anim
      if (!this.oneShotHold) this.view.loopAction(anim, this.facing) // a gesture restores it on complete
    } else {
      this.loopAnim = undefined
      if (!this.oneShotHold) this.view.setPose('idle', this.facing)
    }
  }

  /** Turn to face a world point (e.g. the player) without moving. */
  faceToward(x: number, y: number): void {
    const dx = x - this.x
    const dy = y - this.y
    if (dx === 0 && dy === 0) return
    this.facing = facingFromVector(dx, dy)
    this.positionView()
    // Reflect the new facing on whatever pose is currently showing.
    if (this.loopAnim && this.holdUntil > this.clock)
      this.view.loopAction(this.loopAnim, this.facing)
    else if (!this.oneShotHold) this.view.setPose(this.state, this.facing)
  }

  destroy(): void {
    this.view.destroy()
  }

  /** Position the container (feet, depth scale, Y-sort) without touching the pose. */
  private positionView(): void {
    const { container } = this.view
    container.position.set(this.x, this.y)
    container.scale.set(depthScaleAt(this.y, this.depthScale) * this.charScale)
    container.zIndex = this.y
  }

  private syncView(): void {
    this.positionView()
    this.view.setPose(this.state, this.facing)
  }
}
