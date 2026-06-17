import { Color, Container, Sprite, Texture } from 'pixi.js'
import type { Application } from 'pixi.js'
import type { Vignette } from '../data/schema'

/** A radial-gradient vignette texture (transparent centre → opaque edge), cached per `size`. */
const vigCache = new Map<number, Texture>()
function vignetteTexture(size: number): Texture {
  const key = Math.round(Math.min(1, Math.max(0, size)) * 20)
  const cached = vigCache.get(key)
  if (cached) return cached
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const r = S / 2
    const inner = r * (1 - key / 20) // bigger size → darkening reaches further in
    const g = ctx.createRadialGradient(r, r, inner, r, r, r * 1.42) // out to the corner
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(1, 'rgba(255,255,255,1)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
  }
  const tex = Texture.from(canvas)
  vigCache.set(key, tex)
  return tex
}

export interface VignetteSystem {
  update(): void
  destroy(): void
}

/**
 * A **vignette** (M10 10d) — a soft darkened frame. Screen-space: a radial-gradient sprite
 * stretched to the viewport (so it frames the screen as an ellipse), tinted + faded.
 */
export function createVignette(layer: Container, cfg: Vignette, app: Application): VignetteSystem {
  const sprite = new Sprite(vignetteTexture(cfg.size))
  sprite.tint = new Color(cfg.color).toNumber()
  sprite.alpha = Math.min(1, Math.max(0, cfg.intensity))
  sprite.eventMode = 'none'
  layer.addChild(sprite)
  const fit = (): void => {
    sprite.width = app.screen.width
    sprite.height = app.screen.height
  }
  fit()
  return {
    update: fit, // re-fit on viewport resize
    destroy() {
      sprite.destroy()
    },
  }
}
