import { useEffect, useState } from 'react'
import { storyStore } from '../state/story'
import { isMuted, setMuted } from '../audio/audio'
import { saveGame } from '../state/storage'
import { getSettings, setFontScale, setVolume } from '../state/settings'

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
  const [showSettings, setShowSettings] = useState(false)
  const [settings, setSettingsState] = useState(getSettings())

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
    setShowSettings(false)
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
            ) : showSettings ? (
              <>
                <h2 className="menu-panel__title">Settings</h2>
                <label className="menu-panel__setting">
                  <span>Text size · {Math.round(settings.fontScale * 100)}%</span>
                  <input
                    type="range"
                    min="0.7"
                    max="1.6"
                    step="0.05"
                    value={settings.fontScale}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setFontScale(v)
                      setSettingsState((s) => ({ ...s, fontScale: v }))
                    }}
                  />
                </label>
                <label className="menu-panel__setting">
                  <span>Volume · {Math.round(settings.volume * 100)}%</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.volume}
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      setVolume(v)
                      setSettingsState((s) => ({ ...s, volume: v }))
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="menu-panel__item"
                  onClick={() => setShowSettings(false)}
                >
                  Back
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
                  onClick={() => setShowSettings(true)}
                >
                  Settings
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
