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

// --- Ambient loop (per-scene, M9) -------------------------------------------
let ambientHowl: Howl | null = null
let ambientSrc: string | null = null

/** Switch the looping ambient bed. `null` stops it; the same src is a no-op (seamless
 *  across a scene swap). Starts only once audio is `unlocked` (a user gesture). */
export function setAmbient(src: string | null, volume = 0.4): void {
  if (src === ambientSrc) {
    if (ambientHowl) ambientHowl.volume(volume)
    return
  }
  ambientHowl?.stop()
  ambientHowl?.unload()
  ambientSrc = src
  ambientHowl = src ? new Howl({ src: [src], format: formatFor(src), loop: true, volume }) : null
  if (ambientHowl && unlocked) ambientHowl.play()
}

// --- Footsteps (a cadence while walking, M9) --------------------------------
const STEP_MS = 330
let footHowl: Howl | null = null
let footSrc: string | null = null
let footMoving = false
let footTimer: number | null = null

function stepOnce(): void {
  footHowl?.play()
}

function syncFootstepTimer(): void {
  const shouldRun = footMoving && unlocked && !!footHowl
  if (shouldRun && footTimer === null) {
    stepOnce() // first step lands immediately
    footTimer = window.setInterval(stepOnce, STEP_MS)
  } else if (!shouldRun && footTimer !== null) {
    window.clearInterval(footTimer)
    footTimer = null
  }
}

/** Set (or clear, with `null`) the footstep sound used while walking. */
export function setFootstepSound(src: string | null, volume = 0.5): void {
  if (src === footSrc) {
    footHowl?.volume(volume)
    return
  }
  footHowl?.unload()
  footSrc = src
  footHowl = src ? new Howl({ src: [src], format: formatFor(src), volume }) : null
  syncFootstepTimer()
}

/** Tell the audio whether the player is walking — starts / stops the footstep cadence. */
export function setFootstepsMoving(moving: boolean): void {
  if (moving === footMoving) return
  footMoving = moving
  syncFootstepTimer()
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
  setAmbient(resolveSrc(opts.ambient?.sound) ?? ambientUri, opts.ambient?.volume ?? 0.4)
  if (opts.footstepsOff) setFootstepSound(null)
  else setFootstepSound(resolveSrc(opts.footstep?.sound) ?? footstepUri, opts.footstep?.volume ?? 0.5)
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
    if (ambientHowl && !ambientHowl.playing()) ambientHowl.play()
    syncFootstepTimer()
  },
  { once: true },
)
