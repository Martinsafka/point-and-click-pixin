import { Color, Container, Particle, ParticleContainer, Rectangle, Texture } from 'pixi.js'
import type { PointEmitter } from '../data/schema'
import type { Size } from './scene'
import { PARTICLE_BUDGET, atmosphereQuality } from './atmosphere'
import { ROUND_SIZE, roundTexture } from './weather'

const DEG = Math.PI / 180

export interface EmitterSystem {
  /** The particle container — toggle `.visible` to gate the emitter (e.g. on a `when`). */
  display: Container
  update(deltaMS: number): void
  destroy(): void
}

interface Mote {
  particle: Particle
  vx: number
  vy: number
  age: number
}

/**
 * A localized point particle emitter (M10) — smoke / embers / drips / a dust plume.
 * **World-space**: the layer it lives in tracks the scene, so the particles stay at the scene
 * point. A fixed pool of `rate × life` particles (capped by the quality budget) is recycled:
 * each is launched from the point along `angle` (± `spread`) at `speed`, accelerated by
 * `gravity` (negative rises like smoke), grows by `grow`, fades over `life`, then respawns.
 */
export function createEmitterSystem(
  layer: Container,
  e: PointEmitter,
  design: Size,
): EmitterSystem {
  const life = Math.max(0.1, e.life)
  const count = Math.min(
    Math.max(0, Math.round(e.rate * life)),
    PARTICLE_BUDGET[atmosphereQuality.value],
  )
  const streak = e.shape === 'streak'
  const texture = streak ? Texture.WHITE : roundTexture()
  const tint = new Color(e.color).toNumber()
  const ox = e.x * design.width
  const oy = e.y * design.height

  const container = new ParticleContainer({
    texture,
    boundsArea: new Rectangle(-4000, -4000, 8000, 8000), // generous — never culled
    dynamicProperties: { position: true, scale: true, color: true },
  })
  container.blendMode = e.blend === 'add' ? 'add' : 'normal'
  layer.addChild(container)

  // (Re)launch a particle from the point. `stagger` seeds a random age on first fill so
  // emission is continuous rather than puffing all at once.
  const launch = (m: Mote, stagger: boolean) => {
    const a = (e.angle + (Math.random() * 2 - 1) * e.spread) * DEG
    m.vx = Math.cos(a) * e.speed
    m.vy = Math.sin(a) * e.speed
    m.age = stagger ? Math.random() * life : 0
    const r = Math.random() * Math.max(0, e.spawnRadius)
    const ra = Math.random() * Math.PI * 2
    m.particle.x = ox + Math.cos(ra) * r
    m.particle.y = oy + Math.sin(ra) * r
  }

  const motes: Mote[] = []
  for (let i = 0; i < count; i += 1) {
    const particle = new Particle({ texture, anchorX: 0.5, anchorY: 0.5, tint, alpha: e.alpha })
    const m: Mote = { particle, vx: 0, vy: 0, age: 0 }
    launch(m, true)
    motes.push(m)
    container.addParticle(particle)
  }

  return {
    display: container,
    update(deltaMS) {
      const dt = deltaMS / 1000
      for (const m of motes) {
        m.age += dt
        if (m.age >= life) launch(m, false)
        m.vy += e.gravity * dt
        m.particle.x += m.vx * dt
        m.particle.y += m.vy * dt
        const size = Math.max(0.1, e.size + e.grow * m.age)
        if (streak) {
          m.particle.scaleX = Math.max(1, size * 0.06)
          m.particle.scaleY = size
        } else {
          m.particle.scaleX = m.particle.scaleY = size / ROUND_SIZE
        }
        m.particle.alpha = e.alpha * Math.max(0, 1 - m.age / life) // fade out over life
      }
    },
    destroy() {
      container.destroy({ children: true })
    },
  }
}
