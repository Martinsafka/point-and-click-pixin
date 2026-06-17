import type { ItemDef, ItemId, PointEmitter, SceneId, WeatherShape } from '../data/schema'
import { editorStore } from './editor-store'
import { ConditionEditor } from './ConditionEditor'
import { Slider } from './Slider'

/**
 * The Scene tab's **Emitters** section (M10) — localized point particle sources (chimney
 * smoke, embers, drips). Placed on the preview like a light (**+ Emitter** → **Place** → click
 * the preview), then tuned with sliders. World-space, so it shows live in the running world.
 */
export function SceneEmitters({
  sceneId,
  emitters,
  items,
  sceneIds,
  selected,
  onSelect,
  placeMode,
  onTogglePlace,
}: {
  sceneId: SceneId
  emitters: PointEmitter[]
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
  selected: number | null
  onSelect: (i: number) => void
  placeMode: boolean
  onTogglePlace: () => void
}) {
  const s = () => editorStore.getState()
  const em = selected !== null ? emitters[selected] : undefined
  const set = (patch: Partial<PointEmitter>) =>
    selected !== null && s().setEmitter(sceneId, selected, patch)

  return (
    <>
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addEmitter(sceneId)}>
          + Emitter
        </button>
      </div>

      {emitters.length > 0 && (
        <ul className="editor__interactables">
          {emitters.map((e, i) => (
            <li key={e.id} className="intr-row">
              <button
                type="button"
                className={`intr-row__select${i === selected ? ' intr-row__select--active' : ''}`}
                onClick={() => onSelect(i)}
              >
                <span className="intr-row__kind">⛲</span> {e.id}
              </button>
              <button
                type="button"
                className="intr-row__del"
                onClick={() => s().removeEmitter(sceneId, i)}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {em && selected !== null && (
        <div className="intr-form">
          <div className="editor__toolbar">
            <button
              type="button"
              className={placeMode ? 'editor__btn--active' : undefined}
              onClick={onTogglePlace}
            >
              {placeMode ? 'Done' : 'Place'}
            </button>
          </div>
          <div className="intr-form__field">
            <span>colour</span>
            <input type="color" value={em.color} onChange={(e) => set({ color: e.target.value })} />
            <select
              className="logic__in"
              value={em.shape}
              onChange={(e) => set({ shape: e.target.value as WeatherShape })}
            >
              <option value="round">round</option>
              <option value="streak">streak</option>
            </select>
            <select
              className="logic__in"
              value={em.blend}
              onChange={(e) => set({ blend: e.target.value as 'normal' | 'add' })}
            >
              <option value="normal">normal</option>
              <option value="add">add (glow)</option>
            </select>
          </div>
          <Slider
            label="rate /s"
            value={em.rate}
            min={1}
            max={120}
            onChange={(v) => set({ rate: v })}
          />
          <Slider
            label="life s"
            value={em.life}
            min={0.2}
            max={10}
            step={0.1}
            onChange={(v) => set({ life: v })}
          />
          <Slider
            label="alpha"
            value={em.alpha}
            min={0}
            max={1}
            step={0.02}
            onChange={(v) => set({ alpha: v })}
          />
          <Slider
            label="size"
            value={em.size}
            min={1}
            max={120}
            onChange={(v) => set({ size: v })}
          />
          <Slider
            label="grow /s"
            value={em.grow}
            min={-40}
            max={80}
            onChange={(v) => set({ grow: v })}
          />
          <Slider
            label="angle°"
            value={em.angle}
            min={-180}
            max={180}
            onChange={(v) => set({ angle: v })}
          />
          <Slider
            label="spread°"
            value={em.spread}
            min={0}
            max={180}
            onChange={(v) => set({ spread: v })}
          />
          <Slider
            label="speed"
            value={em.speed}
            min={0}
            max={300}
            onChange={(v) => set({ speed: v })}
          />
          <Slider
            label="gravity"
            value={em.gravity}
            min={-200}
            max={200}
            onChange={(v) => set({ gravity: v })}
          />
          <Slider
            label="spawn r"
            value={em.spawnRadius}
            min={0}
            max={120}
            onChange={(v) => set({ spawnRadius: v })}
          />
          <div className="intr-form__field intr-form__field--col">
            <span>shown when (else always)</span>
            <ConditionEditor
              condition={em.when}
              onChange={(when) => set({ when })}
              items={items}
              sceneIds={sceneIds}
            />
          </div>
        </div>
      )}
    </>
  )
}
