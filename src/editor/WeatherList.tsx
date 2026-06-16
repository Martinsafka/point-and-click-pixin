import { useState } from 'react'
import type { GameDoc } from '../data/schema'
import { editorStore } from './editor-store'
import { WeatherEditor } from './WeatherEditor'

/**
 * The weather-preset library (Atmosphere tab, M10 10a): parametric particle presets
 * (rain / snow / dust pre-seeded, editable + custom) referenced per scene. **+ Preset**
 * adds one; **Edit** opens the slider editor; **✕** removes it. A scene picks a preset in
 * its **Scene → Weather** section (gated by `when`).
 */
export function WeatherList({ presets }: { presets: GameDoc['weatherPresets'] }) {
  const s = () => editorStore.getState()
  const map = presets ?? {}
  const ids = Object.keys(map)
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="catalogue">
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addWeatherPreset()}>
          + Preset
        </button>
      </div>
      {ids.length === 0 && (
        <p className="layer-list__empty">No presets — add one, then pick it in a scene.</p>
      )}
      {ids.map((id) => (
        <div key={id} className="cursor-row">
          <span className="cursor-row__kind">{map[id].shape === 'streak' ? '⋰' : '∴'}</span>
          <span>{map[id].name || id}</span>
          <button type="button" onClick={() => setEditing(id)}>
            Edit
          </button>
          <button type="button" className="logic__del" onClick={() => s().removeWeatherPreset(id)}>
            ✕
          </button>
        </div>
      ))}
      {editing && <WeatherEditor id={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
