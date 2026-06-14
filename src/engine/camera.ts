/**
 * The active scene's camera transform. The world Container is scaled by `scale`
 * (viewport height ÷ design height) and translated by `(x, y)`, so a design-space
 * point `p` lands on screen at `p * scale + (x, y)`. The DOM cursor
 * (ui/GameCursor) inverts it: design point = (viewport point − (x, y)) / scale.
 */
export const cameraOffset = { x: 0, y: 0, scale: 1 }
