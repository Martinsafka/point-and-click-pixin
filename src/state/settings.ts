import { setMasterVolume } from '../audio/audio'

/**
 * Player **settings** (M11) — kept simple: in-game **font size** + **master volume**. Stored
 * in localStorage (per device, not in the GameDoc), applied globally: the font size as a CSS
 * `--ui-scale` variable the game text multiplies by, the volume through Howler.
 */
export interface Settings {
  /** UI font multiplier (1 = default). */
  fontScale: number
  /** Master volume 0..1. */
  volume: number
}

const KEY = 'pixin-settings'
const DEFAULT: Settings = { fontScale: 1, volume: 1 }

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<Settings>) } : { ...DEFAULT }
  } catch {
    return { ...DEFAULT }
  }
}

let current = load()

export function getSettings(): Settings {
  return current
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // ignore (private mode / quota) — settings just won't persist
  }
}

function applyFontScale(): void {
  document.documentElement.style.setProperty('--ui-scale', String(current.fontScale))
}
function applyVolume(): void {
  setMasterVolume(current.volume)
}

/** Apply the stored settings to the live game (call once on boot). */
export function applySettings(): void {
  applyFontScale()
  applyVolume()
}

export function setFontScale(v: number): void {
  current = { ...current, fontScale: v }
  persist()
  applyFontScale()
}

export function setVolume(v: number): void {
  current = { ...current, volume: v }
  persist()
  applyVolume()
}
