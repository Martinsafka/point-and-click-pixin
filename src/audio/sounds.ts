// Placeholder audio generated in code (no asset files yet): short WAVs as base64
// data URIs, loaded by Howler. Real sound files swap in later via the same Howls.

const RATE = 22050

function wavDataUri(samples: Float32Array): string {
  const n = samples.length
  const buffer = new ArrayBuffer(44 + n * 2)
  const view = new DataView(buffer)
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + n * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, RATE, true)
  view.setUint32(28, RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, n * 2, true)
  for (let i = 0; i < n; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), true)
  }
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i])
  return `data:audio/wav;base64,${btoa(binary)}`
}

/** A short tone with a fade in/out (no clicks). */
function blip(freq: number, seconds: number, volume: number): string {
  const n = Math.floor(RATE * seconds)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    const t = i / RATE
    const env = Math.min(1, t * 30, (seconds - t) * 30)
    s[i] = Math.sin(2 * Math.PI * freq * t) * volume * env
  }
  return wavDataUri(s)
}

/** A seamless drone loop — each freq must complete whole cycles in `seconds`. */
function drone(seconds: number, freqs: number[], volume: number): string {
  const n = Math.floor(RATE * seconds)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    const t = i / RATE
    let v = 0
    for (const f of freqs) v += Math.sin(2 * Math.PI * f * t)
    s[i] = (v / freqs.length) * volume
  }
  return wavDataUri(s)
}

/** A short soft footstep — a low thump with a quick decay (no sustained tone). */
function thump(freq: number, seconds: number, volume: number): string {
  const n = Math.floor(RATE * seconds)
  const s = new Float32Array(n)
  for (let i = 0; i < n; i += 1) {
    const t = i / RATE
    const env = Math.min(1, t * 120) * Math.exp(-t * 28) // fast attack, quick decay
    s[i] = Math.sin(2 * Math.PI * freq * t) * volume * env
  }
  return wavDataUri(s)
}

/** A soft hiss loop (low-passed white noise) — a procedural rain / wind bed. A short
 *  crossfade across the seam keeps the loop click-free. */
function hiss(seconds: number, volume: number): string {
  const n = Math.floor(RATE * seconds)
  const s = new Float32Array(n)
  let last = 0
  for (let i = 0; i < n; i += 1) {
    last = last * 0.72 + (Math.random() * 2 - 1) * 0.28 // one-pole low-pass → softer hiss
    s[i] = last * volume
  }
  const fade = Math.floor(RATE * 0.03)
  for (let i = 0; i < fade; i += 1) {
    const k = i / fade
    s[i] = s[i] * k + s[n - fade + i] * (1 - k) // blend the tail into the head
  }
  return wavDataUri(s)
}

export const ambientUri = drone(1, [110, 165], 0.5)
export const pickupUri = blip(784, 0.12, 0.4)
export const transitionUri = blip(523, 0.22, 0.32)
export const footstepUri = thump(120, 0.11, 0.5)
export const rainUri = hiss(1.5, 0.5)
