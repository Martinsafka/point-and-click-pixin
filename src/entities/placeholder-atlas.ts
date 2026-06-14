import type { AnimClip, ViewDescriptor } from '../data/schema'

/**
 * A procedural placeholder character atlas, drawn in code → a PNG data-URL, so the
 * AnimatedSprite + animation system is testable before real art (see
 * agent_docs/asset_pipeline.md). The editor will upload real atlases against the
 * same `ViewDescriptor` shape + load path.
 *
 * Grid: 6 columns (0–1 idle, 2–5 a walk cycle) × 5 rows = the 5 base directions
 * S / SE / E / NE / N. The west-side directions (W / SW / NW) are the runtime
 * horizontal mirror of E / SE / NE, so this covers all 8 facings. A nose marker on
 * the head points in the facing direction (N = the back of the head, no nose).
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

function drawBody(ctx: CanvasRenderingContext2D, cx: number, swing: number, bob: number): void {
  const feet = 92 + bob
  const hip = 58 + bob
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

  // arms
  ctx.strokeStyle = '#324158'
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(cx - 11, 34 + bob)
  ctx.lineTo(cx - 14 - swing * 6, 56 + bob)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + 11, 34 + bob)
  ctx.lineTo(cx + 14 + swing * 6, 56 + bob)
  ctx.stroke()

  // torso
  ctx.fillStyle = '#3a4a63'
  ctx.strokeStyle = '#6b86b0'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.roundRect(cx - 13, 28 + bob, 26, 34, 7)
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

const FRAMES: [number, number][] = [
  [0, 0],
  [0, -1],
  [1, -1],
  [0, 0],
  [-1, -1],
  [0, 0],
]

function makeAtlas(): string {
  const canvas = document.createElement('canvas')
  canvas.width = FW * COLS
  canvas.height = FH * DIRS.length
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas context unavailable')
  DIRS.forEach((dir, row) => {
    FRAMES.forEach(([swing, bob], col) => {
      ctx.save()
      ctx.translate(0, row * FH)
      const cx = col * FW + FW / 2
      drawBody(ctx, cx, swing, bob)
      drawHead(ctx, cx, 18 + bob, dir)
      ctx.restore()
    })
  })
  return canvas.toDataURL('image/png')
}

const clips: Record<string, AnimClip> = {}
DIRS.forEach((dir, row) => {
  const base = row * COLS
  clips[`idle.${dir}`] = { frames: [base, base + 1], fps: 2, loop: true }
  clips[`walk.${dir}`] = { frames: [base + 2, base + 3, base + 4, base + 5], fps: 8, loop: true }
})

export const placeholderView: ViewDescriptor = {
  atlas: makeAtlas(),
  frameWidth: FW,
  frameHeight: FH,
  columns: COLS,
  anchorX: 0.5,
  anchorY: 1,
  clips,
}
