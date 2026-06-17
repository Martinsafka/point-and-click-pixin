import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { editorStore, exportDoc, importDocFromFile, useEditor } from './editor-store'
import { clearDocDraft, hasDocDraft, saveDocDraft } from '../data/doc-draft'
import type { InteractableData } from '../data/schema'
import { DEFAULT_REFERENCE_HEIGHT } from '../data/scene-config'
import { ScenePreview } from './ScenePreview'
import { SceneViewport } from './SceneViewport'
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
import { SequenceList } from './SequenceList'
import { SoundField } from './SoundField'
import { SoundList } from './SoundList'
import { SoundSelect } from './SoundSelect'
import { WeatherList } from './WeatherList'
import { SceneWeather } from './SceneWeather'
import { SceneLighting } from './SceneLighting'
import { SceneEmitters } from './SceneEmitters'
import { SceneFog } from './SceneFog'
import { SceneGrade } from './SceneGrade'
import { LightingDefaults } from './LightingDefaults'
import { LightOverlay } from './LightOverlay'
import { EmitterOverlay } from './EmitterOverlay'
import { ConditionEditor } from './ConditionEditor'
import { FloatingEditor, type FloatPanel } from './FloatingEditor'
import { WorldState } from './WorldState'
import { setSoundLibrary } from '../audio/audio'

const TABS = [
  'scene',
  'items',
  'characters',
  'dialogs',
  'sequences',
  'sounds',
  'atmosphere',
  'project',
] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL: Record<Tab, string> = {
  scene: 'Scene',
  items: 'Items',
  characters: 'Characters',
  dialogs: 'Dialogs',
  sequences: 'Cutscenes',
  sounds: 'Sounds',
  atmosphere: 'Atmosphere',
  project: 'Project',
}

/** Which polygon draw / placement mode is active (overlays share the preview). */
type Draw =
  | 'walkable'
  | 'hole'
  | 'hitarea'
  | 'npc'
  | 'npcpath'
  | 'light'
  | 'darkarea'
  | 'emitter'
  | null

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
 * The dev-only editor shell (`?edit`, ME.6: one Pixi world). Edits a working `GameDoc` over
 * the **live** game running fullscreen: a top-left **launcher** opens floating windows for
 * each section (`renderTab` + the World window), the placement / drawing overlays ride the
 * world rect (`SceneViewport`), and a top-right toolbar plays / discards the draft.
 */
export function Editor() {
  const doc = useEditor((s) => s.doc)
  const selectedId = useEditor((s) => s.selectedSceneId)
  const revision = useEditor((s) => s.revision)
  const [draw, setDraw] = useState<Draw>(null)
  const [selectedInteractable, setSelectedInteractable] = useState<number | null>(null)
  const [selectedHole, setSelectedHole] = useState<number | null>(null)
  const [selectedNpc, setSelectedNpc] = useState<number | null>(null)
  const [selectedLight, setSelectedLight] = useState<number | null>(null)
  const [selectedDarkArea, setSelectedDarkArea] = useState<number | null>(null)
  const [selectedEmitter, setSelectedEmitter] = useState<number | null>(null)
  // Which of the selected placement's named paths is being drawn (index), in `npcpath` mode.
  const [drawPathIndex, setDrawPathIndex] = useState<number | null>(null)
  // The width slider drives a live % during drag, committing (one preview re-mount, since
  // width changes the design aspect) on release; null means "read the saved value". The
  // character-size slider is a hot tunable (ME.3) — it commits live, no re-mount.
  const [widthDraft, setWidthDraft] = useState<number | null>(null)
  // Freeze the live world (NPC motion + routines) while authoring, so wandering NPCs don't
  // get in the way; edits still apply (the ticker is stopped, not the React tree).
  const [paused, setPaused] = useState(false)
  const mainRef = useRef<HTMLElement>(null)

  const sceneIds = Object.keys(doc.scenes)
  const scene = doc.scenes[selectedId]
  const holes = scene?.holes ?? []
  // NPCs already placed in THIS scene — one placement per NPC per scene (a character can
  // be placed in several scenes; its runtime location picks the active one, `moveNpc`
  // moves it). So the picker only blocks a duplicate placement within the same scene.
  const placedNpcIds = new Set((scene?.npcs ?? []).map((p) => p.npc))

  const select = (id: string) => {
    editorStore.getState().selectScene(id)
    setDraw(null)
    setSelectedInteractable(null)
    setSelectedHole(null)
    setSelectedNpc(null)
    setSelectedLight(null)
    setSelectedDarkArea(null)
    setSelectedEmitter(null)
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
  const charScale = scene?.characterScale ?? 1
  const commitWidth = () => {
    if (widthDraft === null) return
    editorStore.getState().setSceneWidth(selectedId, Math.max(refH, Math.round(widthDraft) || refH))
    setWidthDraft(null)
  }

  // The preview "stage" is a box of the scene's aspect, fit inside the preview pane
  // Keep the audio resolver pointed at the *working* document's sound library, so the
  // editor's Test buttons (voice preview) resolve sounds added but not yet in the game.
  useEffect(() => {
    const sync = () => setSoundLibrary(editorStore.getState().doc.sounds)
    sync()
    return editorStore.subscribe(sync)
  }, [])

  // Nudge Pixi (resizeTo: host listens to window 'resize') whenever the preview pane changes
  // size — window resize, panel show/hide, or panel drag — so the canvas re-fits to the pane.
  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    const obs = new ResizeObserver(() => window.dispatchEvent(new Event('resize')))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

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
    if (selectedNpc !== null && drawPathIndex !== null) {
      editorStore
        .getState()
        .addNpcPathPoint(selectedId, selectedNpc, drawPathIndex, round(xFrac), round(yFrac))
    }
  }
  const placeLight = (xFrac: number, yFrac: number) => {
    if (selectedLight !== null) {
      editorStore.getState().setLightPos(selectedId, selectedLight, round(xFrac), round(yFrac))
    }
  }
  const placeEmitter = (xFrac: number, yFrac: number) => {
    if (selectedEmitter !== null) {
      editorStore.getState().setEmitterPos(selectedId, selectedEmitter, round(xFrac), round(yFrac))
    }
  }
  const addDarkAreaPoint = (xFrac: number, yFrac: number) => {
    if (selectedDarkArea !== null) {
      const area = scene?.darkAreas?.[selectedDarkArea]
      if (!area) return
      editorStore
        .getState()
        .setDarkAreaPolygon(selectedId, selectedDarkArea, [...area.polygon, round(xFrac), round(yFrac)])
    }
  }
  // Toggle drawing waypoints into a specific named path of the selected placement.
  const toggleDrawPath = (pathIdx: number) => {
    if (draw === 'npcpath' && drawPathIndex === pathIdx) {
      setDraw(null)
      setDrawPathIndex(null)
    } else {
      setDraw('npcpath')
      setDrawPathIndex(pathIdx)
    }
  }

  // Save the working doc as a dev draft (IndexedDB) and open the game (drops `?edit`).
  // Await the write so the draft is committed before the reload re-reads it.
  const testInGame = async () => {
    await saveDocDraft(editorStore.getState().doc)
    window.location.assign(window.location.pathname)
  }
  const discardDraft = async () => {
    await clearDocDraft()
    window.location.reload()
  }

  const pointCount = scene ? scene.walkable.length / 2 : 0
  const selInteractable =
    selectedInteractable !== null ? scene?.interactables[selectedInteractable] : undefined

  // The content of one top-level tab. Defined once and rendered in BOTH the fixed left panel
  // and the floating launcher windows (ME.2), so there's a single source per tab.
  const renderTab = (t: Tab): ReactNode => (
    <>
      {t === 'scene' && (
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
                onChange={(e) =>
                  editorStore.getState().setCharacterScale(selectedId, Number(e.target.value))
                }
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
                    <button type="button" className="intr-row__del" onClick={() => removeHole(i)}>
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
                drawPathIndex={draw === 'npcpath' ? drawPathIndex : null}
                onToggleDrawPath={toggleDrawPath}
                items={doc.items}
                sceneIds={sceneIds}
              />
            )}
          </Section>

          <Section title="Audio">
            {scene && (
              <>
                <SoundField
                  label="ambient"
                  value={scene.ambient}
                  onChange={(v) =>
                    editorStore
                      .getState()
                      .setSceneAmbient(selectedId, v ? { ...v, when: scene.ambient?.when } : undefined)
                  }
                />
                {scene.ambient && (
                  <div className="intr-form__field intr-form__field--col">
                    <span>ambient when (else the document default plays)</span>
                    <ConditionEditor
                      condition={scene.ambient.when}
                      onChange={(when) =>
                        editorStore.getState().setSceneAmbient(selectedId, { ...scene.ambient!, when })
                      }
                      items={doc.items}
                      sceneIds={sceneIds}
                    />
                  </div>
                )}
                <p className="intr-form__note">
                  No ambient → the document default (Project tab) plays.
                </p>
              </>
            )}
          </Section>

          <Section title="Weather">
            {scene && (
              <SceneWeather
                sceneId={selectedId}
                weather={scene.weather ?? []}
                presets={doc.weatherPresets ?? {}}
                items={doc.items}
                sceneIds={sceneIds}
              />
            )}
          </Section>

          <Section title="Lighting">
            {scene && (
              <SceneLighting
                sceneId={selectedId}
                ambientLight={scene.ambientLight}
                lights={scene.lights ?? []}
                darkAreas={scene.darkAreas ?? []}
                items={doc.items}
                sceneIds={sceneIds}
                selectedLight={selectedLight}
                onSelectLight={(i) => {
                  setSelectedLight(i)
                  setDraw(null)
                }}
                lightPlaceMode={draw === 'light'}
                onToggleLightPlace={() => toggle('light')}
                selectedDarkArea={selectedDarkArea}
                onSelectDarkArea={setSelectedDarkArea}
                darkDrawMode={draw === 'darkarea'}
                onToggleDarkDraw={() => toggle('darkarea')}
              />
            )}
          </Section>

          <Section title={`Emitters · ${scene ? (scene.emitters?.length ?? 0) : 0}`}>
            {scene && (
              <SceneEmitters
                sceneId={selectedId}
                emitters={scene.emitters ?? []}
                items={doc.items}
                sceneIds={sceneIds}
                selected={selectedEmitter}
                onSelect={(i) => {
                  setSelectedEmitter(i)
                  setDraw(null)
                }}
                placeMode={draw === 'emitter'}
                onTogglePlace={() => toggle('emitter')}
              />
            )}
          </Section>

          <Section title="Fog">
            {scene && <SceneFog sceneId={selectedId} fog={scene.fog} layers={scene.layers} />}
          </Section>

          <Section title="Grade & FX">
            {scene && (
              <SceneGrade
                sceneId={selectedId}
                colorGrade={scene.colorGrade}
                vignette={scene.vignette}
                lightning={scene.lightning}
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
                  : draw === 'light'
                    ? 'Click in the preview to position the light.'
                    : draw === 'emitter'
                      ? 'Click in the preview to position the emitter.'
                      : draw === 'darkarea'
                        ? 'Click in the preview to add dark-area points.'
                        : `Click in the preview to add ${
                            draw === 'walkable' ? 'walkable' : draw === 'hole' ? 'hole' : 'hit-area'
                          } points.`}
            </p>
          )}
        </>
      )}

      {t === 'items' && (
        <>
          <Section title={`Items · ${Object.keys(doc.items).length}`}>
            <ItemCatalogue items={doc.items} />
          </Section>
          <Section title={`Recipes · ${(doc.recipes ?? []).length}`}>
            <RecipeTable recipes={doc.recipes ?? []} items={doc.items} />
          </Section>
        </>
      )}

      {t === 'characters' && (
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

      {t === 'dialogs' && (
        <Section title={`Dialogs · ${Object.keys(doc.dialogs ?? {}).length}`}>
          <DialogList dialogs={doc.dialogs} />
        </Section>
      )}

      {t === 'sequences' && (
        <Section title={`Cutscenes · ${Object.keys(doc.sequences ?? {}).length}`}>
          <SequenceList sequences={doc.sequences} />
        </Section>
      )}

      {t === 'sounds' && (
        <Section title={`Sounds · ${Object.keys(doc.sounds ?? {}).length}`}>
          <SoundList sounds={doc.sounds} />
        </Section>
      )}

      {t === 'atmosphere' && (
        <Section title={`Weather presets · ${Object.keys(doc.weatherPresets ?? {}).length}`}>
          <WeatherList presets={doc.weatherPresets} />
        </Section>
      )}

      {t === 'project' && (
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
                      Math.max(240, Math.round(Number(e.target.value)) || DEFAULT_REFERENCE_HEIGHT),
                    )
                }
              />
              <span className="intr-form__note">px · the game's vertical resolution</span>
            </div>
          </Section>
          <Section title="Cursors">
            <CursorEditor cursors={doc.cursors} />
          </Section>
          <Section title="Audio">
            <SoundField
              label="default ambient"
              value={doc.ambient}
              onChange={(v) => editorStore.getState().setDocAmbient(v)}
            />
            <SoundField
              label="footstep"
              value={doc.footstep}
              defaultVolume={0.5}
              onChange={(v) => editorStore.getState().setDocFootstep(v)}
            />
            <label className="logic__chk">
              <input
                type="checkbox"
                checked={!doc.footstepsOff}
                onChange={(e) => editorStore.getState().setFootstepsOff(!e.target.checked)}
              />
              footsteps while walking
            </label>
            <div className="intr-form__field">
              <span>pickup SFX</span>
              <SoundSelect
                value={doc.pickupSound}
                onChange={(id) => editorStore.getState().setPickupSound(id)}
              />
            </div>
            <div className="intr-form__field">
              <span>transition SFX</span>
              <SoundSelect
                value={doc.transitionSound}
                onChange={(id) => editorStore.getState().setTransitionSound(id)}
              />
            </div>
            <p className="intr-form__note">
              Empty → a built-in procedural sound. Upload your own in the Sounds tab.
            </p>
          </Section>
          <Section title="Lighting">
            <LightingDefaults doc={doc} />
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
    </>
  )

  // ME.2 — the same tabs, available as floating windows over the live world (launcher top-left
  // of the preview). The launcher mirrors the fixed panel's tabs one-to-one; both render
  // `renderTab`, so they coexist on one source during the migration (the panel goes in ME.6).
  // Plus the ME.5 **World** window (launcher-only): drive the live world's state to author
  // against (flags / items / scene), reacting where the game already does.
  const floatPanels: FloatPanel[] = [
    ...TABS.map((t) => ({ id: t, label: TAB_LABEL[t], render: () => renderTab(t) })),
    { id: 'world', label: 'World', render: () => <WorldState /> },
  ]

  return (
    <div className="editor">
      <main className="editor__preview" ref={mainRef}>
        {scene && (
          <div className="editor__stage editor__stage--fill">
            <ScenePreview key={`${selectedId}-${revision}`} scene={scene} paused={paused} />
            <SceneViewport design={{ width: savedWidth, height: refH }}>
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
              <LightOverlay
                lights={scene.lights ?? []}
                darkAreas={scene.darkAreas ?? []}
                selectedLight={selectedLight}
                selectedDarkArea={selectedDarkArea}
                mode={draw === 'light' ? 'light' : draw === 'darkarea' ? 'darkarea' : null}
                onPlaceLight={placeLight}
                onAddDarkPoint={addDarkAreaPoint}
              />
              <EmitterOverlay
                emitters={scene.emitters ?? []}
                selected={selectedEmitter}
                placeMode={draw === 'emitter'}
                onPlace={placeEmitter}
              />
            </SceneViewport>
          </div>
        )}
        <FloatingEditor panels={floatPanels} />
        <div className="preview-tools">
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            title={paused ? 'Resume the live world' : 'Freeze the live world (NPCs stop moving)'}
          >
            {paused ? '⏵ Resume' : '⏸ Freeze'}
          </button>
          <button type="button" className="editor__test" onClick={() => void testInGame()}>
            ▶ Test in game
          </button>
          <button type="button" onClick={() => void discardDraft()} disabled={!hasDocDraft()}>
            Discard
          </button>
        </div>
      </main>
    </div>
  )
}
