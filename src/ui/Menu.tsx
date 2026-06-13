import { useState } from 'react'
import { storyStore } from '../state/story'
import { gameDoc } from '../data/game'
import { isMuted, setMuted } from '../audio/audio'

/**
 * The game menu — a DOM overlay button that opens a small panel: resume, start a
 * new game (resets the story store; the scene host follows), and mute. Open/close
 * is transient UI state, so it stays in React, not the store.
 */
export function Menu() {
  const [open, setOpen] = useState(false)
  const [muted, setMutedState] = useState(isMuted())

  const newGame = () => {
    storyStore.getState().reset(gameDoc)
    setOpen(false)
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
        <div className="menu-backdrop" onClick={() => setOpen(false)}>
          <div className="menu-panel" onClick={(e) => e.stopPropagation()}>
            <h2 className="menu-panel__title">Menu</h2>
            <button type="button" className="menu-panel__item" onClick={() => setOpen(false)}>
              Resume
            </button>
            <button type="button" className="menu-panel__item" onClick={newGame}>
              New game
            </button>
            <button type="button" className="menu-panel__item" onClick={toggleMute}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
