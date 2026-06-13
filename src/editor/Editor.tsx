import type { ChangeEvent } from 'react'
import { editorStore, exportDoc, importDocFromFile, useEditor } from './editor-store'
import { ScenePreview } from './ScenePreview'

/**
 * The dev-only editor shell (`?edit`). M3 step 2: an editable working `GameDoc` —
 * add / delete scenes, export / import the document as JSON, live preview of the
 * selection. Walkable drawing + layer upload are the next steps.
 */
export function Editor() {
  const doc = useEditor((s) => s.doc)
  const selectedId = useEditor((s) => s.selectedSceneId)
  const revision = useEditor((s) => s.revision)
  const sceneIds = Object.keys(doc.scenes)
  const scene = doc.scenes[selectedId]

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void importDocFromFile(file)
    e.target.value = ''
  }

  return (
    <div className="editor">
      <aside className="editor__panel">
        <h2 className="editor__title">Scenes</h2>
        <div className="editor__toolbar">
          <button type="button" onClick={() => editorStore.getState().addScene()}>
            + Scene
          </button>
          <button
            type="button"
            onClick={() => editorStore.getState().deleteScene(selectedId)}
            disabled={sceneIds.length <= 1}
          >
            Delete
          </button>
        </div>
        <ul className="editor__scenes">
          {sceneIds.map((id) => (
            <li key={id}>
              <button
                type="button"
                className={`editor__scene${id === selectedId ? ' editor__scene--active' : ''}`}
                onClick={() => editorStore.getState().selectScene(id)}
              >
                {doc.scenes[id].name}
              </button>
            </li>
          ))}
        </ul>
        <div className="editor__toolbar">
          <button type="button" onClick={exportDoc}>
            Export
          </button>
          <label className="editor__import">
            Import
            <input type="file" accept="application/json" hidden onChange={onImport} />
          </label>
        </div>
        <p className="editor__hint">
          M3 · step 2 — editable doc: add / delete scenes, export / import JSON. Walkable drawing +
          layer upload come next.
        </p>
      </aside>
      <main className="editor__preview">
        {scene && <ScenePreview key={`${selectedId}-${revision}`} scene={scene} />}
      </main>
    </div>
  )
}
