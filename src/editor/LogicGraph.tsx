import { useEffect, useMemo } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MarkerType,
  Position,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { GameDoc } from '../data/schema'
import { scanLogic, type LogicKind } from './logic-scan'

/** Element-node border colour per kind (mirrors the editor's marker palette where it has one). */
const KIND_COLOR: Record<LogicKind, string> = {
  rule: '#e8b552',
  interactable: '#6ea8fe',
  trigger: '#c08bf0',
  exit: '#5fd0c0',
  dialog: '#7ee787',
  cutscene: '#f0a0c0',
  npc: '#f0935f',
  scene: '#9aa4b2',
  gate: '#6b7689',
}

const WRITE_COLOR = '#7ee787' // element → flag (sets it)
const READ_COLOR = '#e8b552' // flag → element (gated on it)

/**
 * The auto-generated, **read-only** logic-overview graph (M12b). `scanLogic` walks the doc
 * into the "flag web"; here it's laid out as a bipartite graph — logic **elements** on the
 * left, **flags** on the right — with a green arrow from each element to the flags it sets
 * and an amber arrow from each flag to the elements gated on it. Nothing here mutates the
 * doc; drag is allowed for exploration only (not persisted).
 */
function LogicGraphInner({ doc }: { doc: GameDoc }) {
  const scan = useMemo(() => scanLogic(doc), [doc])

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([])
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    const flagIndex = new Map(scan.flags.map((f, i) => [f, i]))
    const elNodes: Node[] = scan.elements.map((el, i) => ({
      id: el.key,
      position: { x: 0, y: i * 56 },
      data: { label: el.label },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        fontSize: 11,
        width: 180,
        borderColor: KIND_COLOR[el.kind],
        borderWidth: 2,
      },
    }))
    const flagNodes: Node[] = scan.flags.map((f, i) => ({
      id: `flag:${f}`,
      position: { x: 460, y: i * 44 },
      data: { label: `⚑ ${f}` },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      style: {
        fontSize: 11,
        width: 150,
        background: 'rgba(232, 181, 82, 0.12)',
        borderColor: '#e8b552',
        borderRadius: 14,
      },
    }))

    const edges: Edge[] = []
    for (const el of scan.elements) {
      for (const f of el.writes) {
        if (!flagIndex.has(f)) continue
        edges.push({
          id: `w:${el.key}:${f}`,
          source: el.key,
          target: `flag:${f}`,
          animated: true,
          style: { stroke: WRITE_COLOR },
          markerEnd: { type: MarkerType.ArrowClosed, color: WRITE_COLOR },
        })
      }
      for (const f of el.reads) {
        if (!flagIndex.has(f)) continue
        edges.push({
          id: `r:${f}:${el.key}`,
          source: `flag:${f}`,
          target: el.key,
          style: { stroke: READ_COLOR, strokeDasharray: '5 4' },
          markerEnd: { type: MarkerType.ArrowClosed, color: READ_COLOR },
        })
      }
    }

    setRfNodes([...elNodes, ...flagNodes])
    setRfEdges(edges)
  }, [scan, setRfNodes, setRfEdges])

  if (scan.flags.length === 0) {
    return (
      <p className="intr-form__note">
        No flags in the game yet. Add a rule or a <code>setFlag</code> effect (and gate something
        with a <code>flag</code> condition) and the web appears here.
      </p>
    )
  }

  return (
    <div className="logic-graph">
      <div className="logic-graph__legend">
        <span>
          <i style={{ background: WRITE_COLOR }} /> sets flag
        </span>
        <span>
          <i style={{ background: READ_COLOR }} /> gated on flag
        </span>
      </div>
      <div className="logic-graph__canvas">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodesConnectable={false}
          deleteKeyCode={null}
          colorMode="dark"
          minZoom={0.15}
          fitView
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}

/** Read-only logic-overview graph (M12b), wrapped in a React Flow provider. */
export function LogicGraph({ doc }: { doc: GameDoc }) {
  return (
    <ReactFlowProvider>
      <LogicGraphInner doc={doc} />
    </ReactFlowProvider>
  )
}
