import { Application, Graphics } from 'pixi.js'

/**
 * Boots the PixiJS v8 renderer.
 *
 * The whole game world lives inside this Application's scene graph — characters
 * included — so foreground layers can occlude them for stealth (see
 * agent_docs/architecture.md). UI chrome stays in React, layered on top.
 *
 * For now this just proves the pipeline: a single geometric placeholder on a
 * muted dark background (the Röki/chiaroscuro base). Scene layering, the
 * entity view/logic split, and real swappable views slot in via later tasks.
 */
export async function createPixiApp(): Promise<Application> {
  const app = new Application()

  await app.init({
    resizeTo: window,
    background: '#10131a',
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    preference: 'webgl',
  })

  // Placeholder "character": geometric primitives are a legitimate shippable
  // style here, not a stub (see agent_docs/asset_pipeline.md). v8 Graphics is
  // shape-then-fill.
  const placeholder = new Graphics()
    .roundRect(-40, -60, 80, 120, 8)
    .fill('#3a4a63')
    .stroke({ width: 2, color: '#6b86b0', alignment: 0 })
  placeholder.position.set(app.screen.width / 2, app.screen.height / 2)
  app.stage.addChild(placeholder)

  return app
}
