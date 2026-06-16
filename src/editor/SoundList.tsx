import { type ChangeEvent } from 'react'
import type { GameDoc } from '../data/schema'
import { editorStore } from './editor-store'

/**
 * The global Sounds library (Sounds tab, M9 9b): upload a clip **once** (stored as a
 * data-URL in the document), name it, and reference it by id everywhere (ambient,
 * footstep, `playSound`, voice, inspect) via a sound picker — no duplication. **Test**
 * plays it. Ids are fixed at creation (references point at them).
 */
export function SoundList({ sounds }: { sounds: GameDoc['sounds'] }) {
  const s = () => editorStore.getState()
  const map = sounds ?? {}
  const ids = Object.keys(map)

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => s().addSound(String(reader.result))
    reader.readAsDataURL(file)
  }

  const test = (src: string) => void import('../audio/audio').then((m) => m.playClip(src))

  return (
    <div className="catalogue">
      <div className="editor__toolbar">
        <label className="editor__import">
          + Sound
          <input type="file" accept="audio/*" hidden onChange={onUpload} />
        </label>
      </div>
      {ids.length === 0 && (
        <p className="layer-list__empty">
          No sounds yet — upload clips here, then reference them (ambient / footstep /
          playSound / voice / inspect).
        </p>
      )}
      {ids.map((id) => (
        <div key={id} className="cursor-row">
          <span className="cursor-row__kind">{id}</span>
          <input
            value={map[id].name}
            placeholder="name"
            onChange={(e) => s().setSoundName(id, e.target.value)}
          />
          <button type="button" onClick={() => test(map[id].src)}>
            Test
          </button>
          <button type="button" className="logic__del" onClick={() => s().removeSound(id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
