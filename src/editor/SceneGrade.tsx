import type {
  ColorGrade,
  ItemDef,
  ItemId,
  LightningConfig,
  SceneId,
  Vignette,
} from '../data/schema'
import { editorStore } from './editor-store'
import { Slider } from './Slider'
import { ConditionEditor } from './ConditionEditor'
import { SoundSelect } from './SoundSelect'

const DEFAULT_GRADE: ColorGrade = { brightness: 1, contrast: 1, saturation: 1, hue: 0 }
const DEFAULT_VIGNETTE: Vignette = { intensity: 0.4, size: 0.5, color: '#000000' }
const DEFAULT_LIGHTNING: LightningConfig = {
  color: '#dfe8ff',
  intensity: 0.7,
  minGap: 5,
  maxGap: 15,
}

/**
 * The Scene tab's **Grade & FX** section (M10 10d): a colour grade (ColorMatrixFilter over the
 * scene art), a vignette (darkened edges), and lightning + thunder. All render live.
 */
export function SceneGrade({
  sceneId,
  colorGrade,
  vignette,
  lightning,
  items,
  sceneIds,
}: {
  sceneId: SceneId
  colorGrade: ColorGrade | undefined
  vignette: Vignette | undefined
  lightning: LightningConfig | undefined
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
}) {
  const s = () => editorStore.getState()
  const grade = (patch: Partial<ColorGrade>) =>
    s().setSceneColorGrade(sceneId, { ...(colorGrade ?? DEFAULT_GRADE), ...patch })
  const vig = (patch: Partial<Vignette>) =>
    s().setSceneVignette(sceneId, { ...(vignette ?? DEFAULT_VIGNETTE), ...patch })
  const lit = (patch: Partial<LightningConfig>) =>
    s().setSceneLightning(sceneId, { ...(lightning ?? DEFAULT_LIGHTNING), ...patch })

  return (
    <>
      {/* Colour grade */}
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!colorGrade}
          onChange={(e) =>
            s().setSceneColorGrade(sceneId, e.target.checked ? DEFAULT_GRADE : undefined)
          }
        />
        colour grade
      </label>
      {colorGrade && (
        <>
          <Slider
            label="brightness"
            value={colorGrade.brightness}
            min={0}
            max={2}
            step={0.02}
            onChange={(v) => grade({ brightness: v })}
          />
          <Slider
            label="contrast"
            value={colorGrade.contrast}
            min={0}
            max={2}
            step={0.02}
            onChange={(v) => grade({ contrast: v })}
          />
          <Slider
            label="saturation"
            value={colorGrade.saturation}
            min={0}
            max={2}
            step={0.02}
            onChange={(v) => grade({ saturation: v })}
          />
          <Slider
            label="hue°"
            value={colorGrade.hue}
            min={-180}
            max={180}
            onChange={(v) => grade({ hue: v })}
          />
        </>
      )}

      {/* Vignette */}
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!vignette}
          onChange={(e) =>
            s().setSceneVignette(sceneId, e.target.checked ? DEFAULT_VIGNETTE : undefined)
          }
        />
        vignette
      </label>
      {vignette && (
        <>
          <div className="intr-form__field">
            <span>colour</span>
            <input
              type="color"
              value={vignette.color}
              onChange={(e) => vig({ color: e.target.value })}
            />
          </div>
          <Slider
            label="intensity"
            value={vignette.intensity}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => vig({ intensity: v })}
          />
          <Slider
            label="size"
            value={vignette.size}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => vig({ size: v })}
          />
        </>
      )}

      {/* Lightning */}
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!lightning}
          onChange={(e) =>
            s().setSceneLightning(sceneId, e.target.checked ? DEFAULT_LIGHTNING : undefined)
          }
        />
        lightning + thunder
      </label>
      {lightning && (
        <>
          <div className="intr-form__field">
            <span>flash</span>
            <input
              type="color"
              value={lightning.color}
              onChange={(e) => lit({ color: e.target.value })}
            />
          </div>
          <Slider
            label="intensity"
            value={lightning.intensity}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => lit({ intensity: v })}
          />
          <Slider
            label="gap min s"
            value={lightning.minGap}
            min={0.5}
            max={30}
            step={0.5}
            onChange={(v) => lit({ minGap: v })}
          />
          <Slider
            label="gap max s"
            value={lightning.maxGap}
            min={0.5}
            max={60}
            step={0.5}
            onChange={(v) => lit({ maxGap: v })}
          />
          <div className="intr-form__field">
            <span>thunder</span>
            <SoundSelect value={lightning.sound} onChange={(id) => lit({ sound: id })} />
          </div>
          <div className="intr-form__field intr-form__field--col">
            <span>only when (else always)</span>
            <ConditionEditor
              condition={lightning.when}
              onChange={(when) => lit({ when })}
              items={items}
              sceneIds={sceneIds}
            />
          </div>
        </>
      )}
    </>
  )
}
