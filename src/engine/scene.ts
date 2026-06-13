import {
  Container,
  Graphics,
  type Application,
  type FederatedPointerEvent,
  type Ticker,
} from 'pixi.js'
import { Character } from '../entities/character'
import { createCubeView } from '../entities/character-view'
import { demoScene, resolveDepthScale } from '../data/scene-config'

/** A live scene mounted on the Application. Call `destroy()` on teardown. */
export interface Scene {
  destroy(): void
}

/**
 * Builds the playable scene onto an initialised Application.
 *
 * Three layers, ordered by zIndex (agent_docs/architecture.md):
 *   1. background      — the static plate
 *   2. interactive/mid — character + Y-sortable props (sorted by feet Y)
 *   3. foreground      — occluders that always draw over the character
 *
 * Two kinds of occlusion are on show: the character hides behind the foreground
 * pillar (a top layer), and sorts in front of / behind the mid-scene crate by
 * comparing feet Y (dynamic). Depth scaling shrinks it toward the horizon.
 *
 * Props are inline placeholders for now; real scenes become data-driven (a scene
 * manifest) later. Sizes/positions are fractions of the screen, resolved here.
 */
export function createScene(app: Application): Scene {
  const { width, height } = app.screen

  // --- Layers ---------------------------------------------------------------
  app.stage.sortableChildren = true

  const background = new Container()
  background.zIndex = 0

  const interactive = new Container()
  interactive.zIndex = 10
  interactive.sortableChildren = true // Y-sort by feet Y happens in here

  const foreground = new Container()
  foreground.zIndex = 20

  app.stage.addChild(background, interactive, foreground)

  // --- Background plate: far wall + floor, split at the horizon -------------
  const horizonY = height * demoScene.yFarFrac
  const backdrop = new Graphics()
    .rect(0, 0, width, horizonY)
    .fill('#0d1017') // far wall (darkest)
    .rect(0, horizonY, width, height - horizonY)
    .fill('#161b25') // floor (slightly lifted)
  background.addChild(backdrop)

  // --- Mid-scene prop: Y-sortable. zIndex = its feet Y, same rule as the ----
  // --- character, so the cube passes in front when nearer, behind when far. -
  const crate = new Graphics()
    .roundRect(-45, -80, 90, 80, 6)
    .fill('#2c3850')
    .stroke({ width: 2, color: '#5a6f96', alignment: 0 })
  const crateFeetY = height * 0.72
  crate.position.set(width * 0.66, crateFeetY)
  crate.zIndex = crateFeetY
  interactive.addChild(crate)

  // --- Foreground occluder: always on top, so the cube hides behind it ------
  const pillar = new Graphics()
    .roundRect(-38, -300, 76, 300, 10)
    .fill('#05070b') // near-silhouette — reads as foreground
    .stroke({ width: 2, color: '#1c2230', alignment: 0 })
  pillar.position.set(width * 0.32, height * 0.92)
  foreground.addChild(pillar)

  // --- Character: lives in the mid layer, scaled + sorted by feet Y ----------
  const depthScale = resolveDepthScale(demoScene, height)
  const character = new Character(createCubeView(), depthScale)
  interactive.addChild(character.displayObject)
  character.setPosition(width * 0.5, height * 0.85)

  // --- Whole-screen click-to-move -------------------------------------------
  // The stage's own bounds only cover its children, so a screen-sized hitArea is
  // what makes empty space clickable. Clicks convert into the interactive layer's
  // local space, so they stay correct once that layer gains a transform/camera.
  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  app.stage.cursor = 'pointer'
  const onTap = (event: FederatedPointerEvent) => {
    const local = interactive.toLocal(event.global)
    character.setTarget(local.x, local.y)
  }
  app.stage.on('pointertap', onTap)

  const onTick = (ticker: Ticker) => {
    character.update(ticker.deltaMS)
  }
  app.ticker.add(onTick)

  return {
    destroy() {
      app.ticker.remove(onTick)
      app.stage.off('pointertap', onTap)
      app.stage.eventMode = 'auto'
      app.stage.hitArea = null
      app.stage.cursor = 'default'
      app.stage.sortableChildren = false
      character.destroy()
      background.destroy({ children: true })
      interactive.destroy({ children: true })
      foreground.destroy({ children: true })
    },
  }
}
