import { editorStore } from './editor-store'
import type { LayerData, LayerFit, LayerRole, SceneBand, SceneId } from '../data/schema'
import { hhmmToMinutes, minutesToHHMM } from './time-format'
import { AssetSwap } from './AssetSwap'

const BANDS: SceneBand[] = ['background', 'mid', 'foreground']
const FITS: LayerFit[] = ['none', 'width', 'cover', 'contain', 'stretch']
const ROLES: LayerRole[] = ['scenery', 'occluder', 'floor']

function layerLabel(layer: LayerData): string {
  return layer.kind === 'builtin' ? layer.builder : layer.kind
}

/**
 * Per-scene layer stack: upload an image (→ a background backdrop), then set each
 * layer's band / fit / role and reorder, **swap its image**, or delete it. Image uploads are
 * read as data-URLs and stored in the document, so they survive export. Builtin (code)
 * layers appear here too and can be rebanded / reordered / removed.
 */
export function LayerList({ sceneId, layers }: { sceneId: SceneId; layers: LayerData[] }) {
  return (
    <div className="layer-list">
      <div className="editor__toolbar">
        <AssetSwap
          accept="image/*,.svg"
          label="+ Image"
          onPick={(src) => editorStore.getState().addImageLayer(sceneId, src)}
        />
        <AssetSwap
          accept="image/*,.svg"
          label="+ Animated"
          onPick={(src) => editorStore.getState().addAnimatedLayer(sceneId, src)}
        />
      </div>
      {layers.length === 0 && <p className="layer-list__empty">No layers yet — upload an image.</p>}
      <ul className="layer-list__items">
        {layers.map((layer, i) => (
          <li key={i} className="layer-row">
            <div className="layer-row__head">
              <span className="layer-row__label" title={layerLabel(layer)}>
                {layerLabel(layer)}
              </span>
              <div className="layer-row__btns">
                <button
                  type="button"
                  title="Move up"
                  disabled={i === 0}
                  onClick={() => editorStore.getState().moveLayer(sceneId, i, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  title="Move down"
                  disabled={i === layers.length - 1}
                  onClick={() => editorStore.getState().moveLayer(sceneId, i, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => editorStore.getState().removeLayer(sceneId, i)}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="layer-row__controls">
              <select
                value={layer.band}
                title="Band"
                onChange={(e) =>
                  editorStore.getState().setLayerBand(sceneId, i, e.target.value as SceneBand)
                }
              >
                {BANDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              {(layer.kind === 'image' || layer.kind === 'animated') && (
                <select
                  value={layer.fit ?? 'none'}
                  title="Fit"
                  onChange={(e) =>
                    editorStore.getState().setLayerFit(sceneId, i, e.target.value as LayerFit)
                  }
                >
                  {FITS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              )}
              {(layer.kind === 'image' || layer.kind === 'animated') && (
                <input
                  type="text"
                  className="logic__in layer-row__parallax"
                  title="Day-cycle peak time (HH:MM). Background layers that set a peak cross-dissolve over the game clock."
                  placeholder="peak HH:MM"
                  defaultValue={minutesToHHMM(layer.timeFadeAt)}
                  onChange={(e) => {
                    const v = e.target.value.trim()
                    if (v === '') editorStore.getState().setLayerTimeFade(sceneId, i, undefined)
                    else {
                      const m = hhmmToMinutes(v)
                      if (m !== undefined) editorStore.getState().setLayerTimeFade(sceneId, i, m)
                    }
                  }}
                />
              )}
              <select
                value={layer.role ?? ''}
                title="Role"
                onChange={(e) =>
                  editorStore
                    .getState()
                    .setLayerRole(
                      sceneId,
                      i,
                      (e.target.value || undefined) as LayerRole | undefined,
                    )
                }
              >
                <option value="">role…</option>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {layer.band !== 'mid' && (
                <input
                  type="number"
                  className="logic__in layer-row__parallax"
                  title="Parallax: 1 = with the world, <1 = farther/slower, 0 = locked"
                  min="0"
                  max="2"
                  step="0.1"
                  value={layer.parallax ?? 1}
                  onChange={(e) =>
                    editorStore.getState().setLayerParallax(sceneId, i, Number(e.target.value))
                  }
                />
              )}
              <label className="logic__chk" title="Cast a contact (blob) shadow at this prop's base">
                <input
                  type="checkbox"
                  checked={!!layer.castShadow}
                  onChange={(e) =>
                    editorStore.getState().setLayerCastShadow(sceneId, i, e.target.checked)
                  }
                />
                shadow
              </label>
              {(layer.kind === 'image' || layer.kind === 'animated') && (
                <AssetSwap
                  accept="image/*,.svg"
                  label="⇄ Swap"
                  title="Replace this layer's image (keeps its band / fit / position)"
                  onPick={(src) => editorStore.getState().setLayerSrc(sceneId, i, src)}
                />
              )}
            </div>
            {layer.kind === 'animated' && (
              <div className="layer-row__anim">
                {(
                  [
                    ['frameWidth', 'w'],
                    ['frameHeight', 'h'],
                    ['columns', 'cols'],
                    ['frames', 'frames'],
                    ['fps', 'fps'],
                  ] as const
                ).map(([key, lbl]) => (
                  <label key={key} className="layer-row__anim-field">
                    <span>{lbl}</span>
                    <input
                      type="number"
                      className="logic__in"
                      min="1"
                      value={layer[key] ?? (key === 'fps' ? 8 : 1)}
                      onChange={(e) =>
                        editorStore
                          .getState()
                          .setLayerAnim(sceneId, i, { [key]: Math.max(1, Number(e.target.value)) })
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
      {layers.some((l) => l.kind === 'image' && ['none', 'width'].includes(l.fit ?? 'none')) && (
        <p className="layer-list__empty">
          Tip: drag none-fit images freely in the preview; width-fit strips move on Y.
        </p>
      )}
    </div>
  )
}
