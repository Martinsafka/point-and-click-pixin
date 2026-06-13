import { Graphics } from 'pixi.js'
import { registerLayerBuilder, type Size } from '../engine/scene'
import type { SceneData } from '../data/schema'

/**
 * A minimal interior — the second scene. Demonstrates transitions/persistence
 * plus the inventory verbs: pick up the gear + handle, combine them into a
 * crank, then use the crank on the wall panel to get a gem. A geometric
 * `builtin` background (wall + floor + panel) and pickup props.
 */

const WALL = '#14181f'
const FLOOR = '#1d2230'
const SEAM = '#2a3142'
const DOOR = '#06090f'
const DOOR_LIGHT = '#e0a23a'
const PANEL = '#0e131c'
const PANEL_EDGE = '#3a4456'
const PANEL_SLOT = '#2a3142'
const STEEL = '#6b7689'
const STEEL_DARK = '#2a3040'
const WOOD = '#8a6a3a'
const WOOD_LIGHT = '#a8854a'

function buildRoom({ width: W, height: H }: Size): Graphics {
  const g = new Graphics()
  const horizon = H * 0.62
  g.rect(0, 0, W, horizon).fill(WALL)
  g.rect(0, horizon, W, H - horizon).fill(FLOOR)
  g.rect(0, horizon - 2, W, 3).fill(SEAM)
  // Door back to the street — dark, with warm light leaking around it.
  g.rect(W * 0.46, H * 0.32, W * 0.08, H * 0.3)
    .fill(DOOR)
    .stroke({ width: 3, color: DOOR_LIGHT, alignment: 0 })
  g.rect(W * 0.45, H * 0.6, W * 0.1, H * 0.015).fill(DOOR_LIGHT)
  // A wall panel with a slot — use the crank on it.
  g.rect(W * 0.72, H * 0.34, W * 0.08, H * 0.12)
    .fill(PANEL)
    .stroke({ width: 2, color: PANEL_EDGE, alignment: 0 })
  g.rect(W * 0.745, H * 0.385, W * 0.03, H * 0.035).fill(PANEL_SLOT)
  return g
}

function buildGear({ width: W, height: H }: Size, p: Record<string, number>): Graphics {
  const g = new Graphics()
  g.star(0, -12, 8, 13, 8).fill(STEEL).stroke({ width: 1, color: STEEL_DARK, alignment: 0.5 })
  g.circle(0, -12, 4).fill(STEEL_DARK)
  g.position.set((p.xFrac ?? 0.3) * W, (p.yFrac ?? 0.85) * H)
  return g
}

function buildHandle({ width: W, height: H }: Size, p: Record<string, number>): Graphics {
  const g = new Graphics()
  g.roundRect(-14, -10, 28, 6, 3).fill(WOOD)
  g.circle(-12, -7, 5).fill(WOOD_LIGHT)
  g.position.set((p.xFrac ?? 0.62) * W, (p.yFrac ?? 0.88) * H)
  return g
}

registerLayerBuilder('room.bg', buildRoom)
registerLayerBuilder('room.gear', buildGear)
registerLayerBuilder('room.handle', buildHandle)

export const roomScene: SceneData = {
  id: 'room',
  name: 'Room',
  depth: { yNearFrac: 0.95, yFarFrac: 0.66, scaleNear: 1, scaleFar: 0.72 },
  spawn: { xFrac: 0.5, yFrac: 0.8 },
  walkable: [0.08, 0.94, 0.92, 0.94, 0.92, 0.66, 0.08, 0.66],
  interactables: [
    {
      kind: 'exit',
      id: 'to-street',
      to: 'street',
      hitArea: [0.45, 0.32, 0.55, 0.32, 0.55, 0.63, 0.45, 0.63],
    },
    {
      kind: 'pickable',
      id: 'gear',
      item: 'gear',
      hitArea: [0.25, 0.79, 0.35, 0.79, 0.35, 0.9, 0.25, 0.9],
    },
    {
      kind: 'pickable',
      id: 'handle',
      item: 'handle',
      hitArea: [0.57, 0.83, 0.67, 0.83, 0.67, 0.93, 0.57, 0.93],
    },
    {
      kind: 'interact',
      id: 'panel',
      hitArea: [0.71, 0.33, 0.81, 0.33, 0.81, 0.47, 0.71, 0.47],
      effects: [],
      uses: [
        {
          item: 'crank',
          effects: [
            { kind: 'giveItem', item: 'gem' },
            { kind: 'setFlag', flag: 'panel-used' },
          ],
        },
      ],
      when: { kind: 'not', of: { kind: 'flag', flag: 'panel-used' } },
    },
  ],
  layers: [
    { kind: 'builtin', band: 'background', builder: 'room.bg' },
    {
      kind: 'builtin',
      band: 'mid',
      builder: 'room.gear',
      anchorYFrac: 0.85,
      params: { xFrac: 0.3, yFrac: 0.85 },
      when: { kind: 'not', of: { kind: 'flag', flag: 'picked:gear' } },
    },
    {
      kind: 'builtin',
      band: 'mid',
      builder: 'room.handle',
      anchorYFrac: 0.88,
      params: { xFrac: 0.62, yFrac: 0.88 },
      when: { kind: 'not', of: { kind: 'flag', flag: 'picked:handle' } },
    },
  ],
}
