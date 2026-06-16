import { Howl, Howler } from 'howler'
import { ambientUri, footstepUri } from './sounds'
import { BUILTIN_SOUND_IDS } from './builtin-sounds'
import { storyStore } from '../state/story'
import { gameDoc } from '../data/game'
import type { SoundAsset, SoundConfig } from '../data/schema'

/**
 * Audio lives outside Pixi and reacts to discrete state + the scene (architecture.md).
 * The scene drives the **ambient** loop (per-scene, M9) and **footsteps** (a cadence
 * while the player walks); picking up an item / changing scene still play built-in
 * feedback blips. Set up once at module load; the menu toggles mute.
 *
 * Browsers block autoplay until a user gesture — we track `unlocked` and (re)start the
 * ambient + footsteps on the first one.
 */
let muted = false
let unlocked = false

export function setMuted(value: boolean): void {
  muted = value
  Howler.mute(value)
}

export function isMuted(): boolean {
  return muted
}

// --- Sound library (M9 9b): every sound field references a SoundId ----------
let soundLib: Record<string, SoundAsset> = gameDoc.sounds ?? {}

/** Point the resolver at a document's sound library (id → clip). */
export function setSoundLibrary(lib: Record<string, SoundAsset> | undefined): void {
  soundLib = lib ?? {}
}

/** Resolve a `SoundId` to its clip src (undefined if not in the library). */
export function resolveSrc(id: string | undefined): string | undefined {
  return id ? soundLib[id]?.src : undefined
}

/** Play a library sound by id (a `playSound` effect / inspect audio). No-op if unknown. */
export function playSoundById(id: string | undefined): void {
  const src = resolveSrc(id)
  if (src) playClip(src)
}

/** Derive a Howler `format` from a `data:audio/<x>` mime (so it can decode data-URIs). */
function formatFor(src: string): string[] | undefined {
  const mime = /^data:audio\/([a-z0-9]+)/i.exec(src)?.[1]?.toLowerCase()
  const format = mime === 'mpeg' ? 'mp3' : mime
  return format ? [format] : undefined
}

/**
 * Play an arbitrary clip (e.g. an uploaded inspect voice / a `playSound` effect) from a
 * URL / data-URL. Howls are cached by `src` so repeated plays don't re-decode.
 */
const clips = new Map<string, Howl>()
export function playClip(src: string): void {
  let howl = clips.get(src)
  if (!howl) {
    howl = new Howl({ src: [src], format: formatFor(src), volume: 0.8 })
    clips.set(src, howl)
  }
  howl.stop()
  howl.play()
}

// --- Ambient loops (channels, M9 + M10) -------------------------------------
// One channel per concurrent looping bed: `'scene'` (the scene/doc ambient) + `'weather'`
// (a weather preset's rain/wind loop), so they play together.
interface AmbientChannel {
  howl: Howl | null
  src: string | null
}
const ambientChannels = new Map<string, AmbientChannel>()

function ambientChannel(id: string): AmbientChannel {
  let c = ambientChannels.get(id)
  if (!c) {
    c = { howl: null, src: null }
    ambientChannels.set(id, c)
  }
  return c
}

/** Switch a looping ambient bed on its channel. `null` stops it; the same src is a no-op
 *  (seamless across a scene swap). Starts only once audio is `unlocked` (a user gesture). */
export function setAmbient(channel: string, src: string | null, volume = 0.4): void {
  const c = ambientChannel(channel)
  if (src === c.src) {
    c.howl?.volume(volume)
    return
  }
  c.howl?.stop()
  c.howl?.unload()
  c.src = src
  c.howl = src ? new Howl({ src: [src], format: formatFor(src), loop: true, volume }) : null
  if (c.howl && unlocked) c.howl.play()
}

// --- Footsteps (a cadence while walking, M9) --------------------------------
// One channel per walker (`'player'` + each NPC id), so several characters can each have
// their own footstep sound playing as they move (M9 9c).
const STEP_MS = 330
interface FootChannel {
  howl: Howl | null
  src: string | null
  moving: boolean
  timer: number | null
}
const footChannels = new Map<string, FootChannel>()

function footChannel(id: string): FootChannel {
  let c = footChannels.get(id)
  if (!c) {
    c = { howl: null, src: null, moving: false, timer: null }
    footChannels.set(id, c)
  }
  return c
}

function syncFootChannel(c: FootChannel): void {
  const shouldRun = c.moving && unlocked && !!c.howl
  if (shouldRun && c.timer === null) {
    c.howl?.play() // first step lands immediately
    c.timer = window.setInterval(() => c.howl?.play(), STEP_MS)
  } else if (!shouldRun && c.timer !== null) {
    window.clearInterval(c.timer)
    c.timer = null
  }
}

/** Set (or clear, with `null`) a walker's footstep sound. */
export function setFootstepSound(id: string, src: string | null, volume = 0.5): void {
  const c = footChannel(id)
  if (src === c.src) {
    c.howl?.volume(volume)
    return
  }
  c.howl?.unload()
  c.src = src
  c.howl = src ? new Howl({ src: [src], format: formatFor(src), volume }) : null
  syncFootChannel(c)
}

/** Tell the audio whether a walker is moving — starts / stops its footstep cadence. */
export function setFootstepsMoving(id: string, moving: boolean): void {
  const c = footChannel(id)
  if (moving === c.moving) return
  c.moving = moving
  syncFootChannel(c)
}

/**
 * Apply a scene's audio in one call (the scene resolves `ambient` against state first):
 * the ambient bed (the resolved scene/doc ambient, else a procedural drone) + the
 * footstep sound (the doc footstep, else a procedural step; or off). Called on each
 * scene mount; footstep *movement* is driven per-frame via `setFootstepsMoving`.
 */
export function applySceneAudio(opts: {
  ambient?: SoundConfig
  footstep?: SoundConfig
  footstepsOff?: boolean
}): void {
  setAmbient('scene', resolveSrc(opts.ambient?.sound) ?? ambientUri, opts.ambient?.volume ?? 0.4)
  if (opts.footstepsOff) setFootstepSound('player', null)
  else
    setFootstepSound(
      'player',
      resolveSrc(opts.footstep?.sound) ?? footstepUri,
      opts.footstep?.volume ?? 0.5,
    )
}

// SFX as a side-effect of discrete state changes — both library sounds (the doc's
// pickup / transition, else the built-in), so they're authorable like everything else.
let prev = storyStore.getState()
storyStore.subscribe(() => {
  const next = storyStore.getState()
  if (next.inventory.length > prev.inventory.length)
    playSoundById(gameDoc.pickupSound ?? BUILTIN_SOUND_IDS.pickup)
  if (next.currentScene !== prev.currentScene)
    playSoundById(gameDoc.transitionSound ?? BUILTIN_SOUND_IDS.transition)
  prev = next
})

// First user gesture unlocks autoplay — start whatever the scene has set up.
window.addEventListener(
  'pointerdown',
  () => {
    unlocked = true
    for (const c of ambientChannels.values()) if (c.howl && !c.howl.playing()) c.howl.play()
    for (const c of footChannels.values()) syncFootChannel(c)
  },
  { once: true },
)
