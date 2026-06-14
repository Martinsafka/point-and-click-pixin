// Movement system: how a character steps toward a target and which way it faces.
// Pure functions + types — no Pixi, no per-frame state of its own. The entity
// (src/entities/character.ts) owns the mutable state and calls into here.

/** The 8 compass facings. A view concern (logic stays idle/walk + this). */
export type Facing = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW'

/** Logical movement state. Richer states (interact, hidden) come later. */
export type MoveState = 'idle' | 'walk'

/** Default walk speed, pixels per second in screen space. */
export const WALK_SPEED = 220

// Screen space is y-down, so atan2(dy, dx) gives: E = 0, S = +90°, W = ±180°,
// N = -90°. Indexed by the nearest 45° sector (see facingFromVector).
const FACINGS: readonly Facing[] = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE']

/**
 * Bucket a movement vector into one of 8 facings. `Math.round` snaps the angle
 * to the nearest sector, so each facing owns a 45° wedge centred on its
 * cardinal/ordinal direction.
 */
export function facingFromVector(dx: number, dy: number): Facing {
  const sector = Math.round(Math.atan2(dy, dx) / (Math.PI / 4))
  const index = ((sector % 8) + 8) % 8 // wrap -4..4 into 0..7
  return FACINGS[index]
}

/** The representative screen-space angle (radians) of a facing — the inverse of
 *  `facingFromVector`. Points a vision cone along the NPC's facing. */
export function facingToAngle(facing: Facing): number {
  return FACINGS.indexOf(facing) * (Math.PI / 4)
}
