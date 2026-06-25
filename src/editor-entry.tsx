/**
 * `@theideaguards/pixin/editor` — the no-code visual editor.
 *
 * Mount the editor into a DOM container (a full-page dev setup — its `Test in game` reloads the
 * page into the running game). It persists to an IndexedDB **draft**; the active document
 * (`setActiveDoc`, else the empty default) seeds a blank start. Heavy — it bundles React Flow, so
 * keep it out of the player build (mount it only behind a dev flag). Requires the stylesheet:
 * `import '@theideaguards/pixin/styles.css'`.
 *
 *   import { mountEditor } from '@theideaguards/pixin/editor'
 *   import '@theideaguards/pixin/styles.css'
 *   if (import.meta.env.DEV) mountEditor(document.getElementById('root')!)
 */
import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { Editor } from './editor/Editor'

export { Editor }

/** Handle returned by {@link mountEditor}. */
export interface EditorHandle {
  /** Unmount the editor and release its React root. */
  destroy(): void
}

/** Render the visual editor into a container. */
// A library entry, not a Fast-Refresh boundary — exporting a helper beside `Editor` is fine.
// eslint-disable-next-line react-refresh/only-export-components
export function mountEditor(container: HTMLElement): EditorHandle {
  const root: Root = createRoot(container)
  root.render(
    <StrictMode>
      <Editor />
    </StrictMode>,
  )
  return { destroy: () => root.unmount() }
}
