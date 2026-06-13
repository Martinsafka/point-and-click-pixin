import { Graphics } from 'pixi.js'
import { registerLayerBuilder, type Size } from '../engine/scene'
import type { SceneData } from '../data/schema'

/**
 * A simple geometric city street, expressed as `SceneData`: stacked layers
 * (sky → land → buildings → road → props), a walkable ⊥ road, and a depth ramp.
 * The geometric parts are `builtin` layers — code painters registered below by
 * key — so the document stays serializable; each becomes an SVG `image` layer
 * later (agent_docs/asset_pipeline.md). Positions in the data are screen fractions.
 */

// Muted "Röki" palette — flat shapes. Sky is clear night blue (not near-black).
const SKY_TOP = '#141d33'
const SKY_MID = '#1d2a47'
const SKY_HORIZON = '#2a3c61'
const HILLS = '#101a2b'
const GROUND = '#171c27'
const ROAD = '#2b3242'
const ROAD_BRANCH = '#252b39'
const ROAD_EDGE = '#3a4456'
const HOUSE_A = '#0d1422'
const HOUSE_B = '#10182a'
const HOUSE_C = '#0b111d'
const ROOF = '#070b14'
const WINDOW_LIT = '#e0a23a'
const WINDOW_DARK = '#1a2336'
const LAMP_POST = '#0a0e16'
const LAMP_GLOW = '#e8b552'
const BUSH = '#05080d'
const KEY = '#e8b552'

const HORIZON_FRAC = 0.33

function buildSky({ width: W, height: H }: Size): Graphics {
  const horizon = H * HORIZON_FRAC
  return new Graphics()
    .rect(0, 0, W, horizon * 0.45)
    .fill(SKY_TOP)
    .rect(0, horizon * 0.45, W, horizon * 0.3)
    .fill(SKY_MID)
    .rect(0, horizon * 0.75, W, horizon * 0.25)
    .fill(SKY_HORIZON)
}

function buildLand({ width: W, height: H }: Size): Graphics {
  const horizon = H * HORIZON_FRAC
  const g = new Graphics()
  g.rect(0, horizon, W, H - horizon).fill(GROUND)
  g.moveTo(0, horizon)
    .lineTo(0, horizon - H * 0.05)
    .lineTo(W * 0.2, horizon - H * 0.1)
    .lineTo(W * 0.38, horizon - H * 0.04)
    .lineTo(W * 0.56, horizon - H * 0.09)
    .lineTo(W * 0.74, horizon - H * 0.03)
    .lineTo(W * 0.9, horizon - H * 0.075)
    .lineTo(W, horizon - H * 0.045)
    .lineTo(W, horizon)
    .closePath()
    .fill(HILLS)
  return g
}

function drawHouse(
  g: Graphics,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  body: string,
): void {
  const x = cx - w / 2
  const topY = baseY - h
  g.rect(x, topY, w, h).fill(body)
  g.moveTo(x - w * 0.06, topY)
    .lineTo(x + w * 0.5, topY - h * 0.3)
    .lineTo(x + w + w * 0.06, topY)
    .closePath()
    .fill(ROOF)
  const ww = w * 0.18
  const wh = h * 0.16
  const cols = [x + w * 0.24, x + w * 0.58]
  const rows = [topY + h * 0.24, topY + h * 0.54]
  let n = 0
  for (const wy of rows) {
    for (const wx of cols) {
      g.rect(wx, wy, ww, wh).fill(n % 3 === 0 ? WINDOW_LIT : WINDOW_DARK)
      n += 1
    }
  }
}

function buildBuildings({ width: W, height: H }: Size): Graphics {
  const g = new Graphics()
  const base = H * 0.62
  drawHouse(g, W * 0.08, base, W * 0.15, H * 0.24, HOUSE_A)
  drawHouse(g, W * 0.24, base, W * 0.13, H * 0.2, HOUSE_B)
  drawHouse(g, W * 0.37, base, W * 0.1, H * 0.16, HOUSE_C)
  drawHouse(g, W * 0.62, base, W * 0.11, H * 0.18, HOUSE_C)
  drawHouse(g, W * 0.75, base, W * 0.14, H * 0.23, HOUSE_B)
  drawHouse(g, W * 0.91, base, W * 0.13, H * 0.21, HOUSE_A)
  // Lit door on the central house — the exit to the room (warm light leaking).
  g.rect(W * 0.6, H * 0.52, W * 0.04, H * 0.1)
    .fill('#06090f')
    .stroke({ width: 2, color: WINDOW_LIT, alignment: 0 })
  return g
}

function buildRoad({ width: W, height: H }: Size): Graphics {
  const g = new Graphics()
  g.rect(0, H * 0.66, W, H - H * 0.66).fill(ROAD)
  g.moveTo(W * 0.4, H * 0.66)
    .lineTo(W * 0.6, H * 0.66)
    .lineTo(W * 0.535, H * 0.5)
    .lineTo(W * 0.465, H * 0.5)
    .closePath()
    .fill(ROAD_BRANCH)
  g.rect(0, H * 0.66, W, 2).fill(ROAD_EDGE)
  return g
}

function buildLamppost({ width: W, height: H }: Size, p: Record<string, number>): Graphics {
  const g = new Graphics()
  g.rect(-4, -130, 8, 130).fill(LAMP_POST)
  g.roundRect(-12, -144, 24, 16, 4).fill(LAMP_POST)
  g.circle(0, -136, 5).fill(LAMP_GLOW)
  g.position.set((p.xFrac ?? 0.5) * W, (p.yFrac ?? 0.8) * H)
  return g
}

function buildBush({ width: W, height: H }: Size, p: Record<string, number>): Graphics {
  const r = 46 * (p.scale ?? 1)
  const g = new Graphics()
  g.circle(-r * 0.9, 0, r * 0.8)
    .circle(0, -r * 0.35, r)
    .circle(r * 0.95, 0, r * 0.85)
    .circle(-r * 0.2, r * 0.25, r * 0.7)
    .circle(r * 0.45, r * 0.2, r * 0.75)
    .fill(BUSH)
  g.position.set((p.xFrac ?? 0.5) * W, (p.yFrac ?? 1) * H)
  return g
}

/** A small gold key lying on the ground — picked up, then it vanishes. */
function buildKey({ width: W, height: H }: Size, p: Record<string, number>): Graphics {
  const g = new Graphics()
  g.circle(0, -22, 9).stroke({ width: 4, color: KEY, alignment: 0.5 })
  g.rect(-2, -16, 4, 24).fill(KEY)
  g.rect(2, 2, 7, 3).fill(KEY)
  g.rect(2, 8, 5, 3).fill(KEY)
  g.position.set((p.xFrac ?? 0.25) * W, (p.yFrac ?? 0.8) * H)
  return g
}

registerLayerBuilder('street.sky', buildSky)
registerLayerBuilder('street.land', buildLand)
registerLayerBuilder('street.buildings', buildBuildings)
registerLayerBuilder('street.road', buildRoad)
registerLayerBuilder('street.lamppost', buildLamppost)
registerLayerBuilder('street.bush', buildBush)
registerLayerBuilder('street.key', buildKey)

export const streetScene: SceneData = {
  id: 'street',
  name: 'Street',
  depth: { yNearFrac: 0.94, yFarFrac: 0.5, scaleNear: 1, scaleFar: 0.4 },
  spawn: { xFrac: 0.42, yFrac: 0.86 },
  // ⊥ road: horizontal street + the receding branch (fractions, clockwise).
  walkable: [0, 0.95, 1, 0.95, 1, 0.67, 0.59, 0.67, 0.53, 0.52, 0.47, 0.52, 0.41, 0.67, 0, 0.67],
  interactables: [
    {
      kind: 'pickable',
      id: 'key',
      item: 'key',
      hitArea: [0.21, 0.74, 0.29, 0.74, 0.29, 0.86, 0.21, 0.86],
    },
    {
      kind: 'exit',
      id: 'to-room',
      to: 'room',
      hitArea: [0.6, 0.5, 0.64, 0.5, 0.64, 0.62, 0.6, 0.62],
      when: { kind: 'hasItem', item: 'key' },
    },
  ],
  layers: [
    { kind: 'builtin', band: 'background', builder: 'street.sky' },
    { kind: 'builtin', band: 'background', builder: 'street.land' },
    { kind: 'builtin', band: 'background', builder: 'street.buildings' },
    { kind: 'builtin', band: 'background', builder: 'street.road' },
    {
      kind: 'builtin',
      band: 'mid',
      builder: 'street.key',
      anchorYFrac: 0.8,
      params: { xFrac: 0.25, yFrac: 0.8 },
      when: { kind: 'not', of: { kind: 'flag', flag: 'picked:key' } },
    },
    {
      kind: 'builtin',
      band: 'mid',
      builder: 'street.lamppost',
      anchorYFrac: 0.58,
      params: { xFrac: 0.45, yFrac: 0.58 },
    },
    {
      kind: 'builtin',
      band: 'mid',
      builder: 'street.lamppost',
      anchorYFrac: 0.8,
      params: { xFrac: 0.82, yFrac: 0.8 },
    },
    {
      kind: 'builtin',
      band: 'foreground',
      builder: 'street.bush',
      params: { xFrac: 0.12, yFrac: 0.97, scale: 1.35 },
    },
    {
      kind: 'builtin',
      band: 'foreground',
      builder: 'street.bush',
      params: { xFrac: 0.34, yFrac: 1.0, scale: 1.05 },
    },
    {
      kind: 'builtin',
      band: 'foreground',
      builder: 'street.bush',
      params: { xFrac: 0.66, yFrac: 1.02, scale: 1.2 },
    },
    {
      kind: 'builtin',
      band: 'foreground',
      builder: 'street.bush',
      params: { xFrac: 0.88, yFrac: 0.98, scale: 1.5 },
    },
  ],
}
