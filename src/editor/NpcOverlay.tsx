import type { MouseEvent } from 'react'
import type { NpcPlacement } from '../data/schema'

/**
 * DOM overlay marking each NPC placement's spawn (a dot + id) over the scene
 * preview, the selected one highlighted. In place mode, clicking the preview sets
 * the selected placement's spawn. NPCs render as real sprites in the game.
 */
export function NpcOverlay({
  placements,
  selectedIndex,
  placeMode,
  onPlace,
}: {
  placements: NpcPlacement[]
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
      {placements.map((p, i) => (
        <span
          key={i}
          className={`npc-overlay__marker${i === selectedIndex ? ' npc-overlay__marker--selected' : ''}`}
          style={{ left: `${p.spawn.xFrac * 100}%`, top: `${p.spawn.yFrac * 100}%` }}
        >
          {p.npc}
        </span>
      ))}
      {placeMode && <div className="npc-overlay__catcher" onClick={onClick} />}
    </div>
  )
}
