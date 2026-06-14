import {
  Assets,
  Container,
  Graphics,
  Sprite,
  type Application,
  type FederatedPointerEvent,
  type Ticker,
} from 'pixi.js'
import { Character } from '../entities/character'
import { createSpriteView } from '../entities/sprite-view'
import { placeholderView } from '../entities/placeholder-atlas'
import { resolveDepthScale } from '../data/scene-config'
import { depthScaleAt } from '../systems/depth'
import type { WalkArea } from '../systems/walkable'
import { effectsFor, effectsForUse, pickInteractable } from '../systems/interactions'
import { checkCondition, type StoryState, type StoryStore } from '../systems/conditions'
import type {
  Condition,
  InteractableData,
  LayerData,
  SceneBand,
  SceneData,
  SceneId,
  ViewDescriptor,
} from '../data/schema'

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
  if (fit === 'width') {
    // Full-bleed horizontally (keeps aspect); positioned vertically via yFrac.
    sprite.anchor.set(0.5, 0.5)
    sprite.scale.set(screen.width / sprite.texture.width)
    sprite.position.set(screen.width / 2, (layer.yFrac ?? 0.5) * screen.height)
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

/** The one-shot animation a click on each interactable kind plays before its
 *  effects run (exit / inspect have none). */
const ONE_SHOT: Partial<Record<InteractableData['kind'], string>> = {
  pickable: 'pickup',
  interact: 'interact',
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
  playerView: ViewDescriptor = placeholderView,
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
  const character = new Character(await createSpriteView(playerView), depthScale, walkable)
  interactive.addChild(character.displayObject)
  character.setPosition(scene.spawn.xFrac * screen.width, scene.spawn.yFrac * screen.height)

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  app.stage.cursor = 'none' // the DOM GameCursor draws the pointer; hide the native one
  const onTap = (event: FederatedPointerEvent) => {
    const local = interactive.toLocal(event.global)
    const state = store.getState()
    const hit = pickInteractable(scene.interactables, local.x, local.y, screen, state)
    const selected = state.selectedItem
    if (selected) store.getState().select(null) // any click consumes the selection
    // "look at" flavour (inspect has its own `text`, handled below).
    if (hit && hit.kind !== 'inspect' && hit.examine && !selected) {
      store.getState().say(hit.examine)
    }

    // Using the selected item on the object (if it has a matching rule).
    if (hit && selected) {
      const usageEffects = effectsForUse(hit, selected)
      if (usageEffects) {
        character.setTarget(local.x, local.y, () => store.getState().run(usageEffects), 'interact')
        return
      }
    }
    // Walk to the interactable, then: for `inspect` the protagonist comments
    // (text + optional voice), otherwise run its effects. Or just walk.
    if (hit && hit.kind === 'inspect') {
      const { text, audio } = hit
      character.setTarget(local.x, local.y, () => {
        if (text) store.getState().say(text)
        // Dynamic import keeps audio out of the editor preview's module graph.
        if (audio) void import('../audio/audio').then((m) => m.playClip(audio))
      })
    } else if (hit) {
      const effects = effectsFor(hit)
      character.setTarget(local.x, local.y, () => store.getState().run(effects), ONE_SHOT[hit.kind])
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

/** Editor preview hooks. */
export interface PreviewOptions {
  /** Called when a free-positioned image layer is dragged, with new fractions. */
  onLayerMove?: (index: number, xFrac: number, yFrac: number) => void
}

/**
 * Make an image layer draggable in the editor preview: drag to move it, then
 * commit the new fractional position on release. Only the dragged sprite moves
 * (no re-mount), so it's smooth; the store just records where it landed.
 */
function makeLayerDraggable(
  display: Container,
  index: number,
  screen: Size,
  onMove: (index: number, xFrac: number, yFrac: number) => void,
  axis: 'xy' | 'y' = 'xy',
): void {
  const clamp = (v: number, hi: number) => Math.max(0, Math.min(hi, v))
  display.eventMode = 'static'
  display.cursor = axis === 'y' ? 'ns-resize' : 'move'
  let dragging = false
  // Offset from the pointer to the sprite origin at grab time, so the layer moves
  // relative to where it was grabbed (no jump) and resumes from its saved spot.
  let grabX = 0
  let grabY = 0
  display.on('pointerdown', (e: FederatedPointerEvent) => {
    dragging = true
    grabX = display.position.x - e.global.x
    grabY = display.position.y - e.global.y
  })
  display.on('globalpointermove', (e: FederatedPointerEvent) => {
    if (!dragging) return
    const x = axis === 'y' ? display.position.x : clamp(e.global.x + grabX, screen.width)
    display.position.set(x, clamp(e.global.y + grabY, screen.height))
  })
  const drop = () => {
    if (!dragging) return
    dragging = false
    onMove(index, display.position.x / screen.width, display.position.y / screen.height)
  }
  display.on('pointerup', drop)
  display.on('pointerupoutside', drop)
}

/**
 * Renders a scene's layers for the editor preview — visuals at the initial story
 * state, plus a static character placeholder at the spawn point. No gameplay
 * ticker; optionally lets the editor drag free-positioned (`fit: none`) image
 * layers to place them.
 */
export async function mountPreview(
  app: Application,
  scene: SceneData,
  opts: PreviewOptions = {},
  playerView: ViewDescriptor = placeholderView,
): Promise<Scene> {
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

  for (let i = 0; i < scene.layers.length; i += 1) {
    const layer = scene.layers[i]
    const display = await buildLayer(layer, screen)
    if (layer.band === 'mid' && layer.anchorYFrac !== undefined) {
      const anchorY = layer.anchorYFrac * screen.height
      display.zIndex = anchorY
      display.scale.set(depthScaleAt(anchorY, depthScale))
    }
    if (layer.when) display.visible = checkCondition(state, layer.when)
    // Editor: drag image layers to place them — `none` freely, `width` on Y only.
    if (opts.onLayerMove && layer.kind === 'image') {
      const fit = layer.fit ?? 'none'
      if (fit === 'none') makeLayerDraggable(display, i, screen, opts.onLayerMove, 'xy')
      else if (fit === 'width') makeLayerDraggable(display, i, screen, opts.onLayerMove, 'y')
    }
    bandFor(layer.band).addChild(display)
  }

  // Static character placeholder at the spawn point (shows scale + position).
  const view = await createSpriteView(playerView)
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

/** Fade-to-black duration each way, in ms. */
const FADE_MS = 180

/**
 * Mounts whichever scene the store says is current, and swaps when it changes.
 * Swaps **fade through black** — fade out → destroy + mount → fade in — so the
 * async mount and the hard cut are hidden (no blank frame). The first scene fades
 * in from black. Swaps are deferred to a microtask so a transition fired from
 * inside the ticker (click → walk → goTo) never tears the old scene down mid-update.
 */
export function createSceneHost(
  app: Application,
  scenes: Record<SceneId, SceneData>,
  store: SceneStore,
  playerView: ViewDescriptor = placeholderView,
): SceneHost {
  let current: Scene | undefined
  let destroyed = false
  let shownId: SceneId | undefined

  // A black overlay above every scene, animated on the ticker. Starts opaque so
  // the first mount fades in. A huge rect so it covers any viewport size.
  app.stage.sortableChildren = true
  const fade = new Graphics().rect(-5000, -5000, 10000, 10000).fill(0x000000)
  fade.zIndex = 10000
  fade.eventMode = 'none'
  fade.alpha = 1
  app.stage.addChild(fade)

  let fadeTarget = 1
  let fadeResolve: (() => void) | null = null
  const onFadeTick = (ticker: Ticker) => {
    if (fade.alpha === fadeTarget) return
    const step = ticker.deltaMS / FADE_MS
    fade.alpha =
      fade.alpha < fadeTarget
        ? Math.min(fadeTarget, fade.alpha + step)
        : Math.max(fadeTarget, fade.alpha - step)
    if (fade.alpha === fadeTarget && fadeResolve) {
      fadeResolve()
      fadeResolve = null
    }
  }
  app.ticker.add(onFadeTick)

  const fadeTo = (target: number): Promise<void> => {
    fadeTarget = target
    if (fade.alpha === target) return Promise.resolve()
    return new Promise((resolve) => {
      fadeResolve = resolve
    })
  }

  async function show(id: SceneId): Promise<void> {
    if (destroyed || id === shownId) return
    shownId = id
    if (current) await fadeTo(1) // fade out (the first scene is already black)
    if (destroyed) return
    current?.destroy()
    current = undefined
    const mounted = await mountScene(app, scenes[id], store, playerView)
    if (destroyed || shownId !== id) {
      mounted.destroy()
      return
    }
    current = mounted
    await fadeTo(0) // fade in
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
      app.ticker.remove(onFadeTick)
      current?.destroy()
      current = undefined
      fade.destroy()
    },
  }
}
