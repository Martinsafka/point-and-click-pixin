import type { MouseEvent } from 'react'
import type { PointEmitter } from '../data/schema'

/**
 * Preview overlay for point emitters (M10): a ⛲ marker at each emitter's position (the
 * selected one highlighted). In `place` mode a click on the preview positions the selected
 * emitter. (The particles themselves render in the live world.)
 */
export function EmitterOverlay({
  emitters,
  selected,
  placeMode,
  onPlace,
}: {
  emitters: PointEmitter[]
  selected: number | null
  placeMode: boolean
  onPlace: (xFrac: number, yFrac: number) => void
}) {
  const click = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onPlace((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }

  return (
    <div className="npc-overlay">
      {emitters.map((em, i) => (
        <span
          key={em.id}
          className={`light-overlay__marker${i === selected ? ' light-overlay__marker--selected' : ''}`}
          style={{ left: `${em.x * 100}%`, top: `${em.y * 100}%`, color: em.color }}
        >
          ⛲
        </span>
      ))}
      {placeMode && <div className="npc-overlay__catcher" onClick={click} />}
    </div>
  )
}
