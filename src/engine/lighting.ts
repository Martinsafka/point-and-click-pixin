import { BlurFilter, Color, Container, Graphics, RenderTexture, Sprite, Texture } from 'pixi.js'
import type { Application } from 'pixi.js'
import type {
  AmbientLight,
  DarkArea,
  LightSource,
  PlayerLight,
  PlayerLightShape,
} from '../data/schema'
import type { StoryState } from '../systems/conditions'
import { checkCondition } from '../systems/conditions'
import type { Size } from './scene'
import { cameraOffset } from './camera'
import type { Facing } from '../systems/movement'
import { facingToAngle } from '../systems/movement'

/** A soft white radial texture (centre → transparent), built once and shared. */
let radialTex: Texture | null = null
const RADIAL_SIZE = 128
function radialTexture(): Texture {
  if (radialTex) return radialTex
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = RADIAL_SIZE
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const r = RADIAL_SIZE / 2
    const g = ctx.createRadialGradient(r, r, 0, r, r, r)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.55)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(r, r, r, 0, Math.PI * 2)
    ctx.fill()
  }
  radialTex = Texture.from(canvas)
  return radialTex
}

/** A cone light texture: apex at the left-centre, opening right ±halfAngle, radial falloff. */
const CONE_SIZE = 256
function coneTexture(angleDeg: number): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = CONE_SIZE
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const half = (Math.min(170, Math.max(10, angleDeg)) / 2) * (Math.PI / 180)
    const ay = CONE_SIZE / 2
    ctx.beginPath()
    ctx.moveTo(0, ay)
    ctx.arc(0, ay, CONE_SIZE, -half, half)
    ctx.closePath()
    ctx.clip()
    const g = ctx.createRadialGradient(0, ay, 0, 0, ay, CONE_SIZE)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.5)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, CONE_SIZE, CONE_SIZE)
  }
  return Texture.from(canvas)
}

export interface Lighting {
  update(state: StoryState, playerX: number, playerY: number, facing: Facing): void
  destroy(): void
}

/**
 * The scene's lighting (M10 10b). A **lightmap** (ambient base + additive lights that
 * brighten toward white + dark zones) is rendered to a **viewport-sized** texture each frame
 * and **multiply**-composited over the scene — so lit areas show the scene art at full and
 * dark areas hide it (a soft reveal, the good look). Local lights also get a **subtle
 * additive glow** so a lamp emits even over black. Scene-positioned elements live in groups
 * whose transform tracks the camera, so they stay at scene coords while the map fills the
 * viewport (incl. pillarbox). Returns null when the scene has nothing to light.
 */
export function createLighting(
  layer: Container,
  design: Size,
  app: Application,
  cfg: {
    ambient: AmbientLight
    lights: LightSource[]
    darkAreas: DarkArea[]
    playerLight?: PlayerLight
  },
  /** World→screen transform the scene-positioned lights track. Defaults to the game camera;
   *  the editor preview passes its own fit transform (M10 ME.0). */
  camera: { x: number; y: number; scale: number } = cameraOffset,
): Lighting | null {
  const active =
    cfg.ambient.intensity < 0.999 || cfg.lights.length > 0 || cfg.darkAreas.length > 0
  if (!active) return null
  const radial = radialTexture()

  // --- The lightmap (rendered to a viewport-sized texture, multiply over the scene) ---
  let rt = RenderTexture.create({
    width: Math.max(1, app.screen.width),
    height: Math.max(1, app.screen.height),
  })
  const lightmap = new Container()
  // Base ambient level — a dark fill the lights brighten toward white (→ reveal).
  const c = new Color(cfg.ambient.color).toArray()
  const baseNumber = new Color({
    r: c[0] * 255 * cfg.ambient.intensity,
    g: c[1] * 255 * cfg.ambient.intensity,
    b: c[2] * 255 * cfg.ambient.intensity,
  }).toNumber()
  const base = new Graphics().rect(-5000, -5000, 20000, 20000).fill({ color: baseNumber })
  lightmap.addChild(base)
  // Scene-positioned reveal contributors (camera-tracked transform).
  const lmWorld = new Container()
  lightmap.addChild(lmWorld)

  // Dark zones — black polygons (lower the lightmap), blurred for a soft edge.
  if (cfg.darkAreas.length > 0) {
    const darks = new Container()
    let feather = 0
    for (const d of cfg.darkAreas) {
      const poly = d.polygon.map((v, i) => v * (i % 2 === 0 ? design.width : design.height))
      darks.addChild(new Graphics().poly(poly).fill({ color: 0x000000 }))
      feather = Math.max(feather, (d.feather ?? 0.04) * design.height)
    }
    darks.filters = [new BlurFilter({ strength: Math.max(2, feather) })]
    lmWorld.addChild(darks)
  }

  // A light sprite for any source: shape (sphere / cone) + deform (rotation, width, height).
  const makeLight = (o: {
    shape?: PlayerLightShape
    radiusPx: number
    color: string
    angle?: number
    rotation?: number
    scaleX?: number
    scaleY?: number
  }): Sprite => {
    const cone = o.shape === 'cone'
    const sprite = new Sprite(cone ? coneTexture(o.angle ?? 60) : radial)
    sprite.anchor.set(cone ? 0 : 0.5, 0.5)
    sprite.tint = new Color(o.color).toNumber()
    sprite.blendMode = 'add'
    const unit = cone ? o.radiusPx / CONE_SIZE : (o.radiusPx * 2) / RADIAL_SIZE
    sprite.scale.set(unit * (o.scaleX ?? 1), unit * (o.scaleY ?? 1))
    sprite.rotation = ((o.rotation ?? 0) * Math.PI) / 180
    return sprite
  }
  const localSprite = (light: LightSource): Sprite => {
    const sprite = makeLight({
      shape: light.shape,
      radiusPx: light.radius * design.height,
      color: light.color,
      angle: light.angle,
      rotation: light.rotation,
      scaleX: light.scaleX,
      scaleY: light.scaleY,
    })
    sprite.position.set(light.x * design.width, light.y * design.height)
    return sprite
  }

  // Local lights: a reveal sprite (in the lightmap) + a faint additive glow (over the scene).
  const glowWorld = new Container()
  const lightSprites = cfg.lights.map((light) => {
    const reveal = localSprite(light)
    lmWorld.addChild(reveal)
    const glow = localSprite(light)
    glowWorld.addChild(glow)
    return { reveal, glow, light }
  })

  // Player light reveal (sphere / cone — the cone aims via the player's facing), positioned
  // each frame.
  let playerReveal: Sprite | null = null
  const pl = cfg.playerLight
  if (pl) {
    playerReveal = makeLight({
      shape: pl.shape,
      radiusPx: pl.radius * design.height,
      color: pl.color,
      angle: pl.angle,
    })
    lmWorld.addChild(playerReveal)
  }

  // The composite: the lightmap texture, multiply-blended over the scene (full viewport).
  const display = new Sprite(rt)
  display.blendMode = 'multiply'
  display.eventMode = 'none'
  layer.addChild(display)
  // The faint glow layer (additive over the scene), scene-positioned.
  glowWorld.eventMode = 'none'
  layer.addChild(glowWorld)

  const syncCam = (g: Container) => {
    g.position.set(camera.x, camera.y)
    g.scale.set(camera.scale)
  }

  return {
    update(state, playerX, playerY, facing) {
      // Re-fit the lightmap texture to the (possibly resized) viewport.
      if (rt.width !== app.screen.width || rt.height !== app.screen.height) {
        rt.destroy(true)
        rt = RenderTexture.create({
          width: Math.max(1, app.screen.width),
          height: Math.max(1, app.screen.height),
        })
        display.texture = rt
      }
      syncCam(lmWorld)
      syncCam(glowWorld)
      for (const { reveal, glow, light } of lightSprites) {
        const on = !light.when || checkCondition(state, light.when)
        reveal.visible = on
        glow.visible = on
        if (on) {
          const flick = light.flicker ? 1 - Math.random() * light.flicker : 1
          reveal.alpha = Math.min(1, Math.max(0, light.intensity * flick))
          glow.alpha = Math.min(0.5, light.intensity * flick * 0.28) // faint emission
        }
      }
      if (playerReveal && pl) {
        const on = !pl.when || checkCondition(state, pl.when)
        playerReveal.visible = on
        if (on) {
          playerReveal.position.set(playerX, playerY)
          playerReveal.alpha = Math.min(1, pl.intensity)
          if (pl.shape === 'cone') playerReveal.rotation = facingToAngle(facing)
        }
      }
      app.renderer.render({ container: lightmap, target: rt })
    },
    destroy() {
      display.destroy()
      glowWorld.destroy({ children: true })
      lightmap.destroy({ children: true })
      rt.destroy(true)
    },
  }
}
