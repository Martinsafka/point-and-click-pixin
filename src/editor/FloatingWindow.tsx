import { useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'

/**
 * A floating, draggable editor window (ME.2) — title bar (drag handle) + ✕, an absolute box
 * positioned within the preview pane. Unlike `EditorModal` it has **no backdrop** and doesn't
 * block the rest of the UI, so several can sit open over the live world at once. Dragging and
 * the close button are owned here; the parent (`FloatingEditor`) owns which windows are open,
 * their stacking order (`z`), and raising one to the top on focus.
 */
export function FloatingWindow({
  title,
  initial,
  z,
  onClose,
  onFocus,
  children,
}: {
  title: string
  initial: { x: number; y: number }
  z: number
  onClose: () => void
  onFocus: () => void
  children: ReactNode
}) {
  const [pos, setPos] = useState(initial)
  const grab = useRef<{ dx: number; dy: number } | null>(null)

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Don't start a drag from the ✕ (let the click through).
    if ((e.target as HTMLElement).closest('.fwin__close')) return
    onFocus()
    grab.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }
    const move = (ev: PointerEvent) => {
      if (!grab.current) return
      setPos({
        x: Math.max(0, ev.clientX - grab.current.dx),
        y: Math.max(0, ev.clientY - grab.current.dy),
      })
    }
    const up = () => {
      grab.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <div className="fwin" style={{ left: pos.x, top: pos.y, zIndex: z }} onPointerDown={onFocus}>
      <div className="fwin__bar" onPointerDown={startDrag}>
        <span className="fwin__title">{title}</span>
        <button type="button" className="fwin__close" onClick={onClose} title="Close">
          ✕
        </button>
      </div>
      <div className="fwin__body">{children}</div>
    </div>
  )
}
