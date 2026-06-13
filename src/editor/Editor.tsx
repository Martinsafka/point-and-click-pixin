import { useState, type ChangeEvent } from 'react'
import { editorStore, exportDoc, importDocFromFile, useEditor } from './editor-store'
import { clearDocDraft, hasDocDraft, saveDocDraft } from '../data/doc-draft'
import { ScenePreview } from './ScenePreview'
import { WalkableOverlay } from './WalkableOverlay'
import { LayerList } from './LayerList'

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

/**
 * The dev-only editor shell (`?edit`). M3: an editable working `GameDoc` — add /
 * delete scenes, draw the walkable polygon, export / import JSON, and "Test in
 * game" (saves a localStorage draft the game loads in place of the baked doc).
 */
export function Editor() {
  const doc = useEditor((s) => s.doc)
  const selectedId = useEditor((s) => s.selectedSceneId)
  const revision = useEditor((s) => s.revision)
  const [drawWalkable, setDrawWalkable] = useState(false)

  const sceneIds = Object.keys(doc.scenes)
  const scene = doc.scenes[selectedId]

  const select = (id: string) => {
    editorStore.getState().selectScene(id)
    setDrawWalkable(false)
  }

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void importDocFromFile(file)
    e.target.value = ''
  }

  const addPoint = (xFrac: number, yFrac: number) => {
    const current = editorStore.getState().doc.scenes[selectedId].walkable
    editorStore.getState().setWalkable(selectedId, [...current, round(xFrac), round(yFrac)])
  }
  const clearWalkable = () => editorStore.getState().setWalkable(selectedId, [])

  // Save the working doc as a dev draft and open the game (drops `?edit`); the
  // game loads the draft in place of the baked document.
  const testInGame = () => {
    saveDocDraft(editorStore.getState().doc)
    window.location.assign(window.location.pathname)
  }
  // Drop the draft and reload so the editor + game return to the baked document.
  const discardDraft = () => {
    clearDocDraft()
    window.location.reload()
  }

  const pointCount = scene ? scene.walkable.length / 2 : 0

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
                onClick={() => select(id)}
              >
                {doc.scenes[id].name}
              </button>
            </li>
          ))}
        </ul>

        <h2 className="editor__title">Walkable · {pointCount} pts</h2>
        <div className="editor__toolbar">
          <button
            type="button"
            className={drawWalkable ? 'editor__btn--active' : undefined}
            onClick={() => setDrawWalkable((v) => !v)}
          >
            {drawWalkable ? 'Done' : 'Draw'}
          </button>
          <button type="button" onClick={clearWalkable}>
            Clear
          </button>
        </div>

        <h2 className="editor__title">Layers · {scene ? scene.layers.length : 0}</h2>
        {scene && <LayerList sceneId={selectedId} layers={scene.layers} />}

        <h2 className="editor__title">Playtest</h2>
        <div className="editor__toolbar">
          <button type="button" onClick={testInGame}>
            ▶ Test in game
          </button>
          <button type="button" onClick={discardDraft} disabled={!hasDocDraft()}>
            Discard
          </button>
        </div>

        <h2 className="editor__title">Document</h2>
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
          {drawWalkable
            ? 'Click in the preview to add walkable points.'
            : '“Test in game” saves a dev draft and opens the game; Export to commit the doc.'}
        </p>
      </aside>
      <main className="editor__preview">
        {scene && (
          <>
            <ScenePreview key={`${selectedId}-${revision}`} scene={scene} />
            <WalkableOverlay
              walkable={scene.walkable}
              drawMode={drawWalkable}
              onAddPoint={addPoint}
            />
          </>
        )}
      </main>
    </div>
  )
}
