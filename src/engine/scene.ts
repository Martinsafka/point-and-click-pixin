import {
  Assets,
  Container,
  Sprite,
  type Application,
  type FederatedPointerEvent,
  type Ticker,
} from 'pixi.js'
import { Character } from '../entities/character'
import { createCubeView } from '../entities/character-view'
import { resolveDepthScale, type SceneConfig } from '../data/scene-config'
import { depthScaleAt } from '../systems/depth'
import type { WalkArea } from '../systems/walkable'

/** Viewport size in CSS pixels. */
export interface Size {
  width: number
  height: number
}

/** Which depth band a layer belongs to. */
export type SceneBand = 'background' | 'mid' | 'foreground'

/**
 * One stacked part of a scene. Parts layer on top of each other within their
 * band; eventually each is an SVG sprite (see `imageLayer`). For `mid` layers,
 * `anchorY` (feet Y, px) drives the Y-sort zIndex and depth scale, so the part
 * sits in the character's perspective.
 */
export interface SceneLayer {
  band: SceneBand
  display: Container
  anchorY?: number
}

/** One screen's content, resolved against the current viewport. */
export interface SceneDefinition {
  depth: SceneConfig
  /** Where the character may walk (a polygon, e.g. the road). */
  walkable: WalkArea
  /** Character spawn (feet), in px. */
  start: { x: number; y: number }
  /** Stacked parts of the scene, drawn in array order within each band. */
  layers: SceneLayer[]
}

/**
 * A scene is a factory from viewport size to its definition. It may be async, so
 * an SVG-composed scene can `await Assets.load(...)` before building its layers.
 */
export type SceneFactory = (screen: Size) => SceneDefinition | Promise<SceneDefinition>

/** A live scene mounted on the Application. Call `destroy()` on teardown. */
export interface Scene {
  destroy(): void
}

/** Hosts one scene at a time on an Application and swaps between scenes. */
export interface SceneHost {
  show(factory: SceneFactory): Promise<void>
  destroy(): void
}

/**
 * Builds a scene layer from an image/SVG URL — the eventual path for real art:
 * each scene part is an SVG that stacks in its band (Pixi loads SVG as a
 * texture). Async, so a SceneFactory that uses it must be async too.
 */
export async function imageLayer(
  url: string,
  band: SceneBand,
  opts: { x?: number; y?: number; anchorY?: number } = {},
): Promise<SceneLayer> {
  const texture = await Assets.load(url)
  const sprite = new Sprite(texture)
  sprite.position.set(opts.x ?? 0, opts.y ?? 0)
  return { band, display: sprite, anchorY: opts.anchorY }
}

/**
 * Mounts a scene onto an initialised Application as three zIndex-ordered bands —
 * background < interactive (mid) < foreground occluder — plus whole-screen
 * click-to-move and the per-frame update hook (agent_docs/architecture.md).
 */
export async function mountScene(app: Application, factory: SceneFactory): Promise<Scene> {
  const screen: Size = { width: app.screen.width, height: app.screen.height }
  const def = await factory(screen)
  const depthScale = resolveDepthScale(def.depth, screen.height)

  // --- Bands ----------------------------------------------------------------
  app.stage.sortableChildren = true

  const background = new Container()
  background.zIndex = 0
  const interactive = new Container()
  interactive.zIndex = 10
  interactive.sortableChildren = true // Y-sort by feet Y happens in here
  const foreground = new Container()
  foreground.zIndex = 20
  app.stage.addChild(background, interactive, foreground)

  const bandFor = (band: SceneBand): Container =>
    band === 'background' ? background : band === 'foreground' ? foreground : interactive

  // --- Layers (stacked in array order within each band) ---------------------
  for (const layer of def.layers) {
    if (layer.band === 'mid' && layer.anchorY !== undefined) {
      layer.display.zIndex = layer.anchorY
      layer.display.scale.set(depthScaleAt(layer.anchorY, depthScale))
    }
    bandFor(layer.band).addChild(layer.display)
  }

  // --- Character ------------------------------------------------------------
  const character = new Character(createCubeView(), depthScale, def.walkable)
  interactive.addChild(character.displayObject)
  character.setPosition(def.start.x, def.start.y)

  // --- Whole-screen click-to-move -------------------------------------------
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

  let torn = false
  return {
    destroy() {
      if (torn) return
      torn = true
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

/** Creates a host that mounts one scene at a time and swaps between them. */
export function createSceneHost(app: Application): SceneHost {
  let current: Scene | undefined
  let destroyed = false
  return {
    async show(factory) {
      current?.destroy()
      current = undefined
      const scene = await mountScene(app, factory)
      // Guard against being torn down while the (possibly async) mount ran.
      if (destroyed) {
        scene.destroy()
        return
      }
      current = scene
    },
    destroy() {
      destroyed = true
      current?.destroy()
      current = undefined
    },
  }
}
