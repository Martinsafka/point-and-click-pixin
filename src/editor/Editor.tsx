import { useState } from 'react'
import { gameDoc } from '../data/game'
import { ScenePreview } from './ScenePreview'

/**
 * The dev-only editor shell (reached via `?edit`). M3 step 1: a scene list and a
 * live read-only preview of the selected scene. Layer upload, walkable drawing,
 * object placement, and saving the `GameDoc` land in the next M3 steps.
 */
export function Editor() {
  const sceneIds = Object.keys(gameDoc.scenes)
  const [selectedId, setSelectedId] = useState(() => sceneIds[0] ?? gameDoc.start)
  const scene = gameDoc.scenes[selectedId]

  return (
    <div className="editor">
      <aside className="editor__panel">
        <h2 className="editor__title">Scenes</h2>
        <ul className="editor__scenes">
          {sceneIds.map((id) => (
            <li key={id}>
              <button
                type="button"
                className={`editor__scene${id === selectedId ? ' editor__scene--active' : ''}`}
                onClick={() => setSelectedId(id)}
              >
                {gameDoc.scenes[id].name}
              </button>
            </li>
          ))}
        </ul>
        <p className="editor__hint">
          M3 · step 1 — read-only live preview. Layer upload, walkable drawing, and object placement
          come next.
        </p>
      </aside>
      <main className="editor__preview">
        {scene && <ScenePreview key={selectedId} scene={scene} />}
      </main>
    </div>
  )
}
