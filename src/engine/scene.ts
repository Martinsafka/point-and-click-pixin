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
import { resolveDepthScale } from '../data/scene-config'
import { depthScaleAt } from '../systems/depth'
import type { WalkArea } from '../systems/walkable'
import type { LayerData, SceneBand, SceneData } from '../data/schema'

/** Viewport size in CSS pixels. */
export interface Size {
  width: number
  height: number
}

/**
 * Builds a geometric placeholder layer (a `builtin` LayerData) from screen size
 * + the layer's numeric params. Registered by key; real art uses `image` layers
 * instead. Scenes register their builders at module load (see scenes/street.ts).
 */
export type LayerBuilder = (screen: Size, params: Record<string, number>) => Container

const builders = new Map<string, LayerBuilder>()

export function registerLayerBuilder(key: string, build: LayerBuilder): void {
  builders.set(key, build)
}

/** A live scene mounted on the Application. Call `destroy()` on teardown. */
export interface Scene {
  destroy(): void
}

/** Hosts one scene at a time on an Application and swaps between scenes. */
export interface SceneHost {
  show(scene: SceneData): Promise<void>
  destroy(): void
}

/** Resolve a fractional polygon to pixels against the screen. */
function resolvePolygon(frac: readonly number[], { width, height }: Size): number[] {
  return frac.map((v, i) => v * (i % 2 === 0 ? width : height))
}

async function buildLayer(layer: LayerData, screen: Size): Promise<Container> {
  if (layer.kind === 'image') {
    const texture = await Assets.load(layer.src)
    const sprite = new Sprite(texture)
    sprite.position.set((layer.xFrac ?? 0) * screen.width, (layer.yFrac ?? 0) * screen.height)
    return sprite
  }
  const build = builders.get(layer.builder)
  if (!build) throw new Error(`Unknown layer builder: "${layer.builder}"`)
  return build(screen, layer.params ?? {})
}

/**
 * Mounts a `SceneData` onto an initialised Application as three zIndex-ordered
 * bands — background < interactive (mid) < foreground occluder — plus
 * whole-screen click-to-move and the per-frame update hook. Positions in the
 * data are screen fractions, resolved to pixels here (agent_docs/architecture.md).
 */
export async function mountScene(app: Application, scene: SceneData): Promise<Scene> {
  const screen: Size = { width: app.screen.width, height: app.screen.height }
  const depthScale = resolveDepthScale(scene.depth, screen.height)

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

  for (const layer of scene.layers) {
    const display = await buildLayer(layer, screen)
    if (layer.band === 'mid' && layer.anchorYFrac !== undefined) {
      const anchorY = layer.anchorYFrac * screen.height
      display.zIndex = anchorY
      display.scale.set(depthScaleAt(anchorY, depthScale))
    }
    bandFor(layer.band).addChild(display)
  }

  const walkable: WalkArea = { polygon: resolvePolygon(scene.walkable, screen) }
  const character = new Character(createCubeView(), depthScale, walkable)
  interactive.addChild(character.displayObject)
  character.setPosition(scene.spawn.xFrac * screen.width, scene.spawn.yFrac * screen.height)

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
    async show(scene) {
      current?.destroy()
      current = undefined
      const mounted = await mountScene(app, scene)
      if (destroyed) {
        mounted.destroy()
        return
      }
      current = mounted
    },
    destroy() {
      destroyed = true
      current?.destroy()
      current = undefined
    },
  }
}
