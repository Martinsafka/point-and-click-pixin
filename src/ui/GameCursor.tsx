import { useEffect, useRef, useState } from 'react'
import { pickInteractable } from '../systems/interactions'
import { containsPoint } from '../systems/walkable'
import { cameraOffset } from '../engine/camera'
import { sceneHit } from '../engine/hotspots'
import { designSize } from '../data/scene-config'
import { storyStore } from '../state/story'
import { gameDoc } from '../data/game'
import { assetUrl } from '../data/asset-url'
import type { CursorKind } from '../data/schema'

const EMOJI: Record<CursorKind, string> = {
  walk: '👣',
  pickable: '✋',
  interact: '⚙️',
  exit: '🚪',
  inspect: '👁',
  talk: '👄',
  default: '↖️',
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
      // Convert the viewport pointer to world coords (the camera may have scrolled)
      // and resolve the walkable / interactables against the world size.
      let kind: CursorKind = 'default'
      // A clickable NPC under the pointer wins (matches the click: NPCs capture it over
      // interactables). The engine answers — the cursor can't see moving entities.
      const npcKind = sceneHit.kindAt?.(e.clientX, e.clientY) ?? null
      if (npcKind) {
        kind = npcKind
      } else if (scene) {
        // Invert the camera: map the viewport pointer back to design space.
        const design = designSize(scene, gameDoc.referenceHeight)
        const wx = (e.clientX - cameraOffset.x) / cameraOffset.scale
        const wy = (e.clientY - cameraOffset.y) / cameraOffset.scale
        const hit = pickInteractable(scene.interactables, wx, wy, design, state)
        if (hit) {
          kind = hit.kind
        } else {
          const px = scene.walkable.map((v, i) => v * (i % 2 === 0 ? design.width : design.height))
          kind = containsPoint({ polygon: px }, wx, wy) ? 'walk' : 'default'
        }
      }
      setKind(kind)
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
      {icon ? (
        <img src={assetUrl(icon)} alt="" />
      ) : (
        <span className="game-cursor__emoji">{EMOJI[kind]}</span>
      )}
    </div>
  )
}
