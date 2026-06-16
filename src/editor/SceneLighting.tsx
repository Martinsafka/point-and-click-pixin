import type {
  AmbientLight,
  DarkArea,
  ItemDef,
  ItemId,
  LightSource,
  PlayerLightShape,
  SceneId,
} from '../data/schema'
import { editorStore } from './editor-store'
import { ConditionEditor } from './ConditionEditor'
import { Slider } from './Slider'

/**
 * The Scene tab's **Lighting** section (M10 10b): a per-scene **ambient** override + placed
 * **local lights** (shape sphere/cone + deform sliders, `when`-gated) + **dark areas**
 * (polygons drawn on the preview). Lighting shows in-game (▶ Test in game), not the static
 * preview — but light markers + dark-area outlines draw in the preview.
 */
export function SceneLighting({
  sceneId,
  ambientLight,
  lights,
  darkAreas,
  items,
  sceneIds,
  selectedLight,
  onSelectLight,
  lightPlaceMode,
  onToggleLightPlace,
  selectedDarkArea,
  onSelectDarkArea,
  darkDrawMode,
  onToggleDarkDraw,
}: {
  sceneId: SceneId
  ambientLight: AmbientLight | undefined
  lights: LightSource[]
  darkAreas: DarkArea[]
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
  selectedLight: number | null
  onSelectLight: (i: number) => void
  lightPlaceMode: boolean
  onToggleLightPlace: () => void
  selectedDarkArea: number | null
  onSelectDarkArea: (i: number) => void
  darkDrawMode: boolean
  onToggleDarkDraw: () => void
}) {
  const s = () => editorStore.getState()
  const light = selectedLight !== null ? lights[selectedLight] : undefined
  const setLight = (patch: Partial<LightSource>) =>
    selectedLight !== null && s().setLight(sceneId, selectedLight, patch)

  return (
    <>
      {/* Ambient override */}
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!ambientLight}
          onChange={(e) =>
            s().setSceneAmbientLight(
              sceneId,
              e.target.checked ? { color: '#1b2233', intensity: 0.3 } : undefined,
            )
          }
        />
        override ambient (else the project default)
      </label>
      {ambientLight && (
        <div className="logic">
          <div className="intr-form__field">
            <span>colour</span>
            <input
              type="color"
              value={ambientLight.color}
              onChange={(e) => s().setSceneAmbientLight(sceneId, { ...ambientLight, color: e.target.value })}
            />
          </div>
          <Slider
            label="intensity"
            value={ambientLight.intensity}
            min={0}
            max={1}
            step={0.05}
            onChange={(intensity) => s().setSceneAmbientLight(sceneId, { ...ambientLight, intensity })}
          />
          <p className="intr-form__note">1 = daylight · 0 = black (a flashlight scene)</p>
        </div>
      )}

      {/* Lights */}
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addLight(sceneId)}>
          + Light
        </button>
      </div>
      {lights.length > 0 && (
        <ul className="editor__interactables">
          {lights.map((l, i) => (
            <li key={l.id} className="intr-row">
              <button
                type="button"
                className={`intr-row__select${i === selectedLight ? ' intr-row__select--active' : ''}`}
                onClick={() => onSelectLight(i)}
              >
                <span className="intr-row__kind">{l.shape === 'cone' ? 'cone' : 'lamp'}</span> {l.id}
              </button>
              <button type="button" className="intr-row__del" onClick={() => s().removeLight(sceneId, i)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {light && selectedLight !== null && (
        <div className="logic">
          <div className="editor__toolbar">
            <button
              type="button"
              className={lightPlaceMode ? 'editor__btn--active' : undefined}
              onClick={onToggleLightPlace}
            >
              {lightPlaceMode ? 'Done' : 'Place'}
            </button>
            <span className="intr-form__note">
              at {light.x.toFixed(2)}, {light.y.toFixed(2)}
            </span>
            <input
              type="color"
              value={light.color}
              onChange={(e) => setLight({ color: e.target.value })}
            />
            <select
              className="logic__sel"
              value={light.shape ?? 'sphere'}
              onChange={(e) => setLight({ shape: e.target.value as PlayerLightShape })}
            >
              <option value="sphere">sphere</option>
              <option value="cone">cone</option>
            </select>
          </div>
          <Slider label="radius" value={light.radius} min={0.05} max={1.5} step={0.01} onChange={(radius) => setLight({ radius })} />
          <Slider label="intensity" value={light.intensity} min={0} max={2} step={0.05} onChange={(intensity) => setLight({ intensity })} />
          <Slider label="flicker" value={light.flicker ?? 0} min={0} max={1} step={0.05} onChange={(flicker) => setLight({ flicker: flicker || undefined })} />
          <Slider label="rotation°" value={light.rotation ?? 0} min={0} max={360} onChange={(rotation) => setLight({ rotation: rotation || undefined })} />
          <Slider label="width" value={light.scaleX ?? 1} min={0.2} max={3} step={0.05} onChange={(scaleX) => setLight({ scaleX: scaleX === 1 ? undefined : scaleX })} />
          <Slider label="height" value={light.scaleY ?? 1} min={0.2} max={3} step={0.05} onChange={(scaleY) => setLight({ scaleY: scaleY === 1 ? undefined : scaleY })} />
          {light.shape === 'cone' && (
            <Slider label="cone°" value={light.angle ?? 60} min={10} max={170} onChange={(angle) => setLight({ angle })} />
          )}
          <div className="intr-form__field intr-form__field--col">
            <span>when (else always on)</span>
            <ConditionEditor
              condition={light.when}
              onChange={(when) => setLight({ when })}
              items={items}
              sceneIds={sceneIds}
            />
          </div>
        </div>
      )}

      {/* Dark areas */}
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addDarkArea(sceneId)}>
          + Dark area
        </button>
      </div>
      {darkAreas.map((a, i) => (
        <div key={i} className="logic">
          <div className="logic__head">
            <span>dark area {i + 1} · {a.polygon.length / 2} pts</span>
            <button type="button" className="logic__del" onClick={() => s().removeDarkArea(sceneId, i)}>
              ✕
            </button>
          </div>
          <div className="editor__toolbar">
            <button
              type="button"
              className={darkDrawMode && selectedDarkArea === i ? 'editor__btn--active' : undefined}
              onClick={() => {
                onSelectDarkArea(i)
                onToggleDarkDraw()
              }}
            >
              {darkDrawMode && selectedDarkArea === i ? 'Done' : 'Draw'}
            </button>
            <button type="button" onClick={() => s().setDarkAreaPolygon(sceneId, i, [])}>
              Clear
            </button>
          </div>
          <Slider label="feather" value={a.feather ?? 0.04} min={0} max={0.2} step={0.01} onChange={(feather) => s().setDarkAreaFeather(sceneId, i, feather)} />
        </div>
      ))}
    </>
  )
}
