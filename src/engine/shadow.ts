import { Container, Sprite, Texture } from 'pixi.js'
import type { ShadowConfig } from '../data/schema'

/**
 * Soft **contact ("blob") shadows** (M13c) — a dark, depth-scaled ellipse under each character /
 * opted-in prop, drawn in a world-space pass **below** the entities. It's plain ambient-occlusion
 * grounding (no light direction — that's the V2 directional/light-driven shadow). The lighting
 * overlay still sits above the world, so a shadow is naturally darkened in dark areas too.
 */

/** A soft round shadow texture (dark centre → transparent edge), built once and shared. */
let shadowTex: Texture | null = null
function shadowTexture(): Texture {
  if (shadowTex) return shadowTex
  const S = 128
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const r = S / 2
    const g = ctx.createRadialGradient(r, r, 0, r, r, r)
    g.addColorStop(0, 'rgba(0,0,0,0.85)')
    g.addColorStop(0.6, 'rgba(0,0,0,0.5)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, S, S)
  }
  shadowTex = Texture.from(canvas)
  return shadowTex
}

/** A thing that casts a blob shadow: each frame it samples its feet/base position + on-screen
 *  width (design px) + whether it's currently visible (a hidden NPC / gated prop drops its shadow). */
export interface ShadowCaster {
  sample: () => { x: number; y: number; width: number; visible?: boolean }
}

export interface ShadowSystem {
  add(caster: ShadowCaster): void
  update(): void
  destroy(): void
}

const DEFAULT_OPACITY = 0.32
const DEFAULT_SQUASH = 0.32 // ellipse height = width × squash
const DEFAULT_WIDTH = 0.7 // shadow width = the entity's on-screen width × this

export function createShadowSystem(layer: Container, cfg?: ShadowConfig): ShadowSystem {
  const opacity = cfg?.opacity ?? DEFAULT_OPACITY
  const squash = cfg?.squash ?? DEFAULT_SQUASH
  const widthScale = cfg?.scale ?? DEFAULT_WIDTH
  const tex = shadowTexture()
  const entries: { caster: ShadowCaster; sprite: Sprite }[] = []

  const place = (e: { caster: ShadowCaster; sprite: Sprite }): void => {
    const s = e.caster.sample()
    e.sprite.visible = s.visible ?? true
    if (!e.sprite.visible) return
    e.sprite.position.set(s.x, s.y)
    const w = Math.abs(s.width) * widthScale
    e.sprite.width = w
    e.sprite.height = w * squash
  }

  return {
    add(caster) {
      const sprite = new Sprite(tex)
      sprite.anchor.set(0.5, 0.5)
      sprite.eventMode = 'none'
      sprite.alpha = opacity
      layer.addChild(sprite)
      const e = { caster, sprite }
      entries.push(e)
      place(e)
    },
    update() {
      for (const e of entries) place(e)
    },
    destroy() {
      for (const e of entries) e.sprite.destroy()
      entries.length = 0
    },
  }
}
