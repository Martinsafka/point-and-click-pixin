import type { ViewDescriptor } from '../data/schema'

/**
 * A procedural placeholder character atlas, drawn in code to a canvas and baked to
 * a PNG data-URL — so the AnimatedSprite + animation system is testable before any
 * real art (geometric placeholders are a valid shippable style; see
 * agent_docs/asset_pipeline.md). The editor will upload real atlases against the
 * same `ViewDescriptor` shape + the same load path.
 *
 * 6 frames in a row: 0–1 idle (subtle bob), 2–5 a walk cycle (legs/arms swing). A
 * nose marker points east so the facing mirror (M5.1) is visible.
 */
const FW = 64
const FH = 96
const COLS = 6

function drawFrame(ctx: CanvasRenderingContext2D, cellX: number, swing: number, bob: number): void {
  const cx = cellX + FW / 2
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

  // head
  ctx.fillStyle = '#caa279'
  ctx.strokeStyle = '#8a6a48'
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, 18 + bob, 11, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  // nose marker — points east; mirrors with facing
  ctx.fillStyle = '#8a6a48'
  ctx.beginPath()
  ctx.moveTo(cx + 10, 14 + bob)
  ctx.lineTo(cx + 17, 18 + bob)
  ctx.lineTo(cx + 10, 22 + bob)
  ctx.closePath()
  ctx.fill()
}

function makeAtlas(): string {
  const canvas = document.createElement('canvas')
  canvas.width = FW * COLS
  canvas.height = FH
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d canvas context unavailable')
  const frames: [number, number][] = [
    [0, 0],
    [0, -1],
    [1, -1],
    [0, 0],
    [-1, -1],
    [0, 0],
  ]
  frames.forEach(([swing, bob], i) => drawFrame(ctx, i * FW, swing, bob))
  return canvas.toDataURL('image/png')
}

export const placeholderView: ViewDescriptor = {
  atlas: makeAtlas(),
  frameWidth: FW,
  frameHeight: FH,
  columns: COLS,
  anchorX: 0.5,
  anchorY: 1,
  clips: {
    idle: { frames: [0, 1], fps: 2, loop: true },
    walk: { frames: [2, 3, 4, 5], fps: 8, loop: true },
  },
}
