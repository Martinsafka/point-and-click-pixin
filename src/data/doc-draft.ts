import type { GameDoc } from './schema'

/**
 * The editor → game test loop. The editor saves its working `GameDoc` here (dev
 * only); the game loads it in place of the baked document. localStorage is
 * synchronous, so it fits the sync doc/store without an async-boot refactor —
 * fine while documents are small. When uploaded SVGs grow them past the
 * localStorage quota, move to IndexedDB + an async document load.
 */
const DRAFT_KEY = 'pnc-doc-draft'

export function loadDocDraft(): GameDoc | null {
  if (!import.meta.env.DEV) return null
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? (JSON.parse(raw) as GameDoc) : null
  } catch {
    return null
  }
}

export function saveDocDraft(doc: GameDoc): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(doc))
}

export function clearDocDraft(): void {
  localStorage.removeItem(DRAFT_KEY)
}

export function hasDocDraft(): boolean {
  return import.meta.env.DEV && localStorage.getItem(DRAFT_KEY) !== null
}
