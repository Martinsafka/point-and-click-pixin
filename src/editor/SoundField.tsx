import type { SoundConfig } from '../data/schema'
import { SoundSelect } from './SoundSelect'

/**
 * A sound binding control (M9): pick a sound from the global library (Sounds tab) + set
 * its volume. Used for scene ambient + the document's default ambient / footstep. Emits
 * `undefined` when no sound is picked.
 */
export function SoundField({
  label,
  value,
  defaultVolume = 0.4,
  onChange,
}: {
  label: string
  value: SoundConfig | undefined
  defaultVolume?: number
  onChange: (v: SoundConfig | undefined) => void
}) {
  return (
    <div className="intr-form__field">
      <span>{label}</span>
      <SoundSelect
        value={value?.sound}
        onChange={(sound) =>
          onChange(sound ? { sound, volume: value?.volume ?? defaultVolume } : undefined)
        }
      />
      {value?.sound && (
        <>
          <span>vol</span>
          <input
            className="logic__in"
            type="number"
            min="0"
            max="1"
            step="0.05"
            value={value.volume ?? defaultVolume}
            onChange={(e) => onChange({ ...value, volume: Number(e.target.value) || 0 })}
          />
        </>
      )}
    </div>
  )
}
