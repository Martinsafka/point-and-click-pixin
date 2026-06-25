import type { GameDoc } from '../data/schema'
import { editorStore } from './editor-store'
import { AssetSwap } from './AssetSwap'

/**
 * The global Sounds library (Sounds tab, M9 9b): upload a clip **once** (stored as a
 * data-URL in the document), name it, and reference it by id everywhere (ambient,
 * footstep, `playSound`, voice, inspect) via a sound picker — no duplication. **Test**
 * plays it; **⇄ Swap** replaces the clip in place (keeps the id + every reference). Ids are
 * fixed at creation (references point at them).
 */
export function SoundList({ sounds }: { sounds: GameDoc['sounds'] }) {
  const s = () => editorStore.getState()
  const map = sounds ?? {}
  const ids = Object.keys(map)

  const test = (src: string) => void import('../audio/audio').then((m) => m.playClip(src))

  return (
    <div className="catalogue">
      <div className="editor__toolbar">
        <AssetSwap accept="audio/*" label="+ Sound" onPick={(src) => s().addSound(src)} />
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
          <AssetSwap
            accept="audio/*"
            label="⇄ Swap"
            title="Replace this clip's audio (keeps the id + references)"
            onPick={(src) => s().setSoundSrc(id, src)}
          />
          <button type="button" className="logic__del" onClick={() => s().removeSound(id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
