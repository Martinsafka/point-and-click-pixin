import { Graphics } from 'pixi.js'
import { registerLayerBuilder, type Size } from '../engine/scene'
import type { SceneData } from '../data/schema'

/**
 * A minimal interior — the second scene, so transitions + persistence are
 * demonstrable. One geometric `builtin` background (wall + floor + a lit door)
 * and an `exit` interactable on the door back to the street.
 */

const WALL = '#14181f'
const FLOOR = '#1d2230'
const SEAM = '#2a3142'
const DOOR = '#06090f'
const DOOR_LIGHT = '#e0a23a'

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
  return g
}

registerLayerBuilder('room.bg', buildRoom)

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
  ],
  layers: [{ kind: 'builtin', band: 'background', builder: 'room.bg' }],
}
