import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { isEditMode } from './editor/edit-mode'
import './styles.css'

// The editor is dev-only and lazy-loaded, so it (and heavy editor-only deps like React
// Flow) is code-split into its own chunk — the player build never fetches it.
const Editor = lazy(() => import('./editor/Editor').then((m) => ({ default: m.Editor })))

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(rootEl).render(
  <StrictMode>
    {isEditMode() ? (
      <Suspense fallback={null}>
        <Editor />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
)
