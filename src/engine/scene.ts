import { Container, type Application, type FederatedPointerEvent, type Ticker } from 'pixi.js'
import { Character } from '../entities/character'
import { createCubeView } from '../entities/character-view'

/** A live scene mounted on the Application. Call `destroy()` on teardown. */
export interface Scene {
  destroy(): void
}

/**
 * Builds the playable scene onto an initialised Application: an interactive
 * ("mid") layer holding the character, whole-screen click-to-move input, and the
 * per-frame update hook.
 *
 * Layering (background plate + foreground occluder) and depth scaling / Y-sort
 * land in the next step — `sortableChildren` is already on so that step only
 * adds containers and drives zIndex, with no restructuring here.
 */
export function createScene(app: Application): Scene {
  const interactive = new Container()
  interactive.sortableChildren = true
  app.stage.addChild(interactive)

  const character = new Character(createCubeView())
  interactive.addChild(character.displayObject)
  character.setPosition(app.screen.width / 2, app.screen.height / 2)

  // Whole-screen click catcher. The stage's own bounds only cover its children,
  // so a screen-sized hitArea is what makes empty space clickable. Clicks are
  // converted into the interactive layer's local space, so they stay correct
  // once that layer gains a transform/camera.
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
      character.destroy()
      interactive.destroy()
    },
  }
}
