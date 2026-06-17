import { useEffect, useState } from 'react'
import { bubbleBridge } from '../engine/bubble'
import { cameraOffset } from '../engine/camera'

/** How far (design px) above the feet the bubble's tail sits — roughly above the head. */
const HEAD = 200

interface Positioned {
  id: string
  text: string
  x: number
  y: number
}

/**
 * DOM overlay for world-space **speech bubbles** (M12.5 #6 / #18). The engine publishes each live
 * bubble's revealed text + feet position (design px) on `bubbleBridge`; here an rAF loop maps them
 * to the screen via `cameraOffset` (the same transform the cursor inverts) and renders a `<div>`
 * per bubble — the browser wraps the text, so nothing clips (unlike Pixi `Text`). Font scales with
 * the player's text-size setting via the `--ui-scale` CSS var.
 */
export function SpeechBubbles() {
  const [items, setItems] = useState<Positioned[]>([])

  useEffect(() => {
    let raf = 0
    const tick = () => {
      const next = bubbleBridge.items.map((b) => ({
        id: b.id,
        text: b.text,
        x: b.wx * cameraOffset.scale + cameraOffset.x,
        y: b.wy * cameraOffset.scale + cameraOffset.y - HEAD * cameraOffset.scale,
      }))
      // Only re-render when something actually changed (text or position), to avoid churn when
      // there are no bubbles.
      setItems((prev) => {
        if (
          prev.length === next.length &&
          prev.every((p, i) => {
            const n = next[i]
            return p.id === n.id && p.text === n.text && p.x === n.x && p.y === n.y
          })
        ) {
          return prev
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  if (items.length === 0) return null
  return (
    <div className="speech-bubbles">
      {items.map((b) => (
        <div key={b.id} className="speech-bubble" style={{ left: `${b.x}px`, top: `${b.y}px` }}>
          {b.text}
        </div>
      ))}
    </div>
  )
}
