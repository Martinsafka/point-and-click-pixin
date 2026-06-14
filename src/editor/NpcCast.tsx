import { useState } from 'react'
import type { GameDoc } from '../data/schema'
import { editorStore } from './editor-store'
import { NpcEditor } from './NpcEditor'

/**
 * The global NPC cast (Characters tab): create a character once (id fixed at
 * creation — like items — since placements + effects reference it; name + speed
 * editable inline), then place them into scenes from the Scene tab. **Edit** opens the
 * NPC definition modal (dialogue / inspect now; appearance + voice over 4d / 4c).
 */
export function NpcCast({ npcs }: { npcs: GameDoc['npcs'] }) {
  const s = () => editorStore.getState()
  const list = Object.values(npcs ?? {})
  const [editing, setEditing] = useState<string | null>(null)

  return (
    <div className="catalogue">
      <div className="editor__toolbar">
        <button type="button" onClick={() => s().addNpcDef()}>
          + NPC
        </button>
      </div>
      {list.length === 0 && (
        <p className="layer-list__empty">No NPCs yet — add the cast, then place them in scenes.</p>
      )}
      {list.map((npc) => (
        <div key={npc.id} className="cursor-row">
          <span className="cursor-row__kind">{npc.id}</span>
          <input
            value={npc.name ?? ''}
            placeholder="name"
            onChange={(e) => s().setNpcDefName(npc.id, e.target.value)}
          />
          <input
            className="logic__in npc-cast__speed"
            type="number"
            min="0.1"
            step="0.1"
            title="walk speed (× default)"
            value={npc.speed ?? 1}
            onChange={(e) => s().setNpcDefSpeed(npc.id, Math.max(0.1, Number(e.target.value) || 1))}
          />
          <button type="button" onClick={() => setEditing(npc.id)}>
            Edit
          </button>
          <button type="button" className="logic__del" onClick={() => s().removeNpcDef(npc.id)}>
            ✕
          </button>
        </div>
      ))}
      {editing && <NpcEditor npcId={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}
