import { Color, Container, Graphics } from 'pixi.js'
import type { LightningConfig } from '../data/schema'

const FLASH_MS = 200 // a flash fades over this
const THUNDER_DELAY_MS = 900 // thunder lands a beat after the flash

export interface LightningSystem {
  /** `active` gates flashing (the scene checks `when`); `dt` ms. */
  update(deltaMs: number, active: boolean): void
  destroy(): void
}

const randGap = (cfg: LightningConfig): number =>
  (cfg.minGap + Math.random() * Math.max(0, cfg.maxGap - cfg.minGap)) * 1000

/**
 * **Lightning + thunder** (M10 10d) — a screen-space colour flash on a random interval, with an
 * optional thunder sound a beat later (`onThunder`, muted in the editor). Flashing pauses when
 * the scene's `when` doesn't hold (passed as `active`).
 */
export function createLightning(
  layer: Container,
  cfg: LightningConfig,
  onThunder: () => void,
): LightningSystem {
  const flash = new Graphics().rect(-5000, -5000, 10000, 10000).fill({
    color: new Color(cfg.color).toNumber(),
  })
  flash.alpha = 0
  flash.eventMode = 'none'
  layer.addChild(flash)

  const peak = Math.min(1, Math.max(0, cfg.intensity))
  let wait = randGap(cfg)
  let flashT = 0 // remaining flash ms
  let thunderT = -1 // remaining ms until thunder (negative = idle)

  return {
    update(dt, active) {
      flash.alpha = flashT > 0 ? peak * (flashT / FLASH_MS) : 0
      if (flashT > 0) flashT -= dt
      if (thunderT >= 0) {
        thunderT -= dt
        if (thunderT < 0) onThunder()
      }
      if (!active) return // frozen out of the storm window
      wait -= dt
      if (wait <= 0) {
        flashT = FLASH_MS
        thunderT = THUNDER_DELAY_MS
        wait = randGap(cfg)
      }
    },
    destroy() {
      flash.destroy()
    },
  }
}
