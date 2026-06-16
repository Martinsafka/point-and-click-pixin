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
  /** Fog behind characters (world-space). */
  fogBack: Container
  /** Fog in front of characters (world-space). */
  fogFront: Container
  /** Lighting overlay (world-space): ambient darken + local lights + dark areas + player light. */
  lighting: Container
  /** Weather particles (rain / snow / dust) — **screen-space** so they ignore the camera. */
  weather: Container
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
  const fogBack = make(5)
  const fogFront = make(25)
  const lighting = make(40)
  world.addChild(fogBack, fogFront, lighting)

  // Screen-space layers above the world (weather below the vignette/flash), below the
  // host's fade wash (zIndex 10000).
  const weather = make(90)
  const screenFx = make(100)
  stage.addChild(weather, screenFx)

  const updaters: ((deltaMS: number) => void)[] = []

  return {
    layers: { fogBack, fogFront, lighting, weather, screenFx },
    onUpdate: (cb) => updaters.push(cb),
    update: (deltaMS) => {
      for (const u of updaters) u(deltaMS)
    },
    destroy: () => {
      // The world-space slots ride `world.destroy({ children })`; the screen-space layers
      // (stage children) are removed here.
      weather.destroy({ children: true })
      screenFx.destroy({ children: true })
    },
  }
}
