import { Color, Container, Particle, ParticleContainer, Rectangle, Texture } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { WeatherPreset } from '../data/schema'
import { PARTICLE_BUDGET, atmosphereQuality } from './atmosphere'

const DEG = Math.PI / 180

/** A soft round particle texture (radial gradient), built once and shared. */
let roundTex: Texture | null = null
const ROUND_SIZE = 32
function roundTexture(): Texture {
  if (roundTex) return roundTex
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = ROUND_SIZE
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const r = ROUND_SIZE / 2
    const g = ctx.createRadialGradient(r, r, 0, r, r, r)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.7)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, ROUND_SIZE, ROUND_SIZE)
  }
  roundTex = Texture.from(canvas)
  return roundTex
}

export interface WeatherSystem {
  update(deltaMS: number): void
  destroy(): void
}

interface Drop {
  particle: Particle
  baseX: number // x before sway, advanced by the wind component each frame
  phase: number // sway phase offset
}

/**
 * A screen-space weather layer (M10 10a): `count` particles (capped by the quality budget)
 * falling at `angle`/`speed`, optionally swaying, recycled when they leave the viewport.
 * Round (snow/dust) or streak (rain) shape, tinted, with an optional additive blend.
 */
export function createWeatherSystem(
  layer: Container,
  preset: WeatherPreset,
  app: Application,
): WeatherSystem {
  const count = Math.min(Math.max(0, Math.round(preset.count)), PARTICLE_BUDGET[atmosphereQuality.value])
  const texture = preset.shape === 'streak' ? Texture.WHITE : roundTexture()
  const tint = new Color(preset.color).toNumber()

  const container = new ParticleContainer({
    texture,
    boundsArea: new Rectangle(0, 0, 8000, 8000), // generous — never culled
    dynamicProperties: { position: true },
  })
  container.blendMode = preset.blend === 'add' ? 'add' : 'normal'
  layer.addChild(container)

  // Velocity from the fall angle (90° = straight down; <90° leans right).
  const vx = Math.cos(preset.angle * DEG) * preset.speed
  const vy = Math.max(1, Math.sin(preset.angle * DEG) * preset.speed)
  // A streak aligns its long axis with the fall direction (vertical = 90°).
  const rotation = preset.shape === 'streak' ? (preset.angle - 90) * DEG : 0

  const w = () => app.screen.width
  const h = () => app.screen.height
  const drops: Drop[] = []
  for (let i = 0; i < count; i += 1) {
    const particle = new Particle({
      texture,
      anchorX: 0.5,
      anchorY: 0.5,
      tint,
      alpha: preset.alpha,
      rotation,
      scaleX:
        preset.shape === 'streak' ? Math.max(1, preset.size * 0.06) : preset.size / ROUND_SIZE,
      scaleY: preset.shape === 'streak' ? preset.size : preset.size / ROUND_SIZE,
    })
    particle.x = Math.random() * w()
    particle.y = Math.random() * h()
    drops.push({ particle, baseX: particle.x, phase: Math.random() * Math.PI * 2 })
    container.addParticle(particle)
  }

  let t = 0
  return {
    update(deltaMS) {
      const dt = deltaMS / 1000
      t += dt
      const W = w()
      const H = h()
      const m = preset.size + 8
      for (const d of drops) {
        d.baseX += vx * dt
        d.particle.y += vy * dt
        d.particle.x =
          preset.sway > 0 ? d.baseX + Math.sin(t * preset.swayFreq * 2 * Math.PI + d.phase) * preset.sway : d.baseX
        // Recycle off the bottom; wrap horizontally.
        if (d.particle.y > H + m) {
          d.particle.y = -m
          d.baseX = Math.random() * W
        }
        if (d.baseX < -m) d.baseX += W + 2 * m
        else if (d.baseX > W + m) d.baseX -= W + 2 * m
      }
    },
    destroy() {
      container.destroy({ children: true })
    },
  }
}
