import type { FogConfig, LayerData, SceneId } from '../data/schema'
import { editorStore } from './editor-store'
import { Slider } from './Slider'

const DEFAULT_FOG: FogConfig = {
  color: '#aeb6c4',
  parallaxX: 12,
  parallaxY: 2,
  seed: 1,
  scaleX: 2.4,
  scaleY: 2.4,
  scale: 100,
  opacity: 0.28,
  backZ: 8, // behind characters (band 10), in front of the background (band 0)
  frontOpacity: 0.12,
  frontZ: 26, // over the whole scene (foreground band is 20)
}

/**
 * The Scene tab's **Fog** section (M10 10c) — an animated noise fog/cloud layer (a *fake*, not
 * volumetrics): a back + front layer with one overall speed, parallax, and noise zoom; the
 * back can slot behind a chosen scene layer. Renders live in the running world.
 */
export function SceneFog({
  sceneId,
  fog,
  layers,
}: {
  sceneId: SceneId
  fog: FogConfig | undefined
  layers: LayerData[]
}) {
  const set = (patch: Partial<FogConfig>) =>
    editorStore.getState().setSceneFog(sceneId, { ...(fog ?? DEFAULT_FOG), ...patch })

  return (
    <>
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!fog}
          onChange={(e) =>
            editorStore.getState().setSceneFog(sceneId, e.target.checked ? DEFAULT_FOG : undefined)
          }
        />
        fog enabled
      </label>
      {fog && (
        <>
          <div className="intr-form__field">
            <span>colour</span>
            <input
              type="color"
              value={fog.color}
              onChange={(e) => set({ color: e.target.value })}
            />
          </div>
          <Slider
            label="parallax X ↔"
            value={fog.parallaxX}
            min={-50}
            max={50}
            onChange={(v) => set({ parallaxX: v })}
          />
          <Slider
            label="parallax Y ↕"
            value={fog.parallaxY}
            min={-50}
            max={50}
            onChange={(v) => set({ parallaxY: v })}
          />
          <Slider
            label="seed"
            value={fog.seed}
            min={0}
            max={64}
            onChange={(v) => set({ seed: v })}
          />
          <Slider
            label="noise W"
            value={fog.scaleX}
            min={0.5}
            max={10}
            step={0.1}
            onChange={(v) => set({ scaleX: v })}
          />
          <Slider
            label="noise H"
            value={fog.scaleY}
            min={0.5}
            max={10}
            step={0.1}
            onChange={(v) => set({ scaleY: v })}
          />
          <Slider
            label="scale %"
            value={fog.scale}
            min={25}
            max={400}
            step={5}
            onChange={(v) => set({ scale: v })}
          />
          <Slider
            label="back ◢"
            value={fog.opacity}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => set({ opacity: v })}
          />
          <div className="intr-form__field">
            <span>back behind</span>
            <select
              className="logic__in"
              value={fog.backLayer ?? ''}
              onChange={(e) =>
                set({ backLayer: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            >
              <option value="">— world depth (slider)</option>
              {layers.map((l, i) => (
                <option key={i} value={i}>
                  #{i} · {l.band}
                </option>
              ))}
            </select>
          </div>
          {fog.backLayer === undefined && (
            <Slider
              label="back depth"
              value={fog.backZ}
              min={-5}
              max={30}
              onChange={(v) => set({ backZ: v })}
            />
          )}
          <div className="intr-form__note">
            Depth = z-order vs the scene bands (background 0 · characters 10 · foreground 20).
          </div>
          <Slider
            label="front ◤"
            value={fog.frontOpacity}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => set({ frontOpacity: v })}
          />
          <Slider
            label="front depth"
            value={fog.frontZ}
            min={-5}
            max={30}
            onChange={(v) => set({ frontZ: v })}
          />
        </>
      )}
    </>
  )
}
