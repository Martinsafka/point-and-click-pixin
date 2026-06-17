import { Container } from 'pixi.js'

/**
 * M10 atmosphere/lighting **compositing foundation**. Establishes the layer stack (a fixed
 * z-order) that weather (10a), lighting (10b), fog (10c) and polish (10d) render into, plus
 * a per-frame update hook + a global quality setting. Built once per scene mount; the scene
 * ticks `update` and `destroy`s it on teardown.
 *
 * Compositing order (locked) — back to front:
 *   background → fogBack → characters/mid → foreground → fogFront → lighting   [world-space,
 *   scroll/scale with the scene], then weather → screenFx (vignette / lightning flash)
 *   [screen-space on the stage, below the scene-transition wash].
 *
 * Weather is **screen-space** so rain falls vertically regardless of the camera pan (a
 * world-space layer would drag the rain sideways as you walk). Lighting stays world-space
 * so local lights / dark areas sit at scene coordinates.
 */
export type AtmosphereQuality = 'low' | 'medium' | 'high'

/** Global atmosphere quality (M10). The M11 settings UI will drive this; it defaults from
 *  `prefers-reduced-motion`. Subsystems (particles / filters) read it for their budgets. */
export const atmosphereQuality: { value: AtmosphereQuality } = {
  value:
    typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'low'
      : 'high',
}

/** Max live particles per quality — weather + emitters (10a) share this budget. */
export const PARTICLE_BUDGET: Record<AtmosphereQuality, number> = {
  low: 120,
  medium: 500,
  high: 1400,
}

/** The compositing slots. World-space layers scroll/scale with the scene; `screenFx` is
 *  screen-space on the stage (so the vignette frames the viewport, the flash fills it). */
export interface AtmosphereLayers {
  /** Lighting overlay — **screen-space** (covers the full viewport); a multiply ambient
   *  darken + dark areas + additive local lights + the player light (positioned via the
   *  camera so they still track scene coords). */
  lighting: Container
  /** Weather particles (rain / snow / dust) — **screen-space** so they ignore the camera. */
  weather: Container
  /** Localized point emitters — smoke / embers / drips (M10). **World-space** (over the scene
   *  art, in front of characters) so they stay at their scene point. */
  emitters: Container
  /** Screen-space effects: vignette + lightning flash. */
  screenFx: Container
}

export interface Atmosphere {
  layers: AtmosphereLayers
  /** Register a per-frame updater (weather drift, fog scroll, flicker, player-light follow). */
  onUpdate(cb: (deltaMS: number) => void): void
  update(deltaMS: number): void
  destroy(): void
}

export function createAtmosphere(world: Container, stage: Container): Atmosphere {
  const make = (zIndex: number): Container => {
    const c = new Container()
    c.zIndex = zIndex
    c.eventMode = 'none' // overlays never intercept input (clicks pass to the stage)
    return c
  }
  // World-space slots, slotted around the scene bands (background 0, interactive 10,
  // foreground 20). The scene's `world.sortableChildren` orders them.
  // Point emitters sit over the foreground art (22, over foreground 20) so chimney smoke /
  // embers read in front of the scene. (Fog adds its own layers straight into `world` at an
  // author-chosen zIndex, so it has no fixed slot here.)
  const emitters = make(22)
  world.addChild(emitters)

  // Screen-space layers above the world (so they cover the full viewport, incl. pillarbox),
  // below the host's fade wash (zIndex 10000): lighting (multiply darken + additive lights),
  // then weather (rain over the lit scene), then the vignette / flash.
  const lighting = make(50)
  const weather = make(90)
  const screenFx = make(100)
  stage.addChild(lighting, weather, screenFx)

  const updaters: ((deltaMS: number) => void)[] = []

  return {
    layers: { emitters, lighting, weather, screenFx },
    onUpdate: (cb) => updaters.push(cb),
    update: (deltaMS) => {
      for (const u of updaters) u(deltaMS)
    },
    destroy: () => {
      // The world-space slots ride `world.destroy({ children })`; the screen-space layers
      // (stage children) are removed here.
      lighting.destroy({ children: true })
      weather.destroy({ children: true })
      screenFx.destroy({ children: true })
    },
  }
}
