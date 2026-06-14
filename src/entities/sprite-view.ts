import { AnimatedSprite, Assets, Container, Rectangle, Texture } from 'pixi.js'
import type { CharacterView } from './character-view'
import type { Facing, MoveState } from '../systems/movement'
import type { ViewDescriptor } from '../data/schema'

/** Each facing → the base direction whose clips it uses (W-side mirrors E-side). */
const BASE_FACING: Record<Facing, Facing> = {
  E: 'E',
  W: 'E',
  SE: 'SE',
  SW: 'SE',
  NE: 'NE',
  NW: 'NE',
  S: 'S',
  N: 'N',
}
const MIRRORED: ReadonlySet<Facing> = new Set<Facing>(['W', 'SW', 'NW'])

/**
 * An `AnimatedSprite` character view built from a baked atlas + a `ViewDescriptor`
 * (clips keyed `state.facing`, e.g. `walk.E`; one-shots keyed by action, e.g.
 * `pickup`). Swapping the placeholder cube for this is a data change here, not a
 * logic refactor (character.ts drives it via the `CharacterView` interface). 8
 * facings map to ~5 base directions; the W-side ones are a horizontal mirror
 * (`sprite.scale.x`), independent of the depth scale logic applies to `container`.
 */
export async function createSpriteView(desc: ViewDescriptor): Promise<CharacterView> {
  const sheet = await Assets.load<Texture>(desc.atlas)
  const source = sheet.source
  const cols = desc.columns
  const frameTexture = (i: number): Texture =>
    new Texture({
      source,
      frame: new Rectangle(
        (i % cols) * desc.frameWidth,
        Math.floor(i / cols) * desc.frameHeight,
        desc.frameWidth,
        desc.frameHeight,
      ),
    })

  const clipTextures: Record<string, Texture[]> = {}
  for (const [name, clip] of Object.entries(desc.clips)) {
    clipTextures[name] = clip.frames.map(frameTexture)
  }

  const initial = Object.values(clipTextures)[0] ?? [Texture.WHITE]
  const sprite = new AnimatedSprite(initial)
  sprite.anchor.set(desc.anchorX, desc.anchorY)

  const container = new Container()
  container.addChild(sprite)

  let current = ''
  // While a one-shot plays, the looping pose is locked out (the callback fires on
  // completion). A new walk cancels it without completing.
  let oneShot: (() => void) | null = null

  const setClip = (name: string): void => {
    const clip = desc.clips[name]
    if (!clip || name === current) return
    current = name
    sprite.textures = clipTextures[name]
    sprite.animationSpeed = clip.fps / 60
    sprite.loop = clip.loop
    sprite.gotoAndPlay(0)
  }

  const mirror = (facing: Facing): void => {
    sprite.scale.x = MIRRORED.has(facing) ? -1 : 1
  }

  const resolveKey = (state: MoveState, base: Facing): string => {
    if (desc.clips[`${state}.${base}`]) return `${state}.${base}`
    if (desc.clips[state]) return state
    if (desc.clips[`idle.${base}`]) return `idle.${base}`
    if (desc.clips.idle) return 'idle'
    return Object.keys(desc.clips)[0] ?? ''
  }

  const applyPose = (state: MoveState, facing: Facing): void => {
    if (oneShot) {
      if (state !== 'walk') {
        mirror(facing) // still idle — keep the one-shot playing, just turn
        return
      }
      // interrupted by a new walk — cancel the one-shot (no completion)
      sprite.onComplete = undefined
      sprite.loop = true
      oneShot = null
      current = ''
    }
    setClip(resolveKey(state, BASE_FACING[facing]))
    mirror(facing)
  }
  applyPose('idle', 'S')

  return {
    container,
    setPose: applyPose,
    playOnce(action, facing, onComplete) {
      const base = BASE_FACING[facing]
      const key = desc.clips[`${action}.${base}`]
        ? `${action}.${base}`
        : desc.clips[action]
          ? action
          : ''
      const clip = key ? desc.clips[key] : undefined
      if (!clip) {
        onComplete() // no clip for this action — resolve immediately
        return
      }
      oneShot = onComplete
      current = key
      sprite.textures = clipTextures[key]
      sprite.animationSpeed = clip.fps / 60
      sprite.loop = false
      mirror(facing)
      sprite.onComplete = () => {
        sprite.onComplete = undefined
        sprite.loop = true
        const done = oneShot
        oneShot = null
        current = ''
        done?.()
      }
      sprite.gotoAndPlay(0)
    },
    loopAction(action, facing) {
      const base = BASE_FACING[facing]
      const key = desc.clips[`${action}.${base}`]
        ? `${action}.${base}`
        : desc.clips[action]
          ? action
          : ''
      if (!key) {
        applyPose('idle', facing) // no clip for this action — fall back to idle
        return
      }
      // Already looping this clip (a held stance re-applied each frame) → just face,
      // don't restart it.
      if (key === current && !oneShot) {
        mirror(facing)
        return
      }
      // Cancel any in-flight one-shot, then play `key` forced to loop. `current` is
      // set so the next setPose (a different key) switches cleanly off it.
      sprite.onComplete = undefined
      oneShot = null
      current = key
      sprite.textures = clipTextures[key]
      sprite.animationSpeed = desc.clips[key].fps / 60
      sprite.loop = true
      mirror(facing)
      sprite.gotoAndPlay(0)
    },
    destroy() {
      container.destroy({ children: true })
    },
  }
}
