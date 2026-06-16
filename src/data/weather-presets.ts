import type { GameDoc, WeatherPreset } from './schema'

/**
 * The built-in weather presets (M10 10a), seeded into every document's
 * `GameDoc.weatherPresets` at load so the Atmosphere tab ships with **rain / snow / dust**
 * ready to use or tweak. Stable ids — scenes reference them by `id`.
 */
export const BUILTIN_WEATHER: Record<string, WeatherPreset> = {
  rain: {
    id: 'rain',
    name: 'Rain',
    count: 480,
    color: '#a9c2e0',
    alpha: 0.5,
    size: 26,
    shape: 'streak',
    angle: 78,
    speed: 950,
    sway: 0,
    swayFreq: 0,
    blend: 'normal',
    ambient: { sound: 'sfx-rain', volume: 0.45 },
  },
  snow: {
    id: 'snow',
    name: 'Snow',
    count: 280,
    color: '#ffffff',
    alpha: 0.9,
    size: 6,
    shape: 'round',
    angle: 90,
    speed: 90,
    sway: 42,
    swayFreq: 0.4,
    blend: 'add',
  },
  dust: {
    id: 'dust',
    name: 'Dust',
    count: 160,
    color: '#d8c79a',
    alpha: 0.32,
    size: 4,
    shape: 'round',
    angle: 100,
    speed: 34,
    sway: 30,
    swayFreq: 0.25,
    blend: 'add',
  },
}

/** Seed the built-in presets into the document (non-destructive — an edited preset under
 *  the same id is kept). Run at load, like the sound library. */
export function seedWeatherPresets(doc: GameDoc): GameDoc {
  const presets = { ...(doc.weatherPresets ?? {}) }
  let added = false
  for (const [id, p] of Object.entries(BUILTIN_WEATHER)) {
    if (!presets[id]) {
      presets[id] = p
      added = true
    }
  }
  return added || !doc.weatherPresets ? { ...doc, weatherPresets: presets } : doc
}
