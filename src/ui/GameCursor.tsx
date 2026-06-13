import { useEffect, useRef, useState } from 'react'
import { pickInteractable } from '../systems/interactions'
import { storyStore } from '../state/story'
import { gameDoc } from '../data/game'
import type { CursorKind } from '../data/schema'

const EMOJI: Record<CursorKind, string> = {
  walk: '👣',
  pickable: '✋',
  interact: '⚙️',
  exit: '🚪',
}

/**
 * The in-game pointer cursor: a DOM element following the mouse, its icon chosen
 * by what's under it (a hotspot's kind, else "walk"). Uses an uploaded icon from
 * the document if present, else an emoji fallback. The native cursor is hidden
 * over the scene canvas (styles.css); over the UI chrome it shows normally and
 * this one hides. Position updates via a ref (no re-render); only the kind /
 * visibility use state.
 */
export function GameCursor() {
  const ref = useRef<HTMLDivElement>(null)
  const [kind, setKind] = useState<CursorKind>('walk')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Only over the bare scene canvas — let the native cursor handle UI chrome.
      if (!(e.target instanceof HTMLCanvasElement)) {
        setVisible(false)
        return
      }
      const el = ref.current
      if (el) {
        el.style.left = `${e.clientX}px`
        el.style.top = `${e.clientY}px`
      }
      const state = storyStore.getState()
      const scene = gameDoc.scenes[state.currentScene]
      const screen = { width: window.innerWidth, height: window.innerHeight }
      const hit = scene
        ? pickInteractable(scene.interactables, e.clientX, e.clientY, screen, state)
        : undefined
      setKind(hit ? hit.kind : 'walk')
      setVisible(true)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const icon = gameDoc.cursors?.[kind]
  return (
    <div
      ref={ref}
      className="game-cursor"
      style={{ display: visible ? 'block' : 'none' }}
      aria-hidden
    >
      {icon ? <img src={icon} alt="" /> : <span className="game-cursor__emoji">{EMOJI[kind]}</span>}
    </div>
  )
}
