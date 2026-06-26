import type { GameDoc } from './schema'
import { DRAFT_STORE, idbDelete, idbGet, idbPut } from '../state/idb'

/**
 * The editor → game test loop. The editor saves its working `GameDoc` here (dev
 * only); the game loads it in place of the baked document. Stored in **IndexedDB**
 * (not localStorage) so large documents — uploaded SVG/PNG art is embedded as
 * data-URLs — don't hit localStorage's ~5 MB quota; the disk-based IndexedDB budget
 * is orders of magnitude larger (see `state/idb.ts` `estimateStorage`).
 *
 * Load is async (IndexedDB) — `data/game.ts` awaits it at boot (top-level await). A
 * cached `present` flag lets `hasDocDraft()` stay synchronous for UI badges.
 */
const KEY = 'doc'
const LEGACY_LS_KEY = 'pnc-doc-draft'

let present = false

/** Load the draft. **Callers gate on dev** (the editor → game loop is dev-only) — this must NOT
 *  test `import.meta.env.DEV` itself: in the published library that constant is baked to the
 *  library's build mode (`false`), which would make the draft write-only (saved, never read).
 *  Migrates a pre-existing localStorage draft into IndexedDB on first run. */
export async function loadDocDraft(): Promise<GameDoc | null> {
  try {
    let doc = await idbGet<GameDoc>(DRAFT_STORE, KEY)
    if (!doc) {
      const legacy = localStorage.getItem(LEGACY_LS_KEY)
      if (legacy) {
        doc = JSON.parse(legacy) as GameDoc
        await idbPut(DRAFT_STORE, KEY, doc)
        localStorage.removeItem(LEGACY_LS_KEY)
      }
    }
    // A draft with no scenes is a stray/blank save — treat it as "no draft" so it can't shadow the
    // committed content/game.json in the editor → game loop. The draft is per-origin (e.g.
    // localhost:5173), so a single empty save would otherwise leave every fresh project on that
    // origin loading an empty document (editor shows nothing; the game's start scene is missing).
    if (doc && Object.keys(doc.scenes ?? {}).length === 0) doc = undefined
    present = !!doc
    return doc ?? null
  } catch {
    return null
  }
}

export async function saveDocDraft(doc: GameDoc): Promise<void> {
  await idbPut(DRAFT_STORE, KEY, doc)
  present = true
}

export async function clearDocDraft(): Promise<void> {
  await idbDelete(DRAFT_STORE, KEY)
  present = false
}

/** Synchronous best-effort (reflects the last load / save / clear) — for UI badges. Don't test
 *  `import.meta.env.DEV` here — it's baked `false` in the published library (see loadDocDraft). */
export function hasDocDraft(): boolean {
  return present
}
