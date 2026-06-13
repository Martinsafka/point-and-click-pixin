import { useEffect, useState } from 'react'
import { storyStore } from '../state/story'
import { isMuted, setMuted } from '../audio/audio'
import { saveGame } from '../state/storage'

interface Props {
  /** Leave the game and return to the title screen. */
  onExit: () => void
}

/**
 * The in-game menu — a corner button (also toggled with ESC) opening a panel:
 * resume, save, exit to title (confirmed, since unsaved progress is lost), mute.
 * New game / Continue live on the title screen, not here.
 */
export function Menu({ onExit }: Props) {
  const [open, setOpen] = useState(false)
  const [muted, setMutedState] = useState(isMuted())
  const [justSaved, setJustSaved] = useState(false)
  const [confirmExit, setConfirmExit] = useState(false)

  // ESC toggles the menu (and always drops a pending exit confirmation).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen((o) => !o)
        setConfirmExit(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const close = () => {
    setOpen(false)
    setConfirmExit(false)
  }

  const save = async () => {
    await saveGame(storyStore.getState())
    setJustSaved(true)
    setTimeout(() => setJustSaved(false), 1500)
  }

  const toggleMute = () => {
    const next = !muted
    setMuted(next)
    setMutedState(next)
  }

  return (
    <>
      <button type="button" className="menu-button" onClick={() => setOpen(true)}>
        ☰ Menu
      </button>
      {open && (
        <div className="menu-backdrop" onClick={close}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            {confirmExit ? (
              <>
                <h2 className="menu-panel__title">Exit to title?</h2>
                <p className="menu-panel__note">Unsaved progress will be lost.</p>
                <button type="button" className="menu-panel__item" onClick={onExit}>
                  Exit
                </button>
                <button
                  type="button"
                  className="menu-panel__item"
                  onClick={() => setConfirmExit(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h2 className="menu-panel__title">Menu</h2>
                <button type="button" className="menu-panel__item" onClick={close}>
                  Resume
                </button>
                <button type="button" className="menu-panel__item" onClick={() => void save()}>
                  {justSaved ? 'Saved ✓' : 'Save game'}
                </button>
                <button
                  type="button"
                  className="menu-panel__item"
                  onClick={() => setConfirmExit(true)}
                >
                  Exit to title
                </button>
                <button type="button" className="menu-panel__item" onClick={toggleMute}>
                  {muted ? 'Unmute' : 'Mute'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
