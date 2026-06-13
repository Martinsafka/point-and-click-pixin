import { useEffect, useState } from 'react'
import { hasSave } from '../state/storage'

interface Props {
  onNewGame: () => void
  onContinue: () => void
}

/**
 * The start screen — New game / Continue. A plain DOM screen for now; composing
 * it visually from SVG layers (background, logo, framing) is the editor's job
 * (roadmap M8). Continue is enabled only when a save exists.
 */
export function TitleScreen({ onNewGame, onContinue }: Props) {
  const [canContinue, setCanContinue] = useState(false)

  useEffect(() => {
    void hasSave().then(setCanContinue)
  }, [])

  return (
    <div className="title">
      <div className="title__panel">
        <h1 className="title__name">Point &amp; Click Adventure</h1>
        <p className="title__tagline">A tiny geometric placeholder adventure.</p>
        <button type="button" className="title__btn" onClick={onNewGame}>
          New game
        </button>
        <button type="button" className="title__btn" onClick={onContinue} disabled={!canContinue}>
          Continue
        </button>
      </div>
    </div>
  )
}
