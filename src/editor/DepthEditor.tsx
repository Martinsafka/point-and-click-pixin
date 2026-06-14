import type { DepthConfig, DepthStop } from '../data/schema'
import { editorStore } from './editor-store'

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** The curve points: explicit `stops`, or the near/far pair as a 2-point ramp. */
function stopsOf(depth: DepthConfig): DepthStop[] {
  if (depth.stops && depth.stops.length >= 2) return depth.stops
  return [
    { yFrac: depth.yFarFrac, scale: depth.scaleFar },
    { yFrac: depth.yNearFrac, scale: depth.scaleNear },
  ]
}

/**
 * Per-scene depth-curve editor: the character's size as a function of feet Y, as a
 * list of {yFrac, scale} stops (piecewise-linear, clamped at the ends). The little
 * graph plots the live curve (Y top→bottom, scale →). In game the character size is
 * this × the scene's character % × the resolution fit.
 */
export function DepthEditor({ sceneId, depth }: { sceneId: string; depth: DepthConfig }) {
  const stops = stopsOf(depth)
  const commit = (next: DepthStop[]) => editorStore.getState().setDepthStops(sceneId, next)
  const update = (i: number, patch: Partial<DepthStop>) =>
    commit(stops.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  const add = () => commit([...stops, { yFrac: 0.8, scale: 1 }])
  const remove = (i: number) => {
    if (stops.length > 2) commit(stops.filter((_, j) => j !== i))
  }

  const sorted = [...stops].sort((a, b) => a.yFrac - b.yFrac)
  const maxScale = Math.max(1.5, ...stops.map((s) => s.scale))
  const x = (scale: number) => (scale / maxScale) * 100
  const line = sorted.map((s) => `${x(s.scale)},${s.yFrac * 100}`).join(' ')

  return (
    <div className="depth">
      <svg className="depth__curve" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <polyline points={line} />
        {sorted.map((s, i) => (
          <circle key={i} cx={x(s.scale)} cy={s.yFrac * 100} r="2.5" />
        ))}
      </svg>
      <ul className="depth__stops">
        {stops.map((s, i) => (
          <li key={i} className="depth__stop">
            <label>
              y
              <input
                className="logic__in"
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={s.yFrac}
                onChange={(e) => update(i, { yFrac: clamp01(Number(e.target.value)) })}
              />
            </label>
            <label>
              scale
              <input
                className="logic__in"
                type="number"
                min="0.1"
                step="0.05"
                value={s.scale}
                onChange={(e) => update(i, { scale: Math.max(0.1, Number(e.target.value)) })}
              />
            </label>
            <button
              type="button"
              className="intr-row__del"
              onClick={() => remove(i)}
              disabled={stops.length <= 2}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={add}>
        + stop
      </button>
    </div>
  )
}
