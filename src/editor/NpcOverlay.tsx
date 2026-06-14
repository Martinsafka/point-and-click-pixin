import type { MouseEvent } from 'react'
import type { NpcData } from '../data/schema'

/**
 * DOM overlay marking each NPC's spawn (a dot + id) over the scene preview, the
 * selected one highlighted. In place mode, clicking the preview sets the selected
 * NPC's spawn. NPCs render as real sprites in the game; here they're just markers.
 */
export function NpcOverlay({
  npcs,
  selectedIndex,
  placeMode,
  onPlace,
}: {
  npcs: NpcData[]
  selectedIndex: number | null
  placeMode: boolean
  onPlace: (xFrac: number, yFrac: number) => void
}) {
  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onPlace((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }

  return (
    <div className="npc-overlay">
      {npcs.map((npc, i) => (
        <span
          key={i}
          className={`npc-overlay__marker${i === selectedIndex ? ' npc-overlay__marker--selected' : ''}`}
          style={{ left: `${npc.spawn.xFrac * 100}%`, top: `${npc.spawn.yFrac * 100}%` }}
        >
          {npc.id}
        </span>
      ))}
      {placeMode && <div className="npc-overlay__catcher" onClick={onClick} />}
    </div>
  )
}
