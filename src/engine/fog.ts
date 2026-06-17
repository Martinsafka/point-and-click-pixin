import { Color, Container, Texture, TilingSprite } from 'pixi.js'
import type { FogConfig } from '../data/schema'
import type { Size } from './scene'

/** A small seeded RNG (mulberry32) so a `seed` gives a deterministic noise pattern. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A tileable soft "cloud" texture (white on transparent) per `seed` — layered
 *  integer-frequency sines wrap seamlessly over the canvas, biased into soft clumps. Cached
 *  per seed (a scene mounts one; the editor reuses across non-seed edits). */
const FOG_SIZE = 256
const fogTexCache = new Map<number, Texture>()
function fogTexture(seed: number): Texture {
  const key = Math.round(seed)
  const cached = fogTexCache.get(key)
  if (cached) return cached
  const rng = mulberry32(key + 1)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = FOG_SIZE
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const img = ctx.createImageData(FOG_SIZE, FOG_SIZE)
    const waves = Array.from({ length: 6 }, (_, k) => ({
      fx: 1 + Math.floor(rng() * 3),
      fy: 1 + Math.floor(rng() * 3),
      px: rng() * Math.PI * 2,
      py: rng() * Math.PI * 2,
      amp: 1 / (k + 1),
    }))
    const buf = new Float32Array(FOG_SIZE * FOG_SIZE)
    let max = 1e-6
    for (let y = 0; y < FOG_SIZE; y += 1) {
      for (let x = 0; x < FOG_SIZE; x += 1) {
        let v = 0
        for (const w of waves) {
          v +=
            w.amp *
            Math.sin((2 * Math.PI * w.fx * x) / FOG_SIZE + w.px) *
            Math.sin((2 * Math.PI * w.fy * y) / FOG_SIZE + w.py)
        }
        buf[y * FOG_SIZE + x] = v
        max = Math.max(max, Math.abs(v))
      }
    }
    for (let i = 0; i < buf.length; i += 1) {
      let n = (buf[i] / max + 1) / 2 // 0..1
      n = Math.max(0, (n - 0.45) / 0.55) // bias toward clumps (thin most of the frame)
      n = n * n * (3 - 2 * n) // smoothstep for soft edges
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = 255
      img.data[i * 4 + 3] = Math.round(n * 255)
    }
    ctx.putImageData(img, 0, 0)
  }
  const tex = Texture.from(canvas)
  fogTexCache.set(key, tex)
  return tex
}

export interface FogSystem {
  update(deltaMS: number): void
  destroy(): void
}

interface FogLayer {
  sprite: TilingSprite
  vx: number
  vy: number
}

/** How much faster + larger the front layer leads the back, for a fixed depth feel. */
const FRONT_LEAD = 1.6
const FRONT_GROW = 1.25

/** Where the **back** fog layer goes: by default a `world` overlay at `backZ`; or slotted into
 *  a band container (behind a chosen layer) — by array `index` (non-sorted bands) or `zIndex`
 *  (a `sortableChildren` band like the mid/character band). */
export interface FogBackInto {
  parent: Container
  index?: number
  zIndex?: number
}

/**
 * Animated **fog / clouds** (M10 10c) — a *fake*, not volumetrics: a tileable soft-noise
 * `TilingSprite` scrolled over the scene, tinted + faded. A **back** + **front** layer drift
 * at a velocity (`parallaxX` / `parallaxY`), the front leading faster + larger for a depth
 * feel. The front is always a `world` overlay at `frontZ`; the back is too (at `backZ`) unless
 * `backInto` slots it inside a band (behind a chosen layer).
 */
export function createFog(
  world: Container,
  cfg: FogConfig,
  design: Size,
  backInto?: FogBackInto,
): FogSystem {
  const tex = fogTexture(cfg.seed)
  const tint = new Color(cfg.color).toNumber()
  const layers: FogLayer[] = []
  const zoom = Math.max(0.05, cfg.scale) / 100 // overall noise zoom (percent)

  const add = (
    opacity: number,
    vx: number,
    vy: number,
    scaleMul: number,
    place: (s: TilingSprite) => void,
  ) => {
    if (opacity <= 0) return
    const sprite = new TilingSprite({ texture: tex, width: design.width, height: design.height })
    const m = scaleMul * zoom
    sprite.tileScale.set(Math.max(0.2, cfg.scaleX) * m, Math.max(0.2, cfg.scaleY) * m)
    sprite.tilePosition.set(Math.random() * FOG_SIZE, Math.random() * FOG_SIZE)
    sprite.tint = tint
    sprite.alpha = Math.min(1, Math.max(0, opacity))
    sprite.eventMode = 'none'
    place(sprite)
    layers.push({ sprite, vx, vy })
  }
  // Back drifts at (parallaxX, parallaxY); the front leads faster + larger for depth.
  add(cfg.opacity, cfg.parallaxX, cfg.parallaxY, 1, (s) => {
    if (backInto && backInto.index !== undefined) {
      backInto.parent.addChildAt(s, Math.min(backInto.index, backInto.parent.children.length))
    } else if (backInto) {
      s.zIndex = backInto.zIndex ?? 0
      backInto.parent.addChild(s)
    } else {
      s.zIndex = cfg.backZ
      world.addChild(s)
    }
  })
  add(cfg.frontOpacity, cfg.parallaxX * FRONT_LEAD, cfg.parallaxY * FRONT_LEAD, FRONT_GROW, (s) => {
    s.zIndex = cfg.frontZ
    world.addChild(s)
  })

  return {
    update(deltaMS) {
      const dt = deltaMS / 1000
      for (const l of layers) {
        // Scroll in screen px regardless of noise size: `tilePosition` is texture-space, so a
        // step of `v` only moves the (tileScale-magnified) pattern `v / tileScale` on screen —
        // multiply by tileScale so a bigger noise still visibly drifts at `v` px/sec.
        l.sprite.tilePosition.x += l.vx * l.sprite.tileScale.x * dt
        l.sprite.tilePosition.y += l.vy * l.sprite.tileScale.y * dt
      }
    },
    destroy() {
      for (const l of layers) l.sprite.destroy()
    },
  }
}
