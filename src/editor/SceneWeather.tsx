import type { Condition, ItemDef, ItemId, SceneId, WeatherId, WeatherPreset } from '../data/schema'
import { editorStore } from './editor-store'
import { ConditionEditor } from './ConditionEditor'

/**
 * Per-scene weather (M10 10a): a **conditional list** of presets — the first whose `when`
 * passes plays (reactive, so a story flag triggers / swaps weather). Pick a preset (from
 * the Atmosphere tab) + an optional `when` gate; **+ Weather** adds an entry, **✕** removes.
 */
export function SceneWeather({
  sceneId,
  weather,
  presets,
  items,
  sceneIds,
}: {
  sceneId: SceneId
  weather: { preset: WeatherId; when?: Condition }[]
  presets: Record<WeatherId, WeatherPreset>
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
}) {
  const s = () => editorStore.getState()
  const ids = Object.keys(presets)

  return (
    <>
      <div className="editor__toolbar">
        <button type="button" disabled={ids.length === 0} onClick={() => s().addSceneWeather(sceneId)}>
          + Weather
        </button>
        {ids.length === 0 && <span className="intr-form__note">add a preset in the Atmosphere tab first</span>}
      </div>
      {weather.map((w, i) => (
        <div key={i} className="logic">
          <div className="logic__head">
            <span>weather {i + 1}</span>
            <button type="button" className="logic__del" onClick={() => s().removeSceneWeather(sceneId, i)}>
              ✕
            </button>
          </div>
          <div className="intr-form__field">
            <span>preset</span>
            <select
              className="logic__sel"
              value={w.preset}
              onChange={(e) => s().setSceneWeatherPreset(sceneId, i, e.target.value)}
            >
              {ids.map((id) => (
                <option key={id} value={id}>
                  {presets[id].name || id}
                </option>
              ))}
            </select>
          </div>
          <div className="intr-form__field intr-form__field--col">
            <span>when (else the next entry / none)</span>
            <ConditionEditor
              condition={w.when}
              onChange={(c) => s().setSceneWeatherWhen(sceneId, i, c)}
              items={items}
              sceneIds={sceneIds}
            />
          </div>
        </div>
      ))}
    </>
  )
}
