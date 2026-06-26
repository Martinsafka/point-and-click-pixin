/**
 * `@theideaguards/pixin/editor` — the no-code visual editor.
 *
 * Mount the editor into a DOM container (a full-page dev setup — its `Test in game` reloads the
 * page into the running game). It resumes from an IndexedDB **draft** if one exists, otherwise the
 * `initialDoc` you pass (your project's `content/game.json`), otherwise a blank document. Heavy —
 * it bundles React Flow, so keep it out of the player build (mount it only behind a dev flag).
 * Requires the stylesheet: `import '@theideaguards/pixin/styles.css'`.
 *
 *   import { mountEditor } from '@theideaguards/pixin/editor'
 *   import '@theideaguards/pixin/styles.css'
 *   import gameDoc from '../content/game.json'
 *   if (import.meta.env.DEV) void mountEditor(document.getElementById('root')!, gameDoc)
 */
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { GameDoc } from './data/schema'
import { setActiveDoc } from './data/active-doc'
import { setSoundLibrary } from './audio/audio'
import { migrateSounds } from './data/migrate-sounds'
import { seedBuiltinSounds } from './data/seed-sounds'
import { seedWeatherPresets } from './data/weather-presets'
import { loadDocDraft } from './data/doc-draft'
import { Editor } from './editor/Editor'
import { editorStore } from './editor/editor-store'

export { Editor }

/** Handle returned by {@link mountEditor}. */
export interface EditorHandle {
  /** Unmount the editor and release its React root. */
  destroy(): void
}

/**
 * Render the visual editor into a container, seeded with its working document: the IndexedDB
 * **draft** if present (the editor → game loop), otherwise `initialDoc` (your committed game).
 * Async because the draft load is async. The editor store is created at module load from the
 * still-empty active doc, so this seeds it via `setDoc` once the real document is resolved.
 */
// A library entry, not a Fast-Refresh boundary — exporting helpers beside `Editor` is fine.
// eslint-disable-next-line react-refresh/only-export-components
export async function mountEditor(
  container: HTMLElement,
  initialDoc?: GameDoc,
): Promise<EditorHandle> {
  const doc = (await loadDocDraft()) ?? initialDoc
  if (doc) {
    const prepared = seedWeatherPresets(seedBuiltinSounds(migrateSounds(doc)))
    setActiveDoc(prepared)
    setSoundLibrary(prepared.sounds)
    editorStore.getState().setDoc(prepared)
  }

  const root: Root = createRoot(container)
  root.render(
    <StrictMode>
      <Editor />
    </StrictMode>,
  )
  return { destroy: () => root.unmount() }
}
