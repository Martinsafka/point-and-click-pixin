import { useEffect, useState, type CSSProperties } from 'react'
import { hasSave } from '../state/storage'
import type { TitleButton, TitleScreenConfig } from '../data/schema'
import { screenBg } from './screen-bg'

interface Props {
  cfg?: TitleScreenConfig
  onNewGame: () => void
  onContinue: () => void
}

/**
 * The start screen (M11) — a configurable **background** + **logo** (or a styled heading) over
 * the **New game** / **Continue** buttons. Each button is a styled HTML **text** label or a
 * click-through **image** (`TitleButton.mode`). Continue is enabled only when a save exists.
 */
export function TitleScreen({ cfg, onNewGame, onContinue }: Props) {
  const [canContinue, setCanContinue] = useState(false)

  useEffect(() => {
    void hasSave().then(setCanContinue)
  }, [])

  const btnText: CSSProperties = {
    fontSize: cfg?.buttonFontSize ? `${cfg.buttonFontSize}px` : undefined,
    color: cfg?.buttonColor,
  }
  const button = (
    b: TitleButton | undefined,
    label: string,
    onClick: () => void,
    disabled = false,
  ) =>
    b?.mode === 'image' && b.image ? (
      <button
        type="button"
        className="title__btn title__btn--image"
        onClick={onClick}
        disabled={disabled}
      >
        <img src={b.image} alt={b.text ?? label} />
      </button>
    ) : (
      <button
        type="button"
        className="title__btn"
        style={btnText}
        onClick={onClick}
        disabled={disabled}
      >
        {b?.text ?? label}
      </button>
    )

  const tagline = cfg ? cfg.tagline : 'A tiny geometric placeholder adventure.'

  return (
    <div className="title" style={screenBg(cfg?.bg)}>
      <div className="title__panel">
        {cfg?.logo ? (
          <img className="title__logo" src={cfg.logo} alt="" />
        ) : (
          <h1
            className="title__name"
            style={{
              fontSize: cfg?.headingSize ? `${cfg.headingSize}px` : undefined,
              color: cfg?.headingColor,
            }}
          >
            {cfg?.heading ?? 'Point & Click Adventure'}
          </h1>
        )}
        {tagline && <p className="title__tagline">{tagline}</p>}
        {button(cfg?.newGame, 'New game', onNewGame)}
        {button(cfg?.continue, 'Continue', onContinue, !canContinue)}
      </div>
    </div>
  )
}
