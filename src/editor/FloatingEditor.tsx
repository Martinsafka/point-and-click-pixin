import { useState, type ReactNode } from 'react'
import { FloatingWindow } from './FloatingWindow'

/** One launcher entry → one floating window hosting that section's existing form. */
export interface FloatPanel {
  id: string
  label: string
  render: () => ReactNode
}

/**
 * The in-game floating editor (ME.2) — a **launcher bar** (top-left of the preview) whose
 * entries toggle **floating, draggable windows** over the live world. Several can be open at
 * once; clicking a window (or its launcher entry) raises it to the top. Each window hosts the
 * same section form the fixed `?edit` panel uses, so this coexists with — and reuses — the
 * existing editor during the migration (the panel is retired in ME.6).
 */
export function FloatingEditor({ panels }: { panels: FloatPanel[] }) {
  // `open` is the stack of visible windows, bottom → top; the last is frontmost.
  const [open, setOpen] = useState<string[]>([])

  const focus = (id: string) =>
    setOpen((o) => (o[o.length - 1] === id ? o : [...o.filter((x) => x !== id), id]))
  const close = (id: string) => setOpen((o) => o.filter((x) => x !== id))
  const toggle = (id: string) =>
    setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))

  return (
    <>
      <div className="flaunch">
        {panels.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`flaunch__btn${open.includes(p.id) ? ' flaunch__btn--on' : ''}`}
            onClick={() => toggle(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {open.map((id, i) => {
        const panel = panels.find((p) => p.id === id)
        if (!panel) return null
        // Stagger new windows so they don't stack exactly; z follows the open order.
        const order = panels.findIndex((p) => p.id === id)
        return (
          <FloatingWindow
            key={id}
            title={panel.label}
            z={20 + i}
            initial={{ x: 64 + order * 26, y: 56 + order * 26 }}
            onClose={() => close(id)}
            onFocus={() => focus(id)}
          >
            {panel.render()}
          </FloatingWindow>
        )
      })}
    </>
  )
}
