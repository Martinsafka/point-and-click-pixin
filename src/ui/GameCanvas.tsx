import { useEffect, useRef } from 'react'
import type { Application } from 'pixi.js'
import { createPixiApp } from '../engine/app'

/**
 * Hosts the PixiJS canvas inside the React tree. The canvas is the game world;
 * React chrome (HUD / inventory / dialog) renders on top as a DOM overlay.
 *
 * The async init + cleanup is written to survive React StrictMode's
 * mount → unmount → remount in dev: if the component unmounts before init
 * resolves, the created app is torn down instead of leaking a second renderer.
 */
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let app: Application | undefined
    let cancelled = false

    const destroy = (target: Application) => {
      // releaseGlobalResources matters when re-initing in the same tab (e.g.
      // StrictMode remount, later scene swaps) — otherwise stale textures /
      // flicker. See the pixijs-application skill.
      target.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true, textureSource: true },
      )
    }

    void (async () => {
      const created = await createPixiApp()
      if (cancelled) {
        destroy(created)
        return
      }
      app = created
      hostRef.current?.appendChild(created.canvas)
    })()

    return () => {
      cancelled = true
      if (app) {
        destroy(app)
        app = undefined
      }
    }
  }, [])

  return <div ref={hostRef} className="game-canvas" />
}
