import type { MouseEvent } from 'react'

/**
 * Preview overlay for an authored **walk-to point** (interactable / NPC placement): a single marker
 * at `at` (when set); in `placeMode` a click anywhere on the preview positions it. Reused for both
 * the selected hotspot and the selected NPC — the Editor feeds it the right point + handler.
 */
export function ApproachOverlay({
  at,
  placeMode,
  onPlace,
}: {
  at?: { xFrac: number; yFrac: number }
  placeMode: boolean
  onPlace: (xFrac: number, yFrac: number) => void
}) {
  const click = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    onPlace((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height)
  }

  return (
    <div className="npc-overlay">
      {at && (
        <span
          className="approach-overlay__marker"
          style={{ left: `${at.xFrac * 100}%`, top: `${at.yFrac * 100}%` }}
        >
          <span className="approach-overlay__dot" />
          <span className="approach-overlay__label">walk-to</span>
        </span>
      )}
      {placeMode && <div className="npc-overlay__catcher" onClick={click} />}
    </div>
  )
}
