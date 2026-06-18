import type { SceneId, ShadowConfig } from '../data/schema'
import { editorStore } from './editor-store'
import { Slider } from './Slider'

const DEF = { opacity: 0.32, squash: 0.32, scale: 0.7 }

/**
 * The Scene tab's **Shadows** section (M13c) — soft contact (blob) shadows under characters and
 * opted-in props. On by default; tune opacity / squash / size or turn off per scene. (Characters
 * cast one automatically; a layer opts in via its **shadow** checkbox in Layers.)
 */
export function SceneShadows({
  sceneId,
  shadows,
}: {
  sceneId: SceneId
  shadows: ShadowConfig | undefined
}) {
  const set = (patch: Partial<ShadowConfig>) =>
    editorStore.getState().setSceneShadows(sceneId, { ...shadows, ...patch })
  const off = shadows?.disabled ?? false

  return (
    <>
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!off}
          onChange={(e) => set({ disabled: e.target.checked ? undefined : true })}
        />
        contact shadows
      </label>
      {!off && (
        <>
          <Slider
            label="opacity"
            value={shadows?.opacity ?? DEF.opacity}
            min={0}
            max={1}
            step={0.02}
            onChange={(opacity) => set({ opacity })}
          />
          <Slider
            label="squash"
            value={shadows?.squash ?? DEF.squash}
            min={0.1}
            max={1}
            step={0.02}
            onChange={(squash) => set({ squash })}
          />
          <Slider
            label="size"
            value={shadows?.scale ?? DEF.scale}
            min={0.2}
            max={2}
            step={0.05}
            onChange={(scale) => set({ scale })}
          />
          <p className="intr-form__note">
            Characters cast one automatically; tick a layer&apos;s <strong>shadow</strong> in Layers
            for props.
          </p>
        </>
      )}
    </>
  )
}
