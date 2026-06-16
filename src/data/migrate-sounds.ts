import type { GameDoc, SoundAsset } from './schema'

/**
 * Migrate a document to the **sound library** model (M9 9b): any inline `data:audio…`
 * clip — once embedded directly in a `playSound` effect, voice, inspect audio, or an
 * ambient/footstep `SoundConfig` — is **hoisted** into `GameDoc.sounds` (deduped by src)
 * and replaced by its `SoundId`. Idempotent: a doc that already uses references is left
 * unchanged. Runs at load (`data/game.ts`) so older docs / drafts keep working.
 *
 * `SoundConfig` is also renamed in place (`src` → `sound`) for ambient / footstep.
 */
export function migrateSounds(doc: GameDoc): GameDoc {
  const next = structuredClone(doc)
  const sounds: Record<string, SoundAsset> = { ...(next.sounds ?? {}) }
  const bySrc = new Map<string, string>()
  for (const a of Object.values(sounds)) bySrc.set(a.src, a.id)
  let n = 0

  const hoist = (src: string): string => {
    const existing = bySrc.get(src)
    if (existing) return existing
    let id: string
    do {
      n += 1
      id = n === 1 ? 'sound' : `sound-${n}`
    } while (sounds[id])
    sounds[id] = { id, name: id, src }
    bySrc.set(src, id)
    return id
  }

  const isInline = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:audio')

  // Rename ambient/footstep SoundConfig (`src` → `sound`), hoisting the clip.
  const fixConfig = (cfg: unknown): void => {
    if (!cfg || typeof cfg !== 'object') return
    const c = cfg as Record<string, unknown>
    if (isInline(c.src)) {
      c.sound = hoist(c.src)
      delete c.src
    }
  }
  fixConfig(next.ambient)
  fixConfig(next.footstep)
  for (const scene of Object.values(next.scenes)) fixConfig((scene as { ambient?: unknown }).ambient)

  // Generic: every other inline `data:audio` string (playSound / voice / inspect audio)
  // becomes its id, replaced in place (the field name stays the same).
  const walk = (o: unknown): void => {
    if (!o || typeof o !== 'object') return
    const rec = o as Record<string, unknown>
    for (const k of Object.keys(rec)) {
      const v = rec[k]
      if (isInline(v)) rec[k] = hoist(v)
      else walk(v)
    }
  }
  walk(next.scenes)
  walk(next.npcs ?? {})
  walk(next.dialogs ?? {})
  walk(next.sequences ?? {})

  next.sounds = sounds
  return next
}
