import type { VoiceConfig } from '../data/schema'
import { isMuted, playClip } from './audio'

/**
 * Dialogue "voice": short blips played as a line types out (Undertale-style). The
 * default is procedural gibberish (a square-wave oscillator, pitched per NPC); an
 * uploaded `sound` replaces it. `speakBlip` is throttled so a fast typewriter reads as
 * speech, not a buzz; `previewVoice` plays a short burst for the editor.
 */
const BLIP_GAP_MS = 70

let ctx: AudioContext | undefined
let lastBlip = 0

/** Emit one blip now (no throttle): the uploaded clip, else a procedural note. */
function emit(voice?: VoiceConfig): void {
  if (isMuted()) return
  if (voice?.sound) {
    playClip(voice.sound)
    return
  }
  try {
    ctx ??= new AudioContext()
    const ac = ctx
    void ac.resume() // dialogue starts from a click, but resume defensively
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = 'square'
    // A little jitter around the per-NPC base pitch so it reads as speech.
    osc.frequency.value = 220 * (voice?.pitch ?? 1) * (0.92 + Math.random() * 0.28)
    const t = ac.currentTime
    gain.gain.setValueAtTime(0.0001, t)
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + 0.08)
  } catch {
    // AudioContext unavailable / blocked — stay silent.
  }
}

/** Play a blip for a revealed character, throttled to a speech-like rate. */
export function speakBlip(voice?: VoiceConfig): void {
  const now = performance.now()
  if (now - lastBlip < BLIP_GAP_MS) return
  lastBlip = now
  emit(voice)
}

/** Play a short burst with `voice` — the editor's "test" button. */
export function previewVoice(voice?: VoiceConfig): void {
  let i = 0
  const id = setInterval(() => {
    emit(voice)
    i += 1
    if (i >= 6) clearInterval(id)
  }, 95)
}
