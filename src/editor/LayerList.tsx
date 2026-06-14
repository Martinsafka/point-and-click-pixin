import { type ChangeEvent } from 'react'
import { editorStore } from './editor-store'
import type { LayerData, LayerFit, LayerRole, SceneBand, SceneId } from '../data/schema'

const BANDS: SceneBand[] = ['background', 'mid', 'foreground']
const FITS: LayerFit[] = ['none', 'width', 'cover', 'contain', 'stretch']
const ROLES: LayerRole[] = ['scenery', 'occluder', 'floor']

function layerLabel(layer: LayerData): string {
  return layer.kind === 'image' ? 'image' : layer.builder
}

/**
 * Per-scene layer stack: upload an image (→ a background backdrop), then set each
 * layer's band / fit / role and reorder or delete it. Image uploads are read as
 * data-URLs and stored in the document, so they survive export. Builtin (code)
 * layers appear here too and can be rebanded / reordered / removed.
 */
export function LayerList({ sceneId, layers }: { sceneId: SceneId; layers: LayerData[] }) {
  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      let src = String(reader.result)
      // Ensure Pixi detects an SVG from the data-URL mime even if the browser
      // gave the file an empty/wrong type.
      if (/\.svg$/i.test(file.name) && !src.startsWith('data:image/svg+xml')) {
        src = src.replace(/^data:[^,;]*/, 'data:image/svg+xml')
      }
      editorStore.getState().addImageLayer(sceneId, src)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="layer-list">
      <div className="editor__toolbar">
        <label className="editor__import">
          + Image
          <input type="file" accept="image/*,.svg" hidden onChange={onUpload} />
        </label>
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
              {layer.kind === 'image' && (
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
            </div>
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
