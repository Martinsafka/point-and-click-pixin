import { Application } from 'pixi.js'

/**
 * Boots the PixiJS v8 renderer.
 *
 * The whole game world lives inside this Application's scene graph — characters
 * included — so foreground layers can occlude them for stealth (see
 * agent_docs/architecture.md). UI chrome stays in React, layered on top.
 *
 * This function owns renderer setup only; the scene contents (interactive layer,
 * character, input) are built separately in engine/scene.ts.
 */
export async function createPixiApp(resizeTo: HTMLElement | Window = window): Promise<Application> {
  const app = new Application()

  await app.init({
    resizeTo,
    background: '#10131a', // muted dark — Röki chiaroscuro base
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    preference: 'webgl',
  })

  return app
}
