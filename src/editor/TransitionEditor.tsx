import type { GameDoc } from '../data/schema'
import { editorStore } from './editor-store'
import { AssetSwap } from './AssetSwap'

/**
 * Scene-swap transition (global): the colour the swap washes through, an optional
 * centred art image shown over it, and a minimum hold (ms). With nothing set the
 * game fades through plain black. A slow scene mount also shows a loading spinner.
 */
export function TransitionEditor({ transition }: { transition: GameDoc['transition'] }) {
  const s = () => editorStore.getState()

  return (
    <div className="transition">
      <div className="intr-form__field">
        <span>colour</span>
        <input
          type="color"
          value={transition?.color ?? '#000000'}
          onChange={(e) => s().setTransition({ color: e.target.value })}
        />
      </div>
      <div className="intr-form__field">
        <span>art</span>
        <AssetSwap
          accept="image/*,.svg"
          label={transition?.image ? '⇄ Swap' : '+ Image'}
          onPick={(src) => s().setTransition({ image: src })}
        />
        {transition?.image && (
          <button
            type="button"
            className="logic__del"
            onClick={() => s().setTransition({ image: undefined })}
          >
            ✕
          </button>
        )}
      </div>
      <div className="intr-form__field">
        <span>min hold</span>
        <input
          className="logic__in"
          type="number"
          min="0"
          step="50"
          value={transition?.minMs ?? 0}
          onChange={(e) => s().setTransition({ minMs: Math.max(0, Number(e.target.value) || 0) })}
        />
        <span className="intr-form__note">ms</span>
      </div>
    </div>
  )
}
