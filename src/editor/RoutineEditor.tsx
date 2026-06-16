import { useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { editorStore } from './editor-store'
import { ConditionEditor } from './ConditionEditor'
import { EffectList } from './EffectList'
import { SceneSelect } from './EffectList'
import { actionNames, actorIds } from './effect-options'
import type { GameDoc, NpcId, Routine, RoutineEdge, RoutineNode, SceneId } from '../data/schema'

/** A starter routine: one node at the NPC's first placement scene. */
function emptyRoutine(scene: SceneId): Routine {
  return { start: 'start', nodes: [{ id: 'start', scene, ui: { x: 60, y: 60 } }], edges: [] }
}

/** A `base` (or `base-2`, …) not already a node id. */
function uniqueNodeId(nodes: RoutineNode[], base: string): string {
  const taken = new Set(nodes.map((n) => n.id))
  if (!taken.has(base)) return base
  let n = 2
  while (taken.has(`${base}-${n}`)) n += 1
  return `${base}-${n}`
}

/** Short human label for a transition (its gate / timer), shown on the graph edge. */
function edgeLabel(e: RoutineEdge): string {
  const bits: string[] = []
  if (e.onArrive) bits.push('arrive')
  if (e.after !== undefined) bits.push(`${e.after}ms`)
  if (e.when) bits.push('when')
  return bits.join(' + ') || 'auto'
}

function toRfNode(n: RoutineNode, start: string): Node {
  return {
    id: n.id,
    position: n.ui ?? { x: 0, y: 0 },
    data: { label: `${n.id === start ? '▶ ' : ''}${n.id}\n@ ${n.scene}` },
    style: {
      whiteSpace: 'pre',
      fontSize: 11,
      borderColor: n.id === start ? '#4ade80' : undefined,
      borderWidth: n.id === start ? 2 : undefined,
    },
  }
}

function toRfEdge(e: RoutineEdge, i: number): Edge {
  return { id: `e${i}`, source: e.from, target: e.to, label: edgeLabel(e), data: { index: i } }
}

/**
 * The per-NPC **routine** graph (React Flow) — nodes are cross-scene stations, edges are
 * gated transitions. The store's `NpcDef.routine` is the source of truth; the React Flow
 * state mirrors it (resynced on every routine change), and interactions (drag / connect /
 * delete) + the detail panel commit back via `patchNpcDef`. Drives this one NPC.
 */
function RoutineGraph({ npcId, routine, doc }: { npcId: NpcId; routine: Routine; doc: GameDoc }) {
  const s = () => editorStore.getState()
  const sceneIds = Object.keys(doc.scenes)
  const animations = actionNames(doc)
  const targets = actorIds(doc)

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selNode, setSelNode] = useState<string | null>(null)
  const [selEdge, setSelEdge] = useState<number | null>(null)

  // Mirror the store routine into React Flow. Re-runs whenever the routine object
  // changes (every commit makes a fresh one) — positions live in `ui`, so resync keeps
  // them; a drag only commits on stop, so this never fires mid-drag.
  useEffect(() => {
    setRfNodes(routine.nodes.map((n) => toRfNode(n, routine.start)))
    setRfEdges(routine.edges.map(toRfEdge))
  }, [routine, setRfNodes, setRfEdges])

  /** Apply an updater to the routine and commit it. */
  const patch = (fn: (r: Routine) => Routine) => s().patchNpcDef(npcId, { routine: fn(routine) })

  const onConnect = (c: Connection) => {
    if (!c.source || !c.target) return
    setRfEdges((es) => addEdge(c, es))
    patch((r) => ({ ...r, edges: [...r.edges, { from: c.source!, to: c.target! }] }))
  }

  const node = selNode ? routine.nodes.find((n) => n.id === selNode) : undefined
  const edge = selEdge !== null ? routine.edges[selEdge] : undefined
  // The named paths this NPC has in the selected node's scene — what its path picker offers.
  const nodePaths = node
    ? ((doc.scenes[node.scene]?.npcs ?? []).find((p) => p.npc === npcId)?.paths ?? []).filter(
        (pa): pa is typeof pa & { id: string } => !!pa.id,
      )
    : []

  const patchNode = (id: string, p: Partial<RoutineNode>) =>
    patch((r) => ({ ...r, nodes: r.nodes.map((n) => (n.id === id ? { ...n, ...p } : n)) }))
  const patchEdge = (i: number, p: Partial<RoutineEdge>) =>
    patch((r) => ({ ...r, edges: r.edges.map((e, j) => (j === i ? { ...e, ...p } : e)) }))

  const addNode = () => {
    const id = uniqueNodeId(routine.nodes, 'node')
    patch((r) => ({
      ...r,
      nodes: [...r.nodes, { id, scene: sceneIds[0] ?? '', ui: { x: 80, y: 80 + r.nodes.length * 70 } }],
    }))
    setSelNode(id)
    setSelEdge(null)
  }
  const removeNode = (id: string) => {
    patch((r) => ({
      ...r,
      start: r.start === id ? (r.nodes.find((n) => n.id !== id)?.id ?? r.start) : r.start,
      nodes: r.nodes.filter((n) => n.id !== id),
      edges: r.edges.filter((e) => e.from !== id && e.to !== id),
    }))
    setSelNode(null)
  }
  const removeEdge = (i: number) => {
    patch((r) => ({ ...r, edges: r.edges.filter((_, j) => j !== i) }))
    setSelEdge(null)
  }

  return (
    <div className="routine">
      <div className="editor__toolbar">
        <button type="button" onClick={addNode}>
          + Node
        </button>
        <button
          type="button"
          className="logic__del"
          onClick={() => s().patchNpcDef(npcId, { routine: undefined })}
        >
          Remove routine
        </button>
      </div>
      <div className="routine__canvas">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={(_, n) => {
            setSelNode(n.id)
            setSelEdge(null)
          }}
          onEdgeClick={(_, e) => {
            setSelEdge((e.data as { index: number })?.index ?? null)
            setSelNode(null)
          }}
          onNodeDragStop={(_, n) => patchNode(n.id, { ui: { x: n.position.x, y: n.position.y } })}
          onNodesDelete={(ns) => ns.forEach((n) => removeNode(n.id))}
          onEdgesDelete={(es) =>
            es
              .map((e) => (e.data as { index: number })?.index)
              .filter((i): i is number => i !== undefined)
              .sort((a, b) => b - a)
              .forEach(removeEdge)
          }
          colorMode="dark"
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>

      {node && (
        <div className="logic">
          <div className="logic__head">
            <span>Node · {node.id}</span>
            <div>
              {routine.start !== node.id && (
                <button type="button" onClick={() => patch((r) => ({ ...r, start: node.id }))}>
                  Set start
                </button>
              )}
              <button type="button" className="logic__del" onClick={() => removeNode(node.id)}>
                Delete
              </button>
            </div>
          </div>
          <div className="intr-form__field">
            <span>scene</span>
            <SceneSelect
              value={node.scene}
              sceneIds={sceneIds}
              onChange={(scene) => patchNode(node.id, { scene, pathId: undefined })}
            />
          </div>
          <div className="intr-form__field">
            <span>path</span>
            <select
              className="logic__sel"
              value={node.pathId ?? ''}
              onChange={(e) => patchNode(node.id, { pathId: e.target.value || undefined })}
            >
              <option value="">— stand (no path) —</option>
              {nodePaths.map((pa) => (
                <option key={pa.id} value={pa.id}>
                  {pa.name ?? pa.id} ({pa.mode})
                </option>
              ))}
            </select>
          </div>
          {nodePaths.length === 0 && (
            <p className="intr-form__note">
              No named paths for {npcId} in {node.scene} — draw some in that scene&apos;s NPCs
              panel first, then pick one here.
            </p>
          )}
          <EffectList
            effects={node.onEnter ?? []}
            onChange={(fx) => patchNode(node.id, { onEnter: fx.length ? fx : undefined })}
            items={doc.items}
            sceneIds={sceneIds}
            animations={animations}
            targets={targets}
            label="On enter"
          />
        </div>
      )}

      {edge && selEdge !== null && (
        <div className="logic">
          <div className="logic__head">
            <span>
              Edge · {edge.from} → {edge.to}
            </span>
            <button type="button" className="logic__del" onClick={() => removeEdge(selEdge)}>
              Delete
            </button>
          </div>
          <label className="logic__chk">
            <input
              type="checkbox"
              checked={edge.onArrive ?? false}
              onChange={(e) => patchEdge(selEdge, { onArrive: e.target.checked || undefined })}
            />
            on arrival (source node&apos;s path finished)
          </label>
          <div className="intr-form__field">
            <span>after (ms)</span>
            <input
              className="logic__in"
              type="number"
              min="0"
              step="100"
              placeholder="—"
              title="linger this long in the source node before the transition is eligible"
              value={edge.after ?? ''}
              onChange={(e) =>
                patchEdge(selEdge, {
                  after: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="intr-form__field intr-form__field--col">
            <span>when (gate)</span>
            <ConditionEditor
              condition={edge.when}
              onChange={(c) => patchEdge(selEdge, { when: c })}
              items={doc.items}
              sceneIds={sceneIds}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The routine section of the NPC modal: a "+ Routine" button until one exists, then the
 * React Flow graph editor (wrapped in a provider). Defaults a new routine's first node to
 * the NPC's first placement scene.
 */
export function RoutineEditor({ npcId }: { npcId: NpcId }) {
  const doc = editorStore.getState().doc
  const npc = doc.npcs?.[npcId]
  const routine = npc?.routine
  const firstScene = useMemo(
    () =>
      Object.keys(doc.scenes).find((sid) =>
        (doc.scenes[sid].npcs ?? []).some((p) => p.npc === npcId),
      ) ?? Object.keys(doc.scenes)[0],
    [doc, npcId],
  )
  if (!npc) return null

  if (!routine) {
    return (
      <button
        type="button"
        onClick={() => editorStore.getState().patchNpcDef(npcId, { routine: emptyRoutine(firstScene) })}
      >
        + Routine
      </button>
    )
  }
  return (
    <ReactFlowProvider>
      <RoutineGraph npcId={npcId} routine={routine} doc={doc} />
    </ReactFlowProvider>
  )
}
