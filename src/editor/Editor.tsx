import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import { editorStore, exportDoc, importDocFromFile, useEditor } from './editor-store'
import { clearDocDraft, hasDocDraft, saveDocDraft } from '../data/doc-draft'
import type { InteractableData } from '../data/schema'
import { DEFAULT_REFERENCE_HEIGHT } from '../data/scene-config'
import { ScenePreview } from './ScenePreview'
import { WalkableOverlay } from './WalkableOverlay'
import { HoleOverlay } from './HoleOverlay'
import { HitAreaOverlay } from './HitAreaOverlay'
import { LayerList } from './LayerList'
import { InteractableForm } from './InteractableForm'
import { ItemCatalogue } from './ItemCatalogue'
import { RecipeTable } from './RecipeTable'
import { CursorEditor } from './CursorEditor'
import { CharacterEditor } from './CharacterEditor'
import { DepthEditor } from './DepthEditor'
import { TransitionEditor } from './TransitionEditor'
import { NpcList } from './NpcList'
import { NpcOverlay } from './NpcOverlay'
import { NpcCast } from './NpcCast'
import { DialogList } from './DialogList'

const TABS = ['scene', 'items', 'characters', 'dialogs', 'project'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, string> = {
  scene: 'Scene',
  items: 'Items',
  characters: 'Characters',
  dialogs: 'Dialogs',
  project: 'Project',
}

/** Which polygon draw / placement mode is active (overlays share the preview). */
type Draw = 'walkable' | 'hole' | 'hitarea' | 'npc' | 'npcpath' | null

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
 * The dev-only editor shell (`?edit`). Edits a working `GameDoc`, grouped into
 * top-level tabs (Scene / Items / Characters / Project) with collapsible sections;
 * the panel is drag-resizable and a persistent footer plays the draft in the game.
 */
export function Editor() {
  const doc = useEditor((s) => s.doc)
  const selectedId = useEditor((s) => s.selectedSceneId)
  const revision = useEditor((s) => s.revision)
  const [tab, setTab] = useState<Tab>('scene')
  const [draw, setDraw] = useState<Draw>(null)
  const [selectedInteractable, setSelectedInteractable] = useState<number | null>(null)
  const [selectedHole, setSelectedHole] = useState<number | null>(null)
  const [selectedNpc, setSelectedNpc] = useState<number | null>(null)
  const [panelWidth, setPanelWidth] = useState(340)
  // The character-size slider drives a live % during drag, committing (one preview
  // re-mount) on release; null means "read the saved value". Width is the same.
  const [charDraft, setCharDraft] = useState<number | null>(null)
  const [widthDraft, setWidthDraft] = useState<number | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const [stage, setStage] = useState({ w: 0, h: 0 })

  const startResize = (e: ReactMouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const onMove = (ev: MouseEvent) => setPanelWidth(Math.max(260, Math.min(720, ev.clientX)))
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const sceneIds = Object.keys(doc.scenes)
  const scene = doc.scenes[selectedId]
  const holes = scene?.holes ?? []
  // Every cast NPC already placed somewhere (a character lives in one scene at a time).
  const placedNpcIds = new Set(
    Object.values(doc.scenes).flatMap((sc) => (sc.npcs ?? []).map((p) => p.npc)),
  )

  const changeTab = (t: Tab) => {
    setTab(t)
    setDraw(null)
  }

  const select = (id: string) => {
    editorStore.getState().selectScene(id)
    setDraw(null)
    setSelectedInteractable(null)
    setSelectedHole(null)
    setSelectedNpc(null)
    setCharDraft(null)
    setWidthDraft(null)
  }

  const onImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) void importDocFromFile(file)
    e.target.value = ''
  }

  const toggle = (mode: Exclude<Draw, null>) => setDraw((d) => (d === mode ? null : mode))

  const refH = doc.referenceHeight ?? DEFAULT_REFERENCE_HEIGHT
  const defaultWidth = Math.round(refH * (16 / 9))
  const savedWidth = scene?.width ?? defaultWidth
  const aspect = savedWidth / refH
  const sceneWidth = widthDraft ?? savedWidth
  const charScale = charDraft ?? scene?.characterScale ?? 1
  const commitWidth = () => {
    if (widthDraft === null) return
    editorStore.getState().setSceneWidth(selectedId, Math.max(refH, Math.round(widthDraft) || refH))
    setWidthDraft(null)
  }
  const commitCharScale = () => {
    if (charDraft === null) return
    editorStore.getState().setCharacterScale(selectedId, charDraft)
    setCharDraft(null)
  }

  // The preview "stage" is a box of the scene's aspect, fit inside the preview pane
  // and centred — so the canvas and the DOM overlays always share one coordinate
  // box (areas can't drift when the panel is resized).
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const measure = () => {
      const w = Math.min(el.clientWidth, el.clientHeight * aspect)
      setStage({ w, h: w / aspect })
    }
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(el)
    return () => obs.disconnect()
  }, [aspect])

  // When the stage box changes, nudge Pixi (resizeTo: host) to re-fit the canvas.
  useEffect(() => {
    window.dispatchEvent(new Event('resize'))
  }, [stage.w, stage.h])

  const addPoint = (xFrac: number, yFrac: number) => {
    const current = editorStore.getState().doc.scenes[selectedId].walkable
    editorStore.getState().setWalkable(selectedId, [...current, round(xFrac), round(yFrac)])
  }
  const clearWalkable = () => editorStore.getState().setWalkable(selectedId, [])

  const addHole = () => {
    setSelectedHole(holes.length) // appended at the end
    setDraw('hole')
    editorStore.getState().addHole(selectedId)
  }
  const selectHole = (i: number) => {
    setDraw(null)
    setSelectedHole(i)
  }
  const removeHole = (i: number) => {
    editorStore.getState().removeHole(selectedId, i)
    setSelectedHole(null)
    setDraw(null)
  }
  const addHolePoint = (xFrac: number, yFrac: number) => {
    if (selectedHole === null) return
    const cur = editorStore.getState().doc.scenes[selectedId].holes?.[selectedHole] ?? []
    editorStore.getState().setHole(selectedId, selectedHole, [...cur, round(xFrac), round(yFrac)])
  }
  const clearHole = () => {
    if (selectedHole !== null) editorStore.getState().setHole(selectedId, selectedHole, [])
  }

  const addInteractable = (kind: InteractableData['kind']) => {
    setDraw(null)
    setSelectedInteractable(scene.interactables.length) // appended at the end
    editorStore.getState().addInteractable(selectedId, kind)
  }
  const selectInteractable = (i: number) => {
    setDraw(null)
    setSelectedInteractable(i)
  }
  const removeInteractable = (i: number) => {
    editorStore.getState().removeInteractable(selectedId, i)
    setSelectedInteractable(null)
    setDraw(null)
  }
  const addHitAreaPoint = (xFrac: number, yFrac: number) => {
    if (selectedInteractable === null) return
    const it = editorStore.getState().doc.scenes[selectedId].interactables[selectedInteractable]
    if (!it) return
    editorStore
      .getState()
      .setHitArea(selectedId, selectedInteractable, [...it.hitArea, round(xFrac), round(yFrac)])
  }

  const selectNpc = (i: number) => {
    setDraw(null)
    setSelectedNpc(i)
  }
  const placeNpc = (xFrac: number, yFrac: number) => {
    if (selectedNpc !== null) {
      editorStore
        .getState()
        .setNpcPlacementSpawn(selectedId, selectedNpc, round(xFrac), round(yFrac))
    }
  }
  const addNpcPathPoint = (xFrac: number, yFrac: number) => {
    if (selectedNpc !== null) {
      editorStore.getState().addNpcPathPoint(selectedId, selectedNpc, round(xFrac), round(yFrac))
    }
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
        <div className="editor__tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              className={`editor__tab${t === tab ? ' editor__tab--active' : ''}`}
              onClick={() => changeTab(t)}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>

        <div className="editor__tab-content">
          {tab === 'scene' && (
            <>
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
                <div className="intr-form__field">
                  <span>width</span>
                  <input
                    className="logic__in"
                    type="number"
                    step="20"
                    min={refH}
                    value={sceneWidth}
                    onChange={(e) => setWidthDraft(Number(e.target.value))}
                    onBlur={commitWidth}
                    onKeyDown={(e) => e.key === 'Enter' && commitWidth()}
                  />
                  <span className="intr-form__note">
                    px · {(sceneWidth / refH).toFixed(2)}:1
                    {sceneWidth > defaultWidth ? ' · scrolls' : ''}
                  </span>
                </div>
                <div className="intr-form__field">
                  <span>characters</span>
                  <input
                    type="range"
                    min="0.2"
                    max="4"
                    step="0.05"
                    value={charScale}
                    onChange={(e) => setCharDraft(Number(e.target.value))}
                    onPointerUp={commitCharScale}
                    onBlur={commitCharScale}
                  />
                  <span className="intr-form__note">{Math.round(charScale * 100)}%</span>
                </div>
              </Section>

              <Section title={`Walkable · ${pointCount} pts`}>
                <div className="editor__toolbar">
                  <button
                    type="button"
                    className={draw === 'walkable' ? 'editor__btn--active' : undefined}
                    onClick={() => toggle('walkable')}
                  >
                    {draw === 'walkable' ? 'Done' : 'Draw'}
                  </button>
                  <button type="button" onClick={clearWalkable}>
                    Clear
                  </button>
                </div>
              </Section>

              <Section title="Depth">
                {scene && <DepthEditor sceneId={selectedId} depth={scene.depth} />}
              </Section>

              <Section title={`Holes · ${holes.length}`}>
                <div className="editor__toolbar">
                  <button type="button" onClick={addHole}>
                    + Hole
                  </button>
                </div>
                {holes.length > 0 && (
                  <ul className="editor__interactables">
                    {holes.map((h, i) => (
                      <li key={i} className="intr-row">
                        <button
                          type="button"
                          className={`intr-row__select${i === selectedHole ? ' intr-row__select--active' : ''}`}
                          onClick={() => selectHole(i)}
                        >
                          Hole {i + 1} · {h.length / 2} pts
                        </button>
                        <button
                          type="button"
                          className="intr-row__del"
                          onClick={() => removeHole(i)}
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {selectedHole !== null && (
                  <div className="editor__toolbar">
                    <button
                      type="button"
                      className={draw === 'hole' ? 'editor__btn--active' : undefined}
                      onClick={() => toggle('hole')}
                    >
                      {draw === 'hole' ? 'Done' : 'Draw'}
                    </button>
                    <button type="button" onClick={clearHole}>
                      Clear
                    </button>
                  </div>
                )}
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
                  <button type="button" onClick={() => addInteractable('inspect')}>
                    + Look
                  </button>
                  <button type="button" onClick={() => addInteractable('trigger')}>
                    + Trigger
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
                    drawMode={draw === 'hitarea'}
                    onToggleDraw={() => toggle('hitarea')}
                  />
                )}
              </Section>

              <Section title={`NPCs · ${scene ? (scene.npcs?.length ?? 0) : 0}`}>
                {scene && (
                  <NpcList
                    sceneId={selectedId}
                    placements={scene.npcs ?? []}
                    cast={doc.npcs ?? {}}
                    placedNpcIds={placedNpcIds}
                    selectedIndex={selectedNpc}
                    onSelect={selectNpc}
                    placeMode={draw === 'npc'}
                    onTogglePlace={() => toggle('npc')}
                    pathMode={draw === 'npcpath'}
                    onTogglePath={() => toggle('npcpath')}
                    items={doc.items}
                    sceneIds={sceneIds}
                  />
                )}
              </Section>

              {draw && (
                <p className="editor__hint">
                  {draw === 'npc'
                    ? "Click in the preview to set the NPC's spawn."
                    : draw === 'npcpath'
                      ? "Click in the preview to add waypoints to the NPC's path."
                      : `Click in the preview to add ${
                          draw === 'walkable' ? 'walkable' : draw === 'hole' ? 'hole' : 'hit-area'
                        } points.`}
                </p>
              )}
            </>
          )}

          {tab === 'items' && (
            <>
              <Section title={`Items · ${Object.keys(doc.items).length}`}>
                <ItemCatalogue items={doc.items} />
              </Section>
              <Section title={`Recipes · ${(doc.recipes ?? []).length}`}>
                <RecipeTable recipes={doc.recipes ?? []} items={doc.items} />
              </Section>
            </>
          )}

          {tab === 'characters' && (
            <>
              <Section title="Player">
                <CharacterEditor
                  view={doc.player}
                  onCreate={() => editorStore.getState().createPlayer()}
                  onChange={(patch) => editorStore.getState().updatePlayer(patch)}
                  onRemove={() => editorStore.getState().removePlayer()}
                />
              </Section>
              <Section title={`NPCs · ${Object.keys(doc.npcs ?? {}).length}`}>
                <NpcCast npcs={doc.npcs} />
              </Section>
            </>
          )}

          {tab === 'dialogs' && (
            <Section title={`Dialogs · ${Object.keys(doc.dialogs ?? {}).length}`}>
              <DialogList dialogs={doc.dialogs} />
            </Section>
          )}

          {tab === 'project' && (
            <>
              <Section title="Display">
                <div className="intr-form__field">
                  <span>height</span>
                  <input
                    className="logic__in"
                    type="number"
                    step="10"
                    min="240"
                    value={doc.referenceHeight ?? DEFAULT_REFERENCE_HEIGHT}
                    onChange={(e) =>
                      editorStore
                        .getState()
                        .setReferenceHeight(
                          Math.max(
                            240,
                            Math.round(Number(e.target.value)) || DEFAULT_REFERENCE_HEIGHT,
                          ),
                        )
                    }
                  />
                  <span className="intr-form__note">px · the game's vertical resolution</span>
                </div>
              </Section>
              <Section title="Cursors">
                <CursorEditor cursors={doc.cursors} />
              </Section>
              <Section title="Transition">
                <TransitionEditor transition={doc.transition} />
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
            </>
          )}
        </div>

        <div className="editor__footer">
          <button type="button" className="editor__test" onClick={testInGame}>
            ▶ Test in game
          </button>
          <button type="button" onClick={discardDraft} disabled={!hasDocDraft()}>
            Discard
          </button>
        </div>
      </aside>
      <div className="editor__resizer" onMouseDown={startResize} />
      <main className="editor__preview" ref={mainRef}>
        {scene && stage.w > 0 && (
          <div className="editor__stage" style={{ width: stage.w, height: stage.h }}>
            <ScenePreview key={`${selectedId}-${revision}`} scene={scene} />
            <WalkableOverlay
              walkable={scene.walkable}
              drawMode={draw === 'walkable'}
              onAddPoint={addPoint}
            />
            <HoleOverlay
              holes={holes}
              selectedIndex={selectedHole}
              drawMode={draw === 'hole'}
              onAddPoint={addHolePoint}
            />
            <HitAreaOverlay
              interactables={scene.interactables}
              selectedIndex={selectedInteractable}
              drawMode={draw === 'hitarea'}
              onAddPoint={addHitAreaPoint}
            />
            <NpcOverlay
              placements={scene.npcs ?? []}
              cast={doc.npcs ?? {}}
              aspect={aspect}
              selectedIndex={selectedNpc}
              mode={draw === 'npc' ? 'place' : draw === 'npcpath' ? 'path' : null}
              onPlace={placeNpc}
              onAddPathPoint={addNpcPathPoint}
            />
          </div>
        )}
      </main>
    </div>
  )
}
