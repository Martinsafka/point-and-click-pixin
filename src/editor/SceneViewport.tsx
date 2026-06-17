import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/**
 * The on-screen rect of the scene's **world** inside the preview pane (ME.4). It computes the
 * same **fit** transform the engine's camera publishes (`cameraOffset`): one uniform scale +
 * centring, so a design-fraction maps to a pixel position via the world rect, not via a
 * "the scene fills the box" assumption. The placement / drawing overlays live **inside** it,
 * so they keep their simple fractional coordinates yet stay aligned even when the canvas is a
 * different aspect than the scene (letterbox) — which is what the fullscreen world (ME.6)
 * needs. Today the editor keeps the preview box at the scene's aspect, so the rect equals the
 * box and nothing moves; the wrapper just makes the mapping explicit and camera-driven.
 *
 * The editor preview is always a whole-scene `fit` view (no scroll), so the rect is derived
 * deterministically from the pane size + design — decoupled from engine frame timing. (The
 * in-game cursor reads the live `cameraOffset` singleton instead, since the game can scroll.)
 */
export function SceneViewport({
  design,
  children,
}: {
  design: { width: number; height: number }
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState({ x: 0, y: 0, w: 0, h: 0 })

  useLayoutEffect(() => {
    const parent = ref.current?.parentElement
    if (!parent) return
    const measure = () => {
      const sw = parent.clientWidth
      const sh = parent.clientHeight
      const scale = Math.min(sw / design.width, sh / design.height)
      const w = design.width * scale
      const h = design.height * scale
      setRect({ x: (sw - w) / 2, y: (sh - h) / 2, w, h })
    }
    measure()
    const obs = new ResizeObserver(measure)
    obs.observe(parent)
    return () => obs.disconnect()
  }, [design.width, design.height])

  return (
    <div
      className="scene-viewport"
      ref={ref}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
    >
      {children}
    </div>
  )
}
