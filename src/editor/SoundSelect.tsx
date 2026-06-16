import { editorStore } from './editor-store'

/**
 * Pick a sound from the global library (`GameDoc.sounds`, M9 9b) by id. Reads the library
 * straight from the editor store (it's the working doc). Upload new clips in the Sounds
 * tab; here you only reference one. `empty` adds a leading "— none —".
 */
export function SoundSelect({
  value,
  onChange,
  empty = true,
}: {
  value: string | undefined
  onChange: (id: string | undefined) => void
  empty?: boolean
}) {
  const sounds = editorStore.getState().doc.sounds ?? {}
  const ids = Object.keys(sounds)
  // Keep a stale / unknown id selectable so it's never silently dropped.
  const known = value && !sounds[value] ? [value, ...ids] : ids
  return (
    <select
      className="logic__sel"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      {empty && <option value="">— none —</option>}
      {known.map((id) => (
        <option key={id} value={id}>
          {sounds[id]?.name ?? id}
        </option>
      ))}
    </select>
  )
}
