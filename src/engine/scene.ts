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
import { cameraOffset } from './camera'
import { createSpriteView } from '../entities/sprite-view'
import { placeholderView } from '../entities/placeholder-atlas'
import { resolveDepthScale, designSize, DEFAULT_REFERENCE_HEIGHT } from '../data/scene-config'
import { depthScaleAt } from '../systems/depth'
import { buildNavigation } from '../systems/navmesh'
import { effectsFor, effectsForUse, pickInteractable } from '../systems/interactions'
import { containsPoint } from '../systems/walkable'
import { checkCondition, type StoryState, type StoryStore } from '../systems/conditions'
import type {
  Condition,
  Effect,
  InteractableData,
  LayerData,
  NpcDef,
  NpcId,
  NpcPath,
  SceneBand,
  SceneData,
  SceneId,
  TransitionConfig,
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

/** Drive a placed NPC along its patrol route (once / loop / pingpong). Each leg is
 *  nav-routed (so it rounds holes), chained via the character's onArrive callback. */
function startNpcPath(npc: Character, path: NpcPath | undefined, design: Size): void {
  if (!path || path.points.length < 4) return
  const pts: { x: number; y: number }[] = []
  for (let i = 0; i + 1 < path.points.length; i += 2) {
    pts.push({ x: path.points[i] * design.width, y: path.points[i + 1] * design.height })
  }
  let idx = 0
  let dir = 1
  const advance = () => {
    if (path.mode === 'once') {
      if (idx >= pts.length - 1) return
      idx += 1
    } else if (path.mode === 'loop') {
      idx = (idx + 1) % pts.length
    } else {
      if (idx === 0) dir = 1
      else if (idx === pts.length - 1) dir = -1
      idx += dir
    }
    npc.setTarget(pts[idx].x, pts[idx].y, advance)
  }
  npc.setTarget(pts[0].x, pts[0].y, advance)
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
  referenceHeight: number = DEFAULT_REFERENCE_HEIGHT,
  cast: Record<NpcId, NpcDef> = {},
): Promise<Scene> {
  // Design space vs viewport: the scene is authored in a fixed design space
  // (`scene.width` × `referenceHeight` px). The world Container holds it; the camera
  // (below) fits the design *height* to the viewport with one uniform scale, then
  // scrolls the width to follow the character — so fractions resolve against the
  // design, and characters/art keep one size across resolutions.
  const design: Size = designSize(scene, referenceHeight)
  const depthScale = resolveDepthScale(scene.depth, design.height)

  app.stage.sortableChildren = true
  const world = new Container()
  world.sortableChildren = true
  app.stage.addChild(world)
  const background = new Container()
  background.zIndex = 0
  const interactive = new Container()
  interactive.zIndex = 10
  interactive.sortableChildren = true // Y-sort by feet Y happens in here
  const foreground = new Container()
  foreground.zIndex = 20
  world.addChild(background, interactive, foreground)

  const bandFor = (band: SceneBand): Container =>
    band === 'background' ? background : band === 'foreground' ? foreground : interactive

  // Layers whose `when` toggles their visibility as story state changes.
  const conditional: { display: Container; when: Condition }[] = []
  // Background / foreground layers that scroll at their own rate (parallax).
  const parallaxLayers: { display: Container; baseX: number; baseY: number; p: number }[] = []

  for (const layer of scene.layers) {
    const display = await buildLayer(layer, design)
    if (layer.band === 'mid' && layer.anchorYFrac !== undefined) {
      const anchorY = layer.anchorYFrac * design.height
      display.zIndex = anchorY
      display.scale.set(depthScaleAt(anchorY, depthScale))
    }
    if (layer.when) {
      display.visible = checkCondition(store.getState(), layer.when)
      conditional.push({ display, when: layer.when })
    }
    const p = layer.parallax ?? 1
    if (p !== 1 && layer.band !== 'mid') {
      parallaxLayers.push({ display, baseX: display.position.x, baseY: display.position.y, p })
    }
    bandFor(layer.band).addChild(display)
  }

  const refreshVisibility = () => {
    const state = store.getState()
    for (const c of conditional) c.display.visible = checkCondition(state, c.when)
  }
  // Subscribe unconditionally — NPCs (below) may add conditional entries after this.
  const unsubscribeVisibility = store.subscribe(refreshVisibility)

  const walkablePx = resolvePolygon(scene.walkable, design)
  const holesPx = (scene.holes ?? []).map((h) => resolvePolygon(h, design))
  const nav = buildNavigation(walkablePx, holesPx) // shared by the player + every NPC
  const charScale = scene.characterScale ?? 1
  const character = new Character(await createSpriteView(playerView), depthScale, nav, charScale)
  interactive.addChild(character.displayObject)
  character.setPosition(scene.spawn.xFrac * design.width, scene.spawn.yFrac * design.height)

  // NPCs: characters placed in the scene (static for now; movement is step 3). They
  // share the nav-mesh + depth, Y-sort with the player, and `when` gates presence.
  const npcs: { id: string; character: Character }[] = []
  for (const placement of scene.npcs ?? []) {
    // The cast def has no appearance yet → placeholder for all; the placement's `npc`
    // is the runtime id (so `playAnim` target + future NPC triggers resolve to it).
    const npcChar = new Character(
      await createSpriteView(placeholderView),
      depthScale,
      nav,
      charScale,
    )
    const def = cast[placement.npc]
    if (def?.speed) npcChar.setSpeedScale(def.speed)
    npcChar.setPosition(placement.spawn.xFrac * design.width, placement.spawn.yFrac * design.height)
    interactive.addChild(npcChar.displayObject)
    if (placement.when) {
      npcChar.displayObject.visible = checkCondition(store.getState(), placement.when)
      conditional.push({ display: npcChar.displayObject, when: placement.when })
    }
    npcs.push({ id: placement.npc, character: npcChar })
    startNpcPath(npcChar, placement.path, design)
  }

  // Camera: height-anchored + resize-safe. Each frame we read the *current*
  // viewport (so a window resize re-fits with no re-mount), scale the world so the
  // design height fills it, then pan horizontally to keep the character centred —
  // clamped to the world bounds, or centred (pillar-boxed) when the world is
  // narrower than the viewport. `cameraOffset` lets the DOM cursor invert this.
  const place = (content: number, viewport: number, target: number): number =>
    content <= viewport
      ? (viewport - content) / 2
      : Math.max(viewport - content, Math.min(0, viewport / 2 - target))
  const updateCamera = () => {
    const s = app.screen.height / design.height
    world.scale.set(s)
    const x = place(design.width * s, app.screen.width, character.displayObject.x * s)
    const y = place(design.height * s, app.screen.height, character.displayObject.y * s)
    world.position.set(x, y)
    cameraOffset.x = x
    cameraOffset.y = y
    cameraOffset.scale = s
    // Parallax: shift each layer back toward rest by (1 − p) of the pan, so far
    // layers (p < 1) scroll slower and near ones (p > 1) faster. In world-local
    // (design) px, hence ÷ s.
    for (const pl of parallaxLayers) {
      pl.display.position.x = pl.baseX + ((1 - pl.p) * -x) / s
      pl.display.position.y = pl.baseY + ((1 - pl.p) * -y) / s
    }
  }
  updateCamera()

  // Effects from a click or trigger: engine effects (sound / animation) run here;
  // the rest go to the story store (state effects). Keeps transient engine actions
  // out of the discrete state.
  const runEffects = (effects: readonly Effect[]) => {
    for (const e of effects) {
      if (e.kind === 'playSound') void import('../audio/audio').then((m) => m.playClip(e.sound))
      else if (e.kind === 'playAnim') {
        const target = e.target ?? 'player'
        if (target === 'player') character.playOnce(e.action)
        else npcs.find((n) => n.id === target)?.character.playOnce(e.action)
      }
    }
    store.getState().run(effects)
  }

  // Trigger volumes: run effects when the player's feet ENTER (debounced to the enter
  // edge; `once` stops a re-fire this visit). NPC triggers wait for NPCs (step 2+).
  const triggers = scene.interactables
    .filter((it): it is Extract<InteractableData, { kind: 'trigger' }> => it.kind === 'trigger')
    .map((it) => ({
      data: it,
      polygon: resolvePolygon(it.hitArea, design),
      inside: new Set<string>(), // ids of characters currently inside (per-character edge)
      fired: false,
    }))
  const checkTriggers = () => {
    if (triggers.length === 0) return
    const state = store.getState()
    for (const t of triggers) {
      const by = t.data.by ?? 'player'
      const movers: { id: string; c: Character }[] = []
      if (by === 'player' || by === 'any') movers.push({ id: 'player', c: character })
      if (by === 'npc' || by === 'any')
        for (const n of npcs) movers.push({ id: n.id, c: n.character })
      for (const m of movers) {
        const now = containsPoint({ polygon: t.polygon }, m.c.displayObject.x, m.c.displayObject.y)
        if (now && !t.inside.has(m.id) && !(t.data.once && t.fired)) {
          if (!t.data.when || checkCondition(state, t.data.when)) {
            runEffects(t.data.effects)
            t.fired = true
          }
        }
        if (now) t.inside.add(m.id)
        else t.inside.delete(m.id)
      }
    }
  }

  app.stage.eventMode = 'static'
  app.stage.hitArea = app.screen
  app.stage.cursor = 'none' // the DOM GameCursor draws the pointer; hide the native one
  const onTap = (event: FederatedPointerEvent) => {
    const local = interactive.toLocal(event.global)
    const state = store.getState()
    const hit = pickInteractable(scene.interactables, local.x, local.y, design, state)
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
        character.setTarget(local.x, local.y, () => runEffects(usageEffects), 'interact')
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
      character.setTarget(local.x, local.y, () => runEffects(effects), ONE_SHOT[hit.kind])
    } else {
      character.setTarget(local.x, local.y)
    }
  }
  app.stage.on('pointertap', onTap)

  const onTick = (ticker: Ticker) => {
    character.update(ticker.deltaMS)
    for (const n of npcs) n.character.update(ticker.deltaMS)
    updateCamera()
    checkTriggers()
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
      for (const n of npcs) n.character.destroy()
      world.destroy({ children: true })
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
    if (!display.parent) return
    dragging = true
    // Work in the parent's (design) space, so the drag tracks the pointer through
    // the preview's fit scale.
    const p = display.parent.toLocal(e.global)
    grabX = display.position.x - p.x
    grabY = display.position.y - p.y
  })
  display.on('globalpointermove', (e: FederatedPointerEvent) => {
    if (!dragging || !display.parent) return
    const p = display.parent.toLocal(e.global)
    const x = axis === 'y' ? display.position.x : clamp(p.x + grabX, screen.width)
    display.position.set(x, clamp(p.y + grabY, screen.height))
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
  referenceHeight: number = DEFAULT_REFERENCE_HEIGHT,
): Promise<Scene> {
  const design: Size = designSize(scene, referenceHeight)
  const depthScale = resolveDepthScale(scene.depth, design.height)
  const state: StoryState = {
    currentScene: scene.id,
    flags: {},
    inventory: [],
    visited: [],
    selectedItem: null,
  }

  // Build in design px inside a `root` we scale to fit the (design-aspect) preview
  // box. So the canvas stays aligned with the DOM overlays at any panel size and
  // re-fits on resize without a re-mount — mirroring the in-game camera, sans scroll.
  app.stage.sortableChildren = true
  const root = new Container()
  root.sortableChildren = true
  app.stage.addChild(root)
  const background = new Container()
  background.zIndex = 0
  const interactive = new Container()
  interactive.zIndex = 10
  interactive.sortableChildren = true
  const foreground = new Container()
  foreground.zIndex = 20
  root.addChild(background, interactive, foreground)

  const bandFor = (band: SceneBand): Container =>
    band === 'background' ? background : band === 'foreground' ? foreground : interactive

  for (let i = 0; i < scene.layers.length; i += 1) {
    const layer = scene.layers[i]
    const display = await buildLayer(layer, design)
    if (layer.band === 'mid' && layer.anchorYFrac !== undefined) {
      const anchorY = layer.anchorYFrac * design.height
      display.zIndex = anchorY
      display.scale.set(depthScaleAt(anchorY, depthScale))
    }
    if (layer.when) display.visible = checkCondition(state, layer.when)
    // Editor: drag image layers to place them — `none` freely, `width` on Y only.
    if (opts.onLayerMove && layer.kind === 'image') {
      const fit = layer.fit ?? 'none'
      if (fit === 'none') makeLayerDraggable(display, i, design, opts.onLayerMove, 'xy')
      else if (fit === 'width') makeLayerDraggable(display, i, design, opts.onLayerMove, 'y')
    }
    bandFor(layer.band).addChild(display)
  }

  // Static character placeholder at the spawn point (shows scale + position); the
  // `root` fit below gives it the same on-screen size fraction as the game.
  const view = await createSpriteView(playerView)
  const feetX = scene.spawn.xFrac * design.width
  const feetY = scene.spawn.yFrac * design.height
  view.container.position.set(feetX, feetY)
  view.container.scale.set(depthScaleAt(feetY, depthScale) * (scene.characterScale ?? 1))
  view.container.zIndex = feetY
  view.setPose('idle', 'S')
  interactive.addChild(view.container)

  // Fit the design height into the preview box; re-fit when the canvas resizes
  // (panel drag / window) so the content keeps tracking the DOM overlays.
  const refit = () => root.scale.set(app.screen.height / design.height)
  refit()
  const ro = new ResizeObserver(refit)
  ro.observe(app.canvas)

  let torn = false
  return {
    destroy() {
      if (torn) return
      torn = true
      ro.disconnect()
      app.stage.sortableChildren = false
      view.destroy()
      root.destroy({ children: true })
    },
  }
}

/** Fade duration each way, in ms; and how long a mount may run before the loading
 *  spinner appears (so quick swaps stay clean). */
const FADE_MS = 180
const SPINNER_DELAY_MS = 220

/**
 * Mounts whichever scene the store says is current, and swaps when it changes.
 * Swaps **fade through a wash** (`GameDoc.transition`: colour / art / min hold;
 * default black) — fade out → destroy + mount → fade in — so the async mount and the
 * hard cut are hidden (no blank frame), and a slow mount shows a loading spinner.
 * The first scene fades in. Swaps are deferred to a microtask so a transition fired
 * from inside the ticker (click → walk → goTo) never tears the old scene down mid-update.
 */
export function createSceneHost(
  app: Application,
  scenes: Record<SceneId, SceneData>,
  store: SceneStore,
  playerView: ViewDescriptor = placeholderView,
  referenceHeight: number = DEFAULT_REFERENCE_HEIGHT,
  transition?: TransitionConfig,
  cast: Record<NpcId, NpcDef> = {},
): SceneHost {
  let current: Scene | undefined
  let destroyed = false
  let shownId: SceneId | undefined

  // The overlay swaps cross through: a colour wash (default black) + optional art,
  // animated on the ticker. Starts opaque so the first mount fades in. A huge rect
  // covers any viewport size.
  app.stage.sortableChildren = true
  const fade = new Container()
  fade.zIndex = 10000
  fade.eventMode = 'none'
  fade.alpha = 1
  const wash = new Graphics()
    .rect(-5000, -5000, 10000, 10000)
    .fill({ color: transition?.color ?? 0x000000 })
  fade.addChild(wash)
  app.stage.addChild(fade)

  // Optional transition art, centred + covering the viewport (placed each tick).
  let art: Sprite | undefined
  if (transition?.image) {
    void Assets.load(transition.image).then((tex) => {
      if (destroyed) return
      art = new Sprite(tex)
      art.anchor.set(0.5)
      fade.addChild(art)
    })
  }

  // Loading spinner — a rotating arc in the corner, above the wash, shown only when
  // a mount outlasts SPINNER_DELAY_MS.
  const spinner = new Graphics()
    .arc(0, 0, 13, 0, Math.PI * 1.5)
    .stroke({ width: 3, color: 0xffffff, alpha: 0.85, cap: 'round' })
  spinner.zIndex = 10001
  spinner.eventMode = 'none'
  spinner.visible = false
  app.stage.addChild(spinner)

  let fadeTarget = 1
  let fadeResolve: (() => void) | null = null
  const onFadeTick = (ticker: Ticker) => {
    if (spinner.visible) {
      spinner.position.set(app.screen.width - 38, app.screen.height - 38)
      spinner.rotation += ticker.deltaMS / 110
    }
    if (art && fade.alpha > 0) {
      art.position.set(app.screen.width / 2, app.screen.height / 2)
      art.scale.set(
        Math.max(app.screen.width / art.texture.width, app.screen.height / art.texture.height),
      )
    }
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
    if (current) await fadeTo(1) // fade out (the first scene is already washed)
    if (destroyed) return
    current?.destroy()
    current = undefined
    // The fade-in never starts until the new scene (and its assets) is fully mounted;
    // a slow mount raises the spinner, and `minMs` can hold a styled wash longer.
    const startedAt = performance.now()
    const spinTimer = setTimeout(() => {
      if (!destroyed) spinner.visible = true
    }, SPINNER_DELAY_MS)
    const mounted = await mountScene(app, scenes[id], store, playerView, referenceHeight, cast)
    clearTimeout(spinTimer)
    spinner.visible = false
    if (destroyed || shownId !== id) {
      mounted.destroy()
      return
    }
    const wait = (transition?.minMs ?? 0) - (performance.now() - startedAt)
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
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
      spinner.destroy()
      fade.destroy({ children: true })
    },
  }
}
