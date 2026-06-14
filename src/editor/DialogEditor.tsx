import { editorStore } from './editor-store'
import { EditorModal } from './EditorModal'
import { ConditionEditor } from './ConditionEditor'
import { EffectList } from './EffectList'
import { actionNames, actorIds } from './effect-options'
import type {
  DialogBranch,
  DialogChoice,
  DialogNode,
  DialogNodeId,
  ItemDef,
  ItemId,
  SceneId,
} from '../data/schema'

const updateAt = <T,>(arr: T[], i: number, patch: Partial<T>): T[] =>
  arr.map((x, j) => (j === i ? { ...x, ...patch } : x))
const removeAt = <T,>(arr: T[], i: number): T[] => arr.filter((_, j) => j !== i)

/** A node-id picker (with a short text preview) for `start` / `next` / branch & choice
 *  targets. `allowEmpty` offers "— end —" (a missing target ends the dialogue). A stale
 *  value (its node was deleted) stays selectable, flagged. */
function NodeSelect({
  value,
  nodes,
  onChange,
  allowEmpty = false,
}: {
  value: string | undefined
  nodes: Record<DialogNodeId, DialogNode>
  onChange: (v: string | undefined) => void
  allowEmpty?: boolean
}) {
  const ids = Object.keys(nodes)
  const opts = value && !nodes[value] ? [value, ...ids] : ids
  const label = (id: string) => {
    if (!nodes[id]) return `${id} — (missing)`
    const t = nodes[id].text?.trim()
    return t ? `${id} — ${t.slice(0, 28)}` : id
  }
  return (
    <select
      className="logic__sel"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || undefined)}
    >
      {allowEmpty && <option value="">— end —</option>}
      {opts.map((id) => (
        <option key={id} value={id}>
          {label(id)}
        </option>
      ))}
    </select>
  )
}

interface NodeCtx {
  items: Record<ItemId, ItemDef>
  sceneIds: SceneId[]
  animations: string[]
  targets: string[]
}

/** Editor for one dialogue node: speaker + text + on-enter effects, a conditional
 *  `branch` router, reply `choices`, and the `next` line (when there are no choices). */
function NodeForm({
  dialogId,
  nodeId,
  node,
  nodes,
  isStart,
  ctx,
}: {
  dialogId: string
  nodeId: string
  node: DialogNode
  nodes: Record<DialogNodeId, DialogNode>
  isStart: boolean
  ctx: NodeCtx
}) {
  const s = () => editorStore.getState()
  const patch = (p: Partial<DialogNode>) => s().setDialogNode(dialogId, nodeId, { ...node, ...p })
  const { items, sceneIds, animations, targets } = ctx
  const choices = node.choices ?? []
  const branch = node.branch ?? []
  const setChoices = (next: DialogChoice[]) => patch({ choices: next.length ? next : undefined })
  const setBranch = (next: DialogBranch[]) => patch({ branch: next.length ? next : undefined })
  const firstNode = Object.keys(nodes)[0] ?? ''

  return (
    <details className="editor__section">
      <summary className="editor__title">
        {isStart ? '▶ ' : ''}
        {nodeId}
        {node.text ? ` — ${node.text.slice(0, 30)}` : ''}
      </summary>
      <div className="editor__section-body">
        <div className="editor__toolbar">
          <button
            type="button"
            disabled={isStart}
            onClick={() => s().setDialogStart(dialogId, nodeId)}
          >
            {isStart ? 'Start node' : 'Set as start'}
          </button>
          <button
            type="button"
            className="logic__del"
            onClick={() => s().removeDialogNode(dialogId, nodeId)}
          >
            Remove node
          </button>
        </div>

        <div className="intr-form__field">
          <span>speaker</span>
          <select
            className="logic__sel"
            value={node.speaker ?? ''}
            onChange={(e) => patch({ speaker: e.target.value || undefined })}
          >
            <option value="">— partner —</option>
            {targets.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="intr-form__field intr-form__field--col">
          <span>text</span>
          <input
            className="logic__in"
            placeholder="line of dialogue…"
            value={node.text ?? ''}
            onChange={(e) => patch({ text: e.target.value || undefined })}
          />
        </div>

        <EffectList
          effects={node.effects ?? []}
          onChange={(fx) => patch({ effects: fx.length ? fx : undefined })}
          items={items}
          sceneIds={sceneIds}
          animations={animations}
          targets={targets}
          label="On enter"
        />

        <div className="logic">
          <div className="logic__head">
            <span>Branch (router)</span>
            <button
              type="button"
              className="logic__add"
              onClick={() => setBranch([...branch, { to: firstNode }])}
            >
              + Branch
            </button>
          </div>
          {branch.map((b, i) => (
            <div key={i} className="logic__row">
              <ConditionEditor
                condition={b.when}
                onChange={(c) => setBranch(updateAt(branch, i, { when: c }))}
                items={items}
                sceneIds={sceneIds}
              />
              <span>→</span>
              <NodeSelect
                value={b.to}
                nodes={nodes}
                onChange={(to) => setBranch(updateAt(branch, i, { to: to ?? '' }))}
              />
              <button
                type="button"
                className="logic__del"
                onClick={() => setBranch(removeAt(branch, i))}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="logic">
          <div className="logic__head">
            <span>Choices</span>
            <button
              type="button"
              className="logic__add"
              onClick={() => setChoices([...choices, { text: '' }])}
            >
              + Choice
            </button>
          </div>
          {choices.map((c, i) => (
            <div key={i} className="logic__use">
              <div className="logic__use-head">
                <input
                  className="logic__in"
                  placeholder="reply text"
                  value={c.text}
                  onChange={(e) => setChoices(updateAt(choices, i, { text: e.target.value }))}
                />
                <span>→</span>
                <NodeSelect
                  value={c.next}
                  nodes={nodes}
                  allowEmpty
                  onChange={(next) => setChoices(updateAt(choices, i, { next }))}
                />
                <button
                  type="button"
                  className="logic__del"
                  onClick={() => setChoices(removeAt(choices, i))}
                >
                  ✕
                </button>
              </div>
              <ConditionEditor
                condition={c.when}
                onChange={(w) => setChoices(updateAt(choices, i, { when: w }))}
                items={items}
                sceneIds={sceneIds}
              />
              <EffectList
                effects={c.effects ?? []}
                onChange={(fx) =>
                  setChoices(updateAt(choices, i, { effects: fx.length ? fx : undefined }))
                }
                items={items}
                sceneIds={sceneIds}
                animations={animations}
                targets={targets}
                label="→ effects"
              />
            </div>
          ))}
        </div>

        {choices.length === 0 && (
          <div className="intr-form__field">
            <span>next</span>
            <NodeSelect
              value={node.next}
              nodes={nodes}
              allowEmpty
              onChange={(next) => patch({ next })}
            />
          </div>
        )}
      </div>
    </details>
  )
}

/**
 * The dialogue node-tree editor (modal). Pick the `start` node and edit each node —
 * speaker / text / effects / branch / choices / next — referencing other nodes by id.
 * Composes `EffectList` (with the animation / target pickers) + `ConditionEditor`. The
 * visual flowchart is a later pass (M12); this is the structured form.
 */
export function DialogEditor({ dialogId, onClose }: { dialogId: string; onClose: () => void }) {
  const doc = editorStore.getState().doc
  const dialog = doc.dialogs?.[dialogId]
  if (!dialog) return null
  const ctx: NodeCtx = {
    items: doc.items,
    sceneIds: Object.keys(doc.scenes),
    animations: actionNames(doc),
    targets: actorIds(doc),
  }

  return (
    <EditorModal title={`Dialog · ${dialogId}`} onClose={onClose}>
      <div className="intr-form__field">
        <span>start node</span>
        <NodeSelect
          value={dialog.start}
          nodes={dialog.nodes}
          onChange={(v) => v && editorStore.getState().setDialogStart(dialogId, v)}
        />
      </div>
      {Object.entries(dialog.nodes).map(([id, node]) => (
        <NodeForm
          key={id}
          dialogId={dialogId}
          nodeId={id}
          node={node}
          nodes={dialog.nodes}
          isStart={id === dialog.start}
          ctx={ctx}
        />
      ))}
      <div className="editor__toolbar">
        <button type="button" onClick={() => editorStore.getState().addDialogNode(dialogId)}>
          + Node
        </button>
      </div>
    </EditorModal>
  )
}
