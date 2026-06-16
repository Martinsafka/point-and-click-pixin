import { editorStore } from './editor-store'
import { EditorModal } from './EditorModal'
import { SoundField } from './SoundField'
import type { WeatherPreset, WeatherShape } from '../data/schema'

/** A labelled range slider with a live value readout. */
function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <label className="weather-slider">
      <span className="weather-slider__label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="weather-slider__val">{value}</span>
    </label>
  )
}

/**
 * The weather-preset editor (M10 10a, Atmosphere tab → Edit). All particle parameters as
 * **sliders** — shape / blend pickers, a colour swatch, and an optional **ambient** sound
 * (a library reference, layered over the scene ambient). Edits commit live; test the look
 * with **▶ Test in game**.
 */
export function WeatherEditor({ id, onClose }: { id: string; onClose: () => void }) {
  const s = () => editorStore.getState()
  const preset = s().doc.weatherPresets?.[id]
  if (!preset) return null
  const patch = (p: Partial<WeatherPreset>) => s().setWeatherPreset(id, p)

  return (
    <EditorModal title={`Weather · ${preset.name || id}`} onClose={onClose}>
      <div className="intr-form__field">
        <span>name</span>
        <input
          className="logic__in"
          value={preset.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </div>
      <div className="intr-form__field">
        <span>shape</span>
        <select
          className="logic__sel"
          value={preset.shape}
          onChange={(e) => patch({ shape: e.target.value as WeatherShape })}
        >
          <option value="round">round (snow / dust)</option>
          <option value="streak">streak (rain)</option>
        </select>
        <span>blend</span>
        <select
          className="logic__sel"
          value={preset.blend}
          onChange={(e) => patch({ blend: e.target.value as 'normal' | 'add' })}
        >
          <option value="normal">normal</option>
          <option value="add">add (glow)</option>
        </select>
        <span>colour</span>
        <input
          type="color"
          value={preset.color}
          onChange={(e) => patch({ color: e.target.value })}
        />
      </div>

      <Slider label="count" value={preset.count} min={0} max={1500} step={10} onChange={(count) => patch({ count })} />
      <Slider label="alpha" value={preset.alpha} min={0} max={1} step={0.05} onChange={(alpha) => patch({ alpha })} />
      <Slider label="size" value={preset.size} min={1} max={60} onChange={(size) => patch({ size })} />
      <Slider label="angle°" value={preset.angle} min={0} max={180} onChange={(angle) => patch({ angle })} />
      <Slider label="speed" value={preset.speed} min={0} max={1400} step={10} onChange={(speed) => patch({ speed })} />
      <Slider label="sway" value={preset.sway} min={0} max={120} onChange={(sway) => patch({ sway })} />
      <Slider label="sway freq" value={preset.swayFreq} min={0} max={2} step={0.05} onChange={(swayFreq) => patch({ swayFreq })} />

      <SoundField
        label="ambient (over scene)"
        value={preset.ambient}
        defaultVolume={0.45}
        onChange={(ambient) => patch({ ambient })}
      />
    </EditorModal>
  )
}
