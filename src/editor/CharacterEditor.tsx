import { useState } from 'react'
import type { AnimClip, ViewDescriptor } from '../data/schema'
import { AssetSwap } from './AssetSwap'
import { FramesUpload } from './FramesUpload'
import { SoundSelect } from './SoundSelect'

function parseFrames(text: string): number[] {
  return text
    .split(',')
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n))
}

function num(value: string, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/** The atlas image with a numbered frame grid overlaid (so clips can reference
 *  frame indices). Rows are derived from the image height / frame height. */
function AtlasPreview({ desc }: { desc: ViewDescriptor }) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
  const cols = Math.max(1, desc.columns)
  const rows = dims ? Math.max(1, Math.round(dims.h / desc.frameHeight)) : 0
  return (
    <div className="char-atlas">
      <img
        className="char-atlas__img"
        src={desc.atlas}
        alt="atlas"
        onLoad={(e) =>
          setDims({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })
        }
      />
      {rows > 0 && (
        <div
          className="char-atlas__grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {Array.from({ length: rows * cols }, (_, i) => (
            <span key={i} className="char-atlas__cell">
              {i}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * A character view editor — controlled, so it serves both the player (Characters tab)
 * and any NPC (the NPC modal). Upload an atlas, set the frame grid + anchor, and define
 * clips (`idle.S`, `walk.E`, `pickup`, …) — frame indices (shown numbered on the atlas)
 * + fps + loop. Absent `view` → the game uses the built-in placeholder; `onCreate`
 * seeds one. Runtime: entities/sprite-view.ts. Clip name / frames commit on blur.
 */
export function CharacterEditor({
  view,
  onCreate,
  onChange,
  onRemove,
}: {
  view: ViewDescriptor | undefined
  onCreate: () => void
  onChange: (patch: Partial<ViewDescriptor>) => void
  onRemove: () => void
}) {
  if (!view) {
    return (
      <div className="char-editor">
        <p className="editor__hint">
          No character yet — the game uses the built-in placeholder figure.
        </p>
        <div className="editor__toolbar">
          <button type="button" onClick={onCreate}>
            Create from placeholder
          </button>
        </div>
      </div>
    )
  }

  const clips = view.clips
  const setClips = (next: Record<string, AnimClip>) => onChange({ clips: next })
  const renameClip = (oldName: string, newName: string) => {
    if (!newName || (newName !== oldName && clips[newName])) return
    const next: Record<string, AnimClip> = {}
    for (const [k, v] of Object.entries(clips)) next[k === oldName ? newName : k] = v
    setClips(next)
  }
  const patchClip = (name: string, patch: Partial<AnimClip>) =>
    setClips({ ...clips, [name]: { ...clips[name], ...patch } })
  const deleteClip = (name: string) => {
    const next = { ...clips }
    delete next[name]
    setClips(next)
  }
  const addClip = () => {
    let name = 'clip'
    let n = 1
    while (clips[name]) {
      n += 1
      name = `clip-${n}`
    }
    setClips({ ...clips, [name]: { frames: [0], fps: 8, loop: true } })
  }

  return (
    <div className="char-editor">
      <AtlasPreview desc={view} />
      <div className="editor__toolbar">
        <AssetSwap
          accept="image/*,.svg"
          label="⇄ Swap atlas"
          onPick={(atlas) => onChange({ atlas })}
        />
        <FramesUpload
          label="+ Frames"
          onPack={(a) =>
            onChange({
              atlas: a.src,
              frameWidth: a.frameWidth,
              frameHeight: a.frameHeight,
              columns: a.columns,
            })
          }
        />
        <button type="button" onClick={onRemove}>
          Remove
        </button>
      </div>

      <div className="intr-form__field">
        <span>frame</span>
        <input
          className="logic__in"
          type="number"
          value={view.frameWidth}
          onChange={(e) => onChange({ frameWidth: num(e.target.value, view.frameWidth) })}
        />
        <span>×</span>
        <input
          className="logic__in"
          type="number"
          value={view.frameHeight}
          onChange={(e) => onChange({ frameHeight: num(e.target.value, view.frameHeight) })}
        />
      </div>
      <div className="intr-form__field">
        <span>cols</span>
        <input
          className="logic__in"
          type="number"
          value={view.columns}
          onChange={(e) => onChange({ columns: num(e.target.value, view.columns) })}
        />
        <span>anchor</span>
        <input
          className="logic__in"
          type="number"
          step="0.1"
          value={view.anchorX}
          onChange={(e) => onChange({ anchorX: num(e.target.value, view.anchorX) })}
        />
        <input
          className="logic__in"
          type="number"
          step="0.1"
          value={view.anchorY}
          onChange={(e) => onChange({ anchorY: num(e.target.value, view.anchorY) })}
        />
      </div>

      <div className="logic">
        <div className="logic__head">
          <span>Clips</span>
          <button type="button" className="logic__add" onClick={addClip}>
            + Clip
          </button>
        </div>
        {Object.entries(clips).map(([name, clip]) => (
          <div key={name} className="clip-row">
            <div className="clip-row__head">
              <input
                className="logic__sel"
                defaultValue={name}
                onBlur={(e) => renameClip(name, e.target.value.trim())}
              />
              <label className="logic__chk">
                fps
                <input
                  className="clip-row__fps"
                  type="number"
                  value={clip.fps}
                  onChange={(e) => patchClip(name, { fps: num(e.target.value, clip.fps) })}
                />
              </label>
              <label className="logic__chk">
                <input
                  type="checkbox"
                  checked={clip.loop}
                  onChange={(e) => patchClip(name, { loop: e.target.checked })}
                />
                loop
              </label>
              <button type="button" className="logic__del" onClick={() => deleteClip(name)}>
                ✕
              </button>
            </div>
            <input
              className="logic__in clip-row__frames"
              defaultValue={clip.frames.join(', ')}
              placeholder="frames e.g. 0, 1, 2"
              onBlur={(e) => patchClip(name, { frames: parseFrames(e.target.value) })}
            />
            <label className="clip-row__sound">
              sound
              <SoundSelect
                value={clip.sound}
                onChange={(sound) => patchClip(name, { sound })}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}
