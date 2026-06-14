import type { GameDoc } from '../data/schema'
import { editorStore } from './editor-store'

/**
 * The global NPC cast (Characters tab): create a character once (id fixed at
 * creation — like items — since placements + effects reference it; name editable),
 * then place them into scenes from the Scene tab. Appearance / dialogue / routine
 * layer in over the rest of M7.
 */
export function NpcCast({ npcs }: { npcs: GameDoc['npcs'] }) {
  const s = () => editorStore.getState()
  const list = Object.values(npcs ?? {})

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
          <button type="button" className="logic__del" onClick={() => s().removeNpcDef(npc.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
