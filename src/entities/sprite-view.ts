import { AnimatedSprite, Assets, Container, Rectangle, Texture } from 'pixi.js'
import type { CharacterView } from './character-view'
import type { Facing, MoveState } from '../systems/movement'
import type { ViewDescriptor } from '../data/schema'

const WESTWARD: ReadonlySet<Facing> = new Set<Facing>(['W', 'NW', 'SW'])

/**
 * An `AnimatedSprite` character view built from a baked atlas + a `ViewDescriptor`
 * (state → clip). Swapping the placeholder cube for this is a data change here, not
 * a logic refactor (character.ts drives it via the `CharacterView` interface). M5.1:
 * idle / walk clips keyed by `MoveState`; facing is a horizontal mirror — real
 * 8-direction frames come in M5.2. The sprite is a child of `container`, so the
 * mirror (`scale.x`) is independent of the depth scale logic applies to `container`.
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

  const initial = clipTextures.idle ?? Object.values(clipTextures)[0] ?? [Texture.WHITE]
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
  setClip('idle')

  return {
    container,
    setPose(state: MoveState, facing: Facing) {
      setClip(desc.clips[state] ? state : 'idle')
      sprite.scale.x = WESTWARD.has(facing) ? -1 : 1
    },
    destroy() {
      container.destroy({ children: true })
    },
  }
}
