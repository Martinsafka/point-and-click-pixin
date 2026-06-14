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
 * (clips keyed `state.facing`, e.g. `walk.E`). Swapping the placeholder cube for
 * this is a data change here, not a logic refactor (character.ts drives it via the
 * `CharacterView` interface). 8 facings map to ~5 base directions; the W-side ones
 * are a horizontal mirror (`sprite.scale.x`), independent of the depth scale logic
 * applies to `container`. Resolution falls back `state.facing → state → idle`, so
 * a state-only descriptor still works.
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
  const setClip = (name: string): void => {
    const clip = desc.clips[name]
    if (!clip || name === current) return
    current = name
    sprite.textures = clipTextures[name]
    sprite.animationSpeed = clip.fps / 60
    sprite.loop = clip.loop
    sprite.gotoAndPlay(0)
  }

  const resolveKey = (state: MoveState, base: Facing): string => {
    if (desc.clips[`${state}.${base}`]) return `${state}.${base}`
    if (desc.clips[state]) return state
    if (desc.clips[`idle.${base}`]) return `idle.${base}`
    if (desc.clips.idle) return 'idle'
    return Object.keys(desc.clips)[0] ?? ''
  }

  const applyPose = (state: MoveState, facing: Facing): void => {
    setClip(resolveKey(state, BASE_FACING[facing]))
    sprite.scale.x = MIRRORED.has(facing) ? -1 : 1
  }
  applyPose('idle', 'S')

  return {
    container,
    setPose: applyPose,
    destroy() {
      container.destroy({ children: true })
    },
  }
}
