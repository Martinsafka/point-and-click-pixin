import { type ChangeEvent } from 'react'
import { editorStore } from './editor-store'
import type { CursorKind, GameDoc } from '../data/schema'

const KINDS: CursorKind[] = ['walk', 'pickable', 'interact', 'exit', 'inspect']
const EMOJI: Record<CursorKind, string> = {
  walk: '👣',
  pickable: '✋',
  interact: '⚙️',
  exit: '🚪',
  inspect: '👁',
}

/**
 * Per-context pointer cursors (global). Upload an icon for walk / pickable /
 * interact / exit; with none uploaded the runtime shows the emoji fallback shown
 * here as the preview.
 */
export function CursorEditor({ cursors }: { cursors: GameDoc['cursors'] }) {
  const s = () => editorStore.getState()

  const onUpload = (kind: CursorKind, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      let src = String(reader.result)
      if (/\.svg$/i.test(file.name) && !src.startsWith('data:image/svg+xml')) {
        src = src.replace(/^data:[^,;]*/, 'data:image/svg+xml')
      }
      s().setCursorIcon(kind, src)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="catalogue">
      {KINDS.map((k) => {
        const icon = cursors?.[k]
        return (
          <div key={k} className="cursor-row">
            <span className="cursor-row__kind">{k}</span>
            <span className="cursor-row__preview">
              {icon ? <img src={icon} alt="" /> : EMOJI[k]}
            </span>
            <label className="editor__import cursor-row__upload">
              {icon ? 'Change' : '+ Icon'}
              <input type="file" accept="image/*,.svg" hidden onChange={(e) => onUpload(k, e)} />
            </label>
            {icon && (
              <button
                type="button"
                className="logic__del"
                onClick={() => s().setCursorIcon(k, undefined)}
              >
                ✕
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
