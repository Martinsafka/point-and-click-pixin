import {
  useEffect,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { editorStore, exportDoc, importDocFromFile, useEditor } from './editor-store'
import { clearDocDraft, hasDocDraft, saveDocDraft } from '../data/doc-draft'
import type { InteractableData } from '../data/schema'
import { ScenePreview } from './ScenePreview'
import { WalkableOverlay } from './WalkableOverlay'
import { HitAreaOverlay } from './HitAreaOverlay'
import { LayerList } from './LayerList'
import { InteractableForm } from './InteractableForm'
import { ItemCatalogue } from './ItemCatalogue'
import { RecipeTable } from './RecipeTable'
import { CursorEditor } from './CursorEditor'

function round(n: number): number {
  return Math.round(n * 1000) / 1000
}

/** A collapsible panel section (native `<details>`, default open). */
function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(true)
  return (
    <details
      className="editor__section"
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary className="editor__title">{title}</summary>
      <div className="editor__section-body">{children}</div>
    </details>
  )
}

/**
 * The dev-only editor shell (`?edit`). Edits a working `GameDoc`: scenes, the
 * walkable polygon, image layers, interactables, items, recipes and cursors.
 * Sections collapse (accordion) and the panel is drag-resizable. "Test in game"
 * saves a localStorage draft the game loads in place of the doc.
 */
export function Editor() {
  const doc = useEditor((s) => s.doc)
  const selectedId = useEditor((s) => s.selectedSceneId)
  const revision = useEditor((s) => s.revision)
  const [drawWalkable, setDrawWalkable] = useState(false)
  const [drawHitArea, setDrawHitArea] = useState(false)
  const [selectedInteractable, setSelectedInteractable] = useState<number | null>(null)
  const [panelWidth, setPanelWidth] = useState(320)

  // Resizing the panel changes the preview container; nudge Pixi to re-fit it.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [panelWidth])

  const startResize = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const onMove = (ev: MouseEvent) => setPanelWidth(Math.max(240, Math.min(720, ev.clientX)))
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const sceneIds = Object.keys(doc.scenes)
  const scene = doc.scenes[selectedId]

  const select = (id: string) => {
    editorStore.getState().selectScene(id)
    setDrawWalkable(false)
    setDrawHitArea(false)
    setSelectedInteractable(null)
  }

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void importDocFromFile(file)
    e.target.value = ''
  }

  // Only one polygon draw mode is active at a time (overlays share the preview).
  const toggleWalkable = () => {
    setDrawHitArea(false)
    setDrawWalkable((v) => !v)
  }
  const toggleHitArea = () => {
    setDrawWalkable(false)
    setDrawHitArea((v) => !v)
  }

  const addPoint = (xFrac: number, yFrac: number) => {
    const current = editorStore.getState().doc.scenes[selectedId].walkable
    editorStore.getState().setWalkable(selectedId, [...current, round(xFrac), round(yFrac)])
  }
  const clearWalkable = () => editorStore.getState().setWalkable(selectedId, [])

  const addInteractable = (kind: InteractableData['kind']) => {
    setDrawWalkable(false)
    setDrawHitArea(false)
    setSelectedInteractable(scene.interactables.length) // appended at the end
    editorStore.getState().addInteractable(selectedId, kind)
  }
  const selectInteractable = (i: number) => {
    setDrawWalkable(false)
    setDrawHitArea(false)
    setSelectedInteractable(i)
  }
  const removeInteractable = (i: number) => {
    editorStore.getState().removeInteractable(selectedId, i)
    setSelectedInteractable(null)
    setDrawHitArea(false)
  }
  const addHitAreaPoint = (xFrac: number, yFrac: number) => {
    if (selectedInteractable === null) return
    const it = editorStore.getState().doc.scenes[selectedId].interactables[selectedInteractable]
    if (!it) return
    editorStore
      .getState()
      .setHitArea(selectedId, selectedInteractable, [...it.hitArea, round(xFrac), round(yFrac)])
  }

  // Save the working doc as a dev draft and open the game (drops `?edit`).
  const testInGame = () => {
    saveDocDraft(editorStore.getState().doc)
    window.location.assign(window.location.pathname)
  }
  const discardDraft = () => {
    clearDocDraft()
    window.location.reload()
  }

  const pointCount = scene ? scene.walkable.length / 2 : 0
  const selInteractable =
    selectedInteractable !== null ? scene?.interactables[selectedInteractable] : undefined

  return (
    <div className="editor">
      <aside className="editor__panel" style={{ width: panelWidth }}>
        <Section title="Scenes">
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
        </Section>

        <Section title={`Walkable · ${pointCount} pts`}>
          <div className="editor__toolbar">
            <button
              type="button"
              className={drawWalkable ? 'editor__btn--active' : undefined}
              onClick={toggleWalkable}
            >
              {drawWalkable ? 'Done' : 'Draw'}
            </button>
            <button type="button" onClick={clearWalkable}>
              Clear
            </button>
          </div>
        </Section>

        <Section title={`Layers · ${scene ? scene.layers.length : 0}`}>
          {scene && <LayerList sceneId={selectedId} layers={scene.layers} />}
        </Section>

        <Section title={`Interactables · ${scene ? scene.interactables.length : 0}`}>
          <div className="editor__toolbar">
            <button type="button" onClick={() => addInteractable('pickable')}>
              + Pick
            </button>
            <button type="button" onClick={() => addInteractable('interact')}>
              + Use
            </button>
            <button type="button" onClick={() => addInteractable('exit')}>
              + Exit
            </button>
          </div>
          {scene && scene.interactables.length > 0 && (
            <ul className="editor__interactables">
              {scene.interactables.map((it, i) => (
                <li key={i} className="intr-row">
                  <button
                    type="button"
                    className={`intr-row__select intr-row__select--${it.kind}${
                      i === selectedInteractable ? ' intr-row__select--active' : ''
                    }`}
                    onClick={() => selectInteractable(i)}
                  >
                    <span className="intr-row__kind">{it.kind}</span> {it.id}
                  </button>
                  <button
                    type="button"
                    className="intr-row__del"
                    onClick={() => removeInteractable(i)}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {scene && selectedInteractable !== null && selInteractable && (
            <InteractableForm
              sceneId={selectedId}
              index={selectedInteractable}
              interactable={selInteractable}
              items={doc.items}
              sceneIds={sceneIds}
              drawMode={drawHitArea}
              onToggleDraw={toggleHitArea}
            />
          )}
        </Section>

        <Section title={`Items · ${Object.keys(doc.items).length}`}>
          <ItemCatalogue items={doc.items} />
        </Section>

        <Section title={`Recipes · ${(doc.recipes ?? []).length}`}>
          <RecipeTable recipes={doc.recipes ?? []} items={doc.items} />
        </Section>

        <Section title="Cursors">
          <CursorEditor cursors={doc.cursors} />
        </Section>

        <Section title="Playtest">
          <div className="editor__toolbar">
            <button type="button" onClick={testInGame}>
              ▶ Test in game
            </button>
            <button type="button" onClick={discardDraft} disabled={!hasDocDraft()}>
              Discard
            </button>
          </div>
        </Section>

        <Section title="Document">
          <div className="editor__toolbar">
            <button type="button" onClick={exportDoc}>
              Export
            </button>
            <label className="editor__import">
              Import
              <input type="file" accept="application/json" hidden onChange={onImport} />
            </label>
          </div>
        </Section>

        <p className="editor__hint">
          {drawWalkable
            ? 'Click in the preview to add walkable points.'
            : drawHitArea
              ? 'Click in the preview to add hit-area points.'
              : '“Test in game” saves a dev draft and opens the game; Export to commit the doc.'}
        </p>
      </aside>
      <div className="editor__resizer" onMouseDown={startResize} />
      <main className="editor__preview">
        {scene && (
          <>
            <ScenePreview key={`${selectedId}-${revision}`} scene={scene} />
            <WalkableOverlay
              walkable={scene.walkable}
              drawMode={drawWalkable}
              onAddPoint={addPoint}
            />
            <HitAreaOverlay
              interactables={scene.interactables}
              selectedIndex={selectedInteractable}
              drawMode={drawHitArea}
              onAddPoint={addHitAreaPoint}
            />
          </>
        )}
      </main>
    </div>
  )
}
