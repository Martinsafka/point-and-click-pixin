import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { CreditsScreenConfig, LoadingScreenConfig, TextScreenConfig } from '../data/schema'
import { screenBg } from './screen-bg'
import creatorLogo from './theideaguards-logo.svg'

const textStyle = (c: { size: number; color: string; align: string } | undefined): CSSProperties =>
  c
    ? { fontSize: `${c.size}px`, color: c.color, textAlign: c.align as CSSProperties['textAlign'] }
    : {}

/**
 * The **loading** screen (M11) — shown once on the first visit (the App gates it on a stored
 * flag): a logo + background + a progress bar that fills over `minMs` (default 5 s). The
 * `ready` flag (the game finished booting) holds completion until both are true.
 */
export function LoadingScreen({
  cfg,
  ready = true,
  onDone,
}: {
  cfg?: LoadingScreenConfig
  ready?: boolean
  onDone: () => void
}) {
  const minMs = cfg?.minMs ?? 5000
  const [progress, setProgress] = useState(0)
  const readyRef = useRef(ready)
  const doneRef = useRef(false)

  useEffect(() => {
    readyRef.current = ready
  }, [ready])

  useEffect(() => {
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / minMs)
      setProgress(t)
      if (t >= 1 && readyRef.current) {
        if (!doneRef.current) {
          doneRef.current = true
          onDone()
        }
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="screen screen--loading" style={screenBg(cfg?.bg)}>
      {cfg?.logo && <img className="screen__logo" src={cfg.logo} alt="" />}
      <div className="loading-bar">
        <div className="loading-bar__fill" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  )
}

/** A **game-over / end** text screen (M11) — styled text + caller-supplied action buttons. */
export function TextScreen({
  cfg,
  fallback,
  actions,
}: {
  cfg?: TextScreenConfig
  fallback: string
  actions: ReactNode
}) {
  return (
    <div className="screen screen--text" style={screenBg(cfg?.bg)}>
      <div className="screen__content">
        <p className="screen__text" style={textStyle(cfg)}>
          {cfg?.text ?? fallback}
        </p>
        <div className="screen__actions">{actions}</div>
      </div>
    </div>
  )
}

/** The **credits** screen (M11) — formatted text scrolling upward; ends on scroll-past or Skip. */
export function CreditsScreen({ cfg, onDone }: { cfg?: CreditsScreenConfig; onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const doneRef = useRef(false)
  const finish = () => {
    if (!doneRef.current) {
      doneRef.current = true
      onDone()
    }
  }

  useEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return
    let y = parent.clientHeight // start just below the viewport
    let last = performance.now()
    let raf = 0
    const speed = cfg?.scrollSpeed ?? 45
    const tick = (now: number) => {
      const dt = (now - last) / 1000
      last = now
      y -= speed * dt
      el.style.transform = `translateY(${y}px)`
      if (y < -el.scrollHeight) finish()
      else raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lines = (cfg?.text ?? 'Thanks for playing!').split('\n')
  return (
    <div className="screen screen--credits" style={screenBg(cfg?.bg)}>
      <div className="credits__scroll" ref={ref} style={textStyle(cfg)}>
        {lines.map((line, i) => (
          <p key={i} className="credits__line">
            {line || ' '}
          </p>
        ))}
      </div>
      <button type="button" className="screen__skip" onClick={finish}>
        Skip ⏭
      </button>
    </div>
  )
}

/**
 * The **final** screen (M11) — the editor author's logo. **Not editable**: a hardcoded image
 * dropped in at release (the placeholder below). Click / auto-timeout returns to the title.
 */
export function FinalScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 6000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div className="screen screen--final" onClick={onDone}>
      {/* The creator's logo — hardcoded brand mark, swapped in at release. */}
      <img className="final__logo" src={creatorLogo} alt="The Idea Guards" />
      <p className="final__hint">click to continue</p>
    </div>
  )
}
