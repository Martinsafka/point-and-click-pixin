import { Graphics } from 'pixi.js'
import type { SceneConfig } from '../data/scene-config'
import type { SceneFactory, SceneLayer } from '../engine/scene'
import type { WalkArea } from '../systems/walkable'

/**
 * A simple geometric city street, composed as stacked layers (sky → land →
 * buildings → road → props). Each background layer is a separate part so it can
 * later become an SVG — the parts just keep stacking (agent_docs/asset_pipeline.md).
 *
 *   sky                 → night-sky bands, horizon in the top third
 *   land                → distant hills + ground plate
 *   buildings           → house row, flanking a central gap
 *   road                → lower-third street + an L branch receding to the gap
 *   lampposts (mid)     → Y-sorted + depth-scaled with the character
 *   bushes (foreground) → occluders framing the near edge
 *
 * The character is clamped to `walkable` (the road ⊥), and walking up the
 * receding branch toward the houses shrinks it with depth.
 */

// Muted "Röki" palette — flat shapes, silhouette + atmosphere. Sky is a clear
// night blue (not near-black) so the top reads as sky, not empty space.
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

// Horizon sits in the top third so the sky fills the upper area, not a dead band.
const HORIZON_FRAC = 0.33

/** Walkable floor runs from the near bottom up to the receding branch. */
const streetDepth: SceneConfig = {
  yNearFrac: 0.94,
  yFarFrac: 0.5,
  scaleNear: 1,
  scaleFar: 0.4,
}

function buildSky(W: number, H: number): Graphics {
  const horizon = H * HORIZON_FRAC
  return new Graphics()
    .rect(0, 0, W, horizon * 0.45)
    .fill(SKY_TOP)
    .rect(0, horizon * 0.45, W, horizon * 0.3)
    .fill(SKY_MID)
    .rect(0, horizon * 0.75, W, horizon * 0.25)
    .fill(SKY_HORIZON)
}

function buildLand(W: number, H: number): Graphics {
  const horizon = H * HORIZON_FRAC
  const g = new Graphics()
  g.rect(0, horizon, W, H - horizon).fill(GROUND)
  // Distant hills sitting on the horizon, rising into the sky.
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

  // Simple gable roof with a slight overhang.
  g.moveTo(x - w * 0.06, topY)
    .lineTo(x + w * 0.5, topY - h * 0.3)
    .lineTo(x + w + w * 0.06, topY)
    .closePath()
    .fill(ROOF)

  // A grid of windows, a few lit warm.
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

function buildBuildings(W: number, H: number): Graphics {
  const g = new Graphics()
  const base = H * 0.62
  drawHouse(g, W * 0.08, base, W * 0.15, H * 0.24, HOUSE_A)
  drawHouse(g, W * 0.24, base, W * 0.13, H * 0.2, HOUSE_B)
  drawHouse(g, W * 0.37, base, W * 0.1, H * 0.16, HOUSE_C)
  drawHouse(g, W * 0.62, base, W * 0.11, H * 0.18, HOUSE_C)
  drawHouse(g, W * 0.75, base, W * 0.14, H * 0.23, HOUSE_B)
  drawHouse(g, W * 0.91, base, W * 0.13, H * 0.21, HOUSE_A)
  return g
}

function buildRoad(W: number, H: number): Graphics {
  const g = new Graphics()
  // Horizontal foreground street in the lower third...
  g.rect(0, H * 0.66, W, H - H * 0.66).fill(ROAD)
  // ...branching into an L that recedes toward the gap between the houses.
  g.moveTo(W * 0.4, H * 0.66)
    .lineTo(W * 0.6, H * 0.66)
    .lineTo(W * 0.535, H * 0.5)
    .lineTo(W * 0.465, H * 0.5)
    .closePath()
    .fill(ROAD_BRANCH)
  g.rect(0, H * 0.66, W, 2).fill(ROAD_EDGE)
  return g
}

/** A lamppost: mid-layer, Y-sorted + depth-scaled by its base (feet) Y. */
function lamppost(x: number, baseY: number): SceneLayer {
  const g = new Graphics()
  g.rect(-4, -130, 8, 130).fill(LAMP_POST)
  g.roundRect(-12, -144, 24, 16, 4).fill(LAMP_POST)
  g.circle(0, -136, 5).fill(LAMP_GLOW)
  g.position.set(x, baseY)
  return { band: 'mid', display: g, anchorY: baseY }
}

/** A foreground bush: a clump of overlapping circles framing the near edge. */
function bush(cx: number, cy: number, scale: number): SceneLayer {
  const r = 46 * scale
  const g = new Graphics()
  g.circle(-r * 0.9, 0, r * 0.8)
    .circle(0, -r * 0.35, r)
    .circle(r * 0.95, 0, r * 0.85)
    .circle(-r * 0.2, r * 0.25, r * 0.7)
    .circle(r * 0.45, r * 0.2, r * 0.75)
    .fill(BUSH)
  g.position.set(cx, cy)
  return { band: 'foreground', display: g }
}

/** The road's ⊥ outline: horizontal street + the receding branch (clockwise). */
function streetWalkable(W: number, H: number): WalkArea {
  return {
    polygon: [
      0,
      H * 0.95,
      W,
      H * 0.95,
      W,
      H * 0.67,
      W * 0.59,
      H * 0.67,
      W * 0.53,
      H * 0.52,
      W * 0.47,
      H * 0.52,
      W * 0.41,
      H * 0.67,
      0,
      H * 0.67,
    ],
  }
}

export const streetScene: SceneFactory = (screen) => {
  const { width: W, height: H } = screen
  return {
    depth: streetDepth,
    walkable: streetWalkable(W, H),
    start: { x: W * 0.42, y: H * 0.86 },
    layers: [
      { band: 'background', display: buildSky(W, H) },
      { band: 'background', display: buildLand(W, H) },
      { band: 'background', display: buildBuildings(W, H) },
      { band: 'background', display: buildRoad(W, H) },
      lamppost(W * 0.45, H * 0.58),
      lamppost(W * 0.82, H * 0.8),
      bush(W * 0.12, H * 0.97, 1.35),
      bush(W * 0.34, H * 1.0, 1.05),
      bush(W * 0.66, H * 1.02, 1.2),
      bush(W * 0.88, H * 0.98, 1.5),
    ],
  }
}
