import { useState } from 'react'
import { useStore } from 'zustand'
import type { GameDoc } from '../data/schema'
import type { StoryStoreApi } from '../state/story'
import { useEditor } from './editor-store'
import { previewBridge } from './preview-bridge'
import { minutesToHHMM } from './time-format'

/** Every flag id referenced anywhere in the doc (conditions `flag` + effects `setFlag`). */
function collectFlags(doc: GameDoc): string[] {
  const found = new Set<string>()
  for (const m of JSON.stringify(doc).matchAll(/"flag":"([^"]+)"/g)) found.add(m[1])
  return [...found].sort()
}

/**
 * The **World** launcher window (ME.5) — drive the live preview's world to the state you want
 * to author against: jump scenes, set / clear flags, give / take items, reset. It writes to
 * the live scene-host's story store (published via `previewBridge`), and the world reacts
 * where it already does — gated layers / NPCs / lights appear, scene swaps run. Only active in
 * the preview's **Live** mode (the static Edit preview has no running world).
 */
export function WorldState() {
  const store = useStore(previewBridge, (s) => s.store)
  if (!store) {
    return (
      <p className="intr-form__note">
        Switch the preview to <strong>● Live</strong> (top-left of the scene) to drive the world —
        set flags, give items, jump scenes.
      </p>
    )
  }
  return <WorldStateControls store={store} />
}

function WorldStateControls({ store }: { store: StoryStoreApi }) {
  const doc = useEditor((s) => s.doc)
  const currentScene = useStore(store, (s) => s.currentScene)
  const flags = useStore(store, (s) => s.flags)
  const inventory = useStore(store, (s) => s.inventory)
  const clockMinutes = useStore(store, (s) => s.clockMinutes)
  const [newFlag, setNewFlag] = useState('')

  const run = store.getState().run
  const knownFlags = collectFlags(doc)
  const items = Object.values(doc.items)

  return (
    <>
      <div className="intr-form__field">
        <span>scene</span>
        <select
          className="logic__in"
          value={currentScene}
          onChange={(e) => run([{ kind: 'goTo', scene: e.target.value }])}
        >
          {Object.values(doc.scenes).map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {doc.clock && (
        <div className="intr-form__field intr-form__field--col">
          <span>time · {minutesToHHMM(clockMinutes ?? 0)}</span>
          <input
            type="range"
            min={0}
            max={1439}
            step={1}
            value={clockMinutes ?? 0}
            onChange={(e) => store.getState().setClock(Number(e.target.value))}
          />
        </div>
      )}

      <div className="intr-form__field intr-form__field--col">
        <span>flags</span>
        {knownFlags.length === 0 && (
          <p className="intr-form__note">No flags used in the doc yet.</p>
        )}
        {knownFlags.map((f) => (
          <label key={f} className="logic__chk">
            <input
              type="checkbox"
              checked={!!flags[f]}
              onChange={(e) => run([{ kind: 'setFlag', flag: f, value: e.target.checked }])}
            />
            {f}
          </label>
        ))}
        <div className="editor__toolbar">
          <input
            className="logic__in"
            placeholder="new flag…"
            value={newFlag}
            onChange={(e) => setNewFlag(e.target.value)}
          />
          <button
            type="button"
            disabled={!newFlag.trim()}
            onClick={() => {
              run([{ kind: 'setFlag', flag: newFlag.trim(), value: true }])
              setNewFlag('')
            }}
          >
            Set
          </button>
        </div>
      </div>

      <div className="intr-form__field intr-form__field--col">
        <span>inventory</span>
        {items.length === 0 && <p className="intr-form__note">No items defined (Items tab).</p>}
        {items.map((it) => {
          const held = inventory.includes(it.id)
          return (
            <div key={it.id} className="intr-row">
              <span className="intr-row__select">
                {held ? '✓ ' : ''}
                {it.name}
              </span>
              <button
                type="button"
                onClick={() => run([{ kind: held ? 'takeItem' : 'giveItem', item: it.id }])}
              >
                {held ? 'Take' : 'Give'}
              </button>
            </div>
          )
        })}
      </div>

      <div className="editor__toolbar">
        <button type="button" onClick={() => store.getState().reset(doc)}>
          Reset world
        </button>
      </div>
    </>
  )
}
