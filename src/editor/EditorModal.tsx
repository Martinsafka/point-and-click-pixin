import type { ReactNode } from 'react'

/**
 * A centered modal overlay for the editor (dev-only) — a backdrop + a roomy panel with
 * a title bar and a close button. Clicking the backdrop or ✕ closes it. Used where a
 * form needs space (the NPC definition, the dialogue node tree).
 */
export function EditorModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="editor-modal" onClick={onClose}>
      <div className="editor-modal__panel" onClick={(e) => e.stopPropagation()}>
        <div className="editor-modal__bar">
          <span className="editor-modal__title">{title}</span>
          <button type="button" className="editor-modal__close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="editor-modal__body">{children}</div>
      </div>
    </div>
  )
}
