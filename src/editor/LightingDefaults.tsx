import type { AmbientLight, GameDoc, PlayerLight, PlayerLightShape } from '../data/schema'
import { editorStore } from './editor-store'
import { ConditionEditor } from './ConditionEditor'
import { Slider } from './Slider'

/**
 * The Project tab's **Lighting** (M10 10b): the document **default ambient** (a scene's own
 * overrides it) + the **player light** (the light the player carries — sphere / cone,
 * gated by `when`, e.g. `hasItem: flashlight`).
 */
export function LightingDefaults({ doc }: { doc: GameDoc }) {
  const s = () => editorStore.getState()
  const amb = doc.ambientLight
  const pl = doc.playerLight
  const setPl = (patch: Partial<PlayerLight>) => pl && s().setPlayerLight({ ...pl, ...patch })

  return (
    <>
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!amb}
          onChange={(e) =>
            s().setDocAmbientLight(
              e.target.checked ? ({ color: '#10141d', intensity: 0.6 } as AmbientLight) : undefined,
            )
          }
        />
        default ambient light
      </label>
      {amb && (
        <div className="logic">
          <div className="intr-form__field">
            <span>colour</span>
            <input
              type="color"
              value={amb.color}
              onChange={(e) => s().setDocAmbientLight({ ...amb, color: e.target.value })}
            />
          </div>
          <Slider
            label="intensity"
            value={amb.intensity}
            min={0}
            max={1}
            step={0.05}
            onChange={(intensity) => s().setDocAmbientLight({ ...amb, intensity })}
          />
        </div>
      )}

      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!pl}
          onChange={(e) =>
            s().setPlayerLight(
              e.target.checked
                ? { shape: 'sphere', radius: 0.32, color: '#dfe8ff', intensity: 0.9 }
                : undefined,
            )
          }
        />
        player light (a carried torch / flashlight)
      </label>
      {pl && (
        <div className="logic">
          <div className="intr-form__field">
            <span>shape</span>
            <select
              className="logic__sel"
              value={pl.shape}
              onChange={(e) => setPl({ shape: e.target.value as PlayerLightShape })}
            >
              <option value="sphere">sphere (around player)</option>
              <option value="cone">cone (follows facing)</option>
            </select>
            <input type="color" value={pl.color} onChange={(e) => setPl({ color: e.target.value })} />
          </div>
          <Slider label="radius" value={pl.radius} min={0.1} max={1.5} step={0.01} onChange={(radius) => setPl({ radius })} />
          <Slider label="intensity" value={pl.intensity} min={0} max={1.5} step={0.05} onChange={(intensity) => setPl({ intensity })} />
          {pl.shape === 'cone' && (
            <Slider label="cone°" value={pl.angle ?? 60} min={10} max={170} onChange={(angle) => setPl({ angle })} />
          )}
          <div className="intr-form__field intr-form__field--col">
            <span>when (e.g. holding a flashlight)</span>
            <ConditionEditor
              condition={pl.when}
              onChange={(when) => setPl({ when })}
              items={doc.items}
              sceneIds={Object.keys(doc.scenes)}
            />
          </div>
        </div>
      )}
    </>
  )
}
