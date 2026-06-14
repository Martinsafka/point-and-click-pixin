import type { AnimClip, ViewDescriptor } from '../data/schema'

/**
 * A procedural placeholder character atlas, drawn in code → a PNG data-URL, so the
 * AnimatedSprite + animation system is testable before real art (see
 * agent_docs/asset_pipeline.md). The editor will upload real atlases against the
 * same `ViewDescriptor` shape + load path.
 *
 * Grid (6 columns): rows 0–4 are the 5 base directions S / SE / E / NE / N (cols
 * 0–1 idle, 2–5 a walk cycle); the W-side facings are the runtime mirror. Rows 5–6
 * are the one-shots `pickup` (a crouch) and `interact` (a forward reach), 4 frames
 * each. A nose marker on the head shows the facing (N = the back of the head).
 */
const FW = 64
const FH = 96
const COLS = 6
const DIRS = ['S', 'SE', 'E', 'NE', 'N'] as const

function noseAngle(dir: string): number | null {
  switch (dir) {
    case 'S':
      return Math.PI / 2 // down, toward the viewer
    case 'SE':
      return Math.PI / 4
    case 'E':
      return 0 // right (profile)
    case 'NE':
      return -Math.PI / 4
    default:
      return null // N — back of the head
  }
}

function drawBody(
  ctx: CanvasRenderingContext2D,
  cx: number,
  swing: number,
  bob: number,
  crouch: number,
  reach: number,
): void {
  const feet = 92 + bob
  const upper = bob + crouch // crouch lowers the upper body, feet stay planted
  const hip = 58 + upper
  ctx.lineCap = 'round'

  // legs (swing opposite each other)
  ctx.strokeStyle = '#26344a'
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(cx, hip)
  ctx.lineTo(cx - 3 + swing * 9, feet)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx, hip)
  ctx.lineTo(cx + 3 - swing * 9, feet)
  ctx.stroke()

  // arms — the right one reaches forward (east) when `reach` > 0
  ctx.strokeStyle = '#324158'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(cx - 11, 34 + upper)
  ctx.lineTo(cx - 14 - swing * 6, 56 + upper)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + 11, 34 + upper)
  ctx.lineTo(cx + 14 + swing * 6 + reach * 16, 56 + upper - reach * 20)
  ctx.stroke()

  // torso
  ctx.fillStyle = '#3a4a63'
  ctx.strokeStyle = '#6b86b0'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(cx - 13, 28 + upper, 26, 34, 7)
  ctx.fill()
  ctx.stroke()
}

function drawHead(ctx: CanvasRenderingContext2D, cx: number, hy: number, dir: string): void {
  ctx.fillStyle = dir === 'N' ? '#2f3c52' : '#caa279' // back of head vs face
  ctx.strokeStyle = '#8a6a48'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, hy, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  const ang = noseAngle(dir)
  if (ang === null) return
  const ex = cx + Math.cos(ang) * 9
  const ey = hy + Math.sin(ang) * 9
  const tx = cx + Math.cos(ang) * 18
  const ty = hy + Math.sin(ang) * 18
  const p = ang + Math.PI / 2
  ctx.fillStyle = '#8a6a48'
  ctx.beginPath()
  ctx.moveTo(tx, ty)
  ctx.lineTo(ex + Math.cos(p) * 4, ey + Math.sin(p) * 4)
  ctx.lineTo(ex - Math.cos(p) * 4, ey - Math.sin(p) * 4)
  ctx.closePath()
  ctx.fill()
}

function drawCell(
  ctx: CanvasRenderingContext2D,
  col: number,
  row: number,
  dir: string,
  swing: number,
  bob: number,
  crouch: number,
  reach: number,
): void {
  ctx.save()
  ctx.translate(0, row * FH)
  const cx = col * FW + FW / 2
  drawBody(ctx, cx, swing, bob, crouch, reach)
  drawHead(ctx, cx, 18 + bob + crouch, dir)
  ctx.restore()
}

// [swing, bob] per walk-cycle column (0–1 idle, 2–5 walk).
const WALK: [number, number][] = [
  [0, 0],
  [0, -1],
  [1, -1],
  [0, 0],
  [-1, -1],
  [0, 0],
]
const PICKUP_CROUCH = [0, 8, 14, 8] // a crouch one-shot
const INTERACT_REACH = [0, 1, 1, 0.4] // a forward reach one-shot

const PICKUP_ROW = DIRS.length
const INTERACT_ROW = DIRS.length + 1

function makeAtlas(): string {
  const canvas = document.createElement('canvas')
  canvas.width = FW * COLS
  canvas.height = FH * (DIRS.length + 2)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas context unavailable')
  DIRS.forEach((dir, row) => {
    WALK.forEach(([swing, bob], col) => drawCell(ctx, col, row, dir, swing, bob, 0, 0))
  })
  PICKUP_CROUCH.forEach((crouch, col) => drawCell(ctx, col, PICKUP_ROW, 'S', 0, 0, crouch, 0))
  INTERACT_REACH.forEach((reach, col) => drawCell(ctx, col, INTERACT_ROW, 'S', 0, 0, 0, reach))
  return canvas.toDataURL('image/png')
}

const clips: Record<string, AnimClip> = {}
DIRS.forEach((dir, row) => {
  const base = row * COLS
  clips[`idle.${dir}`] = { frames: [base, base + 1], fps: 2, loop: true }
  clips[`walk.${dir}`] = { frames: [base + 2, base + 3, base + 4, base + 5], fps: 8, loop: true }
})
const pickupBase = PICKUP_ROW * COLS
clips.pickup = {
  frames: [pickupBase, pickupBase + 1, pickupBase + 2, pickupBase + 3],
  fps: 8,
  loop: false,
}
// A held crouch posture (the deepest pickup frame), for the `setStance` effect.
clips.crouch = { frames: [pickupBase + 2], fps: 1, loop: true }
const interactBase = INTERACT_ROW * COLS
clips.interact = {
  frames: [interactBase, interactBase + 1, interactBase + 2, interactBase + 3],
  fps: 8,
  loop: false,
}

export const placeholderView: ViewDescriptor = {
  atlas: makeAtlas(),
  frameWidth: FW,
  frameHeight: FH,
  columns: COLS,
  anchorX: 0.5,
  anchorY: 1,
  clips,
}
