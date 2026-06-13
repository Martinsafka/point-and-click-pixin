import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './ui/App'
import { Editor } from './editor/Editor'
import { isEditMode } from './editor/edit-mode'
import './styles.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Root element #root not found in index.html')
}

createRoot(rootEl).render(<StrictMode>{isEditMode() ? <Editor /> : <App />}</StrictMode>)
