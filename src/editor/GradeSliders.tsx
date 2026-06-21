import type { ColorGrade } from '../data/schema'
import { Slider } from './Slider'

const DEFAULT_TINT = '#6a78ff'

/**
 * The colour-grade controls (M10 10d / M13d) as sliders, one per line — shared by the static scene
 * grade and each day-cycle keyframe. `tint` is a colour **cast** (multiply): pick a colour + a
 * **strength** (0 = none) to add a warm / blue cast a hue rotation can't paint onto grey pixels.
 */
export function GradeSliders({
  grade,
  onChange,
}: {
  grade: ColorGrade
  onChange: (patch: Partial<ColorGrade>) => void
}) {
  return (
    <>
      <Slider
        label="brightness"
        value={grade.brightness}
        min={0}
        max={2}
        step={0.02}
        onChange={(v) => onChange({ brightness: v })}
      />
      <Slider
        label="contrast"
        value={grade.contrast}
        min={0}
        max={2}
        step={0.02}
        onChange={(v) => onChange({ contrast: v })}
      />
      <Slider
        label="saturation"
        value={grade.saturation}
        min={0}
        max={2}
        step={0.02}
        onChange={(v) => onChange({ saturation: v })}
      />
      <Slider label="hue°" value={grade.hue} min={-180} max={180} onChange={(v) => onChange({ hue: v })} />
      <div className="intr-form__field">
        <span>tint</span>
        <input
          type="color"
          value={grade.tint ?? DEFAULT_TINT}
          onChange={(e) => onChange({ tint: e.target.value, tintStrength: grade.tintStrength || 0.3 })}
        />
      </div>
      <Slider
        label="tint strength"
        value={grade.tintStrength ?? 0}
        min={0}
        max={1}
        step={0.02}
        onChange={(v) => onChange({ tintStrength: v, tint: grade.tint ?? DEFAULT_TINT })}
      />
    </>
  )
}
