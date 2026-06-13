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
import { effectsFor, effectsForUse, pickInteractable } from '../systems/interactions'
import { checkCondition, type StoryState, type StoryStore } from '../systems/conditions'
import type { Condition, LayerData, SceneBand, SceneData, SceneId } from '../data/schema'

/** Viewport size in CSS pixels. */
export interface Size {
  width: number
  height: number
}

/** The slice of the story store the engine needs: read state + react to it. */
export interface SceneStore {
  getState(): StoryStore
  subscribe(listener: () => void): () => void
}

/**
 * Builds a geometric placeholder layer (a `builtin` LayerData) from screen size
 * + the layer's numeric params. Registered by key; real art uses `image` layers
 * instead. Scenes register their builders at module load (see scenes/*.ts).
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

/** Keeps the displayed scene in sync with the store's current scene. */
export interface SceneHost {
  destroy(): void
}

/** Resolve a fractional polygon to pixels against the screen. */
function resolvePolygon(frac: readonly number[], { width, height }: Size): number[] {
  return frac.map((v, i) => v * (i % 2 === 0 ? width : height))
}

/** Size + place an `image` layer's sprite per its `fit` (default 'none'). */
function fitImageSprite(
  sprite: Sprite,
  layer: Extract<LayerData, { kind: 'image' }>,
  screen: Size,
): void {
  const fit = layer.fit ?? 'none'
  if (fit === 'stretch') {
    sprite.anchor.set(0, 0)
    sprite.position.set(0, 0)
    sprite.width = screen.width
    sprite.height = screen.height
    return
  }
  if (fit === 'cover' || fit === 'contain') {
    const sx = screen.width / sprite.texture.width
    const sy = screen.height / sprite.texture.height
    sprite.anchor.set(0.5, 0.5)
    sprite.scale.set(fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy))
    sprite.position.set(screen.width / 2, screen.height / 2)
    return
  }
  // 'none' — natural size, centered on (xFrac, yFrac).
  sprite.anchor.set(0.5, 0.5)
  sprite.position.set((layer.xFrac ?? 0.5) * screen.width, (layer.yFrac ?? 0.5) * screen.height)
}

async function buildLayer(layer: LayerData, screen: Size): Promise<Container> {
  if (layer.kind === 'image') {
    const texture = await Assets.load(layer.src)
    const sprite = new Sprite(texture)
    fitImageSprite(sprite, layer, screen)
    return sprite
  }
  const build = builders.get(layer.builder)
  if (!build) throw new Error(`Unknown layer builder: "${layer.builder}"`)
  return build(screen, layer.params ?? {})
}

/**
 * Mounts a `SceneData` onto an initialised Application as three zIndex-ordered
 * bands — background < interactive (mid) < foreground occluder. A click either
 * runs the topmost interactable under it (after walking there) or just walks the
 * character. Layers with a `when` Condition toggle visibility as state changes
 * (e.g. a picked-up item vanishes). Positions in the data are screen fractions.
 */
export async function mountScene(
  app: Application,
  scene: SceneData,
  store: SceneStore,
): Promise<Scene> {
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

  // Layers whose `when` toggles their visibility as story state changes.
  const conditional: { display: Container; when: Condition }[] = []

  for (const layer of scene.layers) {
    const display = await buildLayer(layer, screen)
    if (layer.band === 'mid' && layer.anchorYFrac !== undefined) {
      const anchorY = layer.anchorYFrac * screen.height
      display.zIndex = anchorY
      display.scale.set(depthScaleAt(anchorY, depthScale))
    }
    if (layer.when) {
      display.visible = checkCondition(store.getState(), layer.when)
      conditional.push({ display, when: layer.when })
    }
    bandFor(layer.band).addChild(display)
  }

  const refreshVisibility = () => {
    const state = store.getState()
    for (const c of conditional) c.display.visible = checkCondition(state, c.when)
  }
  const unsubscribeVisibility =
    conditional.length > 0 ? store.subscribe(refreshVisibility) : () => {}

  const walkable: WalkArea = { polygon: resolvePolygon(scene.walkable, screen) }
  const character = new Character(createCubeView(), depthScale, walkable)
  interactive.addChild(character.displayObject)
  character.setPosition(scene.spawn.xFrac * screen.width, scene.spawn.yFrac * screen.height)

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  app.stage.cursor = 'pointer'
  const onTap = (event: FederatedPointerEvent) => {
    const local = interactive.toLocal(event.global)
    const state = store.getState()
    const hit = pickInteractable(scene.interactables, local.x, local.y, screen, state)
    const selected = state.selectedItem
    if (selected) store.getState().select(null) // any click consumes the selection

    // Using the selected item on the object (if it has a matching rule).
    if (hit && selected) {
      const usageEffects = effectsForUse(hit, selected)
      if (usageEffects) {
        character.setTarget(local.x, local.y, () => store.getState().run(usageEffects))
        return
      }
    }
    // Otherwise: walk to the interactable and run its plain effects, or just walk.
    if (hit) {
      const effects = effectsFor(hit)
      character.setTarget(local.x, local.y, () => store.getState().run(effects))
    } else {
      character.setTarget(local.x, local.y)
    }
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
      unsubscribeVisibility()
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

/**
 * Renders a scene's layers for the editor preview — visuals at the initial story
 * state, plus a static character placeholder at the spawn point. No gameplay
 * input or ticker; it's a still picture of the authored scene.
 */
export async function mountPreview(app: Application, scene: SceneData): Promise<Scene> {
  const screen: Size = { width: app.screen.width, height: app.screen.height }
  const depthScale = resolveDepthScale(scene.depth, screen.height)
  const state: StoryState = {
    currentScene: scene.id,
    flags: {},
    inventory: [],
    visited: [],
    selectedItem: null,
  }

  app.stage.sortableChildren = true
  const background = new Container()
  background.zIndex = 0
  const interactive = new Container()
  interactive.zIndex = 10
  interactive.sortableChildren = true
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
    if (layer.when) display.visible = checkCondition(state, layer.when)
    bandFor(layer.band).addChild(display)
  }

  // Static character placeholder at the spawn point (shows scale + position).
  const view = createCubeView()
  const feetX = scene.spawn.xFrac * screen.width
  const feetY = scene.spawn.yFrac * screen.height
  view.container.position.set(feetX, feetY)
  view.container.scale.set(depthScaleAt(feetY, depthScale))
  view.container.zIndex = feetY
  view.setPose('idle', 'S')
  interactive.addChild(view.container)

  let torn = false
  return {
    destroy() {
      if (torn) return
      torn = true
      app.stage.sortableChildren = false
      view.destroy()
      background.destroy({ children: true })
      interactive.destroy({ children: true })
      foreground.destroy({ children: true })
    },
  }
}

/**
 * Mounts whichever scene the store says is current, and swaps when it changes.
 * Swaps are deferred to a microtask so a transition fired from inside the ticker
 * (a click → walk → goTo) tears the old scene down *after* the frame, never
 * mid-update.
 */
export function createSceneHost(
  app: Application,
  scenes: Record<SceneId, SceneData>,
  store: SceneStore,
): SceneHost {
  let current: Scene | undefined
  let destroyed = false
  let shownId: SceneId | undefined

  async function show(id: SceneId): Promise<void> {
    if (destroyed || id === shownId) return
    shownId = id
    current?.destroy()
    current = undefined
    const mounted = await mountScene(app, scenes[id], store)
    if (destroyed || shownId !== id) {
      mounted.destroy()
      return
    }
    current = mounted
  }

  const sync = () => {
    const id = store.getState().currentScene
    if (id !== shownId) queueMicrotask(() => void show(id))
  }

  sync() // initial mount
  const unsubscribe = store.subscribe(sync)

  return {
    destroy() {
      destroyed = true
      unsubscribe()
      current?.destroy()
      current = undefined
    },
  }
}
