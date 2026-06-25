import { editorStore } from './editor-store'
import type { CursorKind, GameDoc } from '../data/schema'
import { AssetSwap } from './AssetSwap'

const KINDS: CursorKind[] = ['walk', 'pickable', 'interact', 'exit', 'inspect', 'talk', 'default']
const EMOJI: Record<CursorKind, string> = {
  walk: '👣',
  pickable: '✋',
  interact: '⚙️',
  exit: '🚪',
  inspect: '👁',
  talk: '👄',
  default: '↖️',
}

/**
 * Per-context pointer cursors (global). Upload an icon for walk / pickable /
 * interact / exit; with none uploaded the runtime shows the emoji fallback shown
 * here as the preview.
 */
export function CursorEditor({ cursors }: { cursors: GameDoc['cursors'] }) {
  const s = () => editorStore.getState()

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
            <AssetSwap
              accept="image/*,.svg"
              className="editor__import cursor-row__upload"
              label={icon ? '⇄ Swap' : '+ Icon'}
              onPick={(src) => s().setCursorIcon(k, src)}
            />
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
