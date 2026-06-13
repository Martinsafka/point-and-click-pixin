import { useEffect, useRef } from 'react'
import type { Application } from 'pixi.js'
import { createPixiApp } from '../engine/app'
import { createScene, type Scene } from '../engine/scene'

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
    let scene: Scene | undefined
    let cancelled = false

    const teardown = (target: Application, builtScene?: Scene) => {
      // Drop the scene's ticker callback + input listeners first, then release
      // the renderer. releaseGlobalResources matters when re-initing in the same
      // tab (StrictMode remount, later scene swaps) — see the pixijs-application skill.
      builtScene?.destroy()
      target.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true, textureSource: true },
      )
    }

    void (async () => {
      const created = await createPixiApp()
      if (cancelled) {
        teardown(created)
        return
      }
      app = created
      hostRef.current?.appendChild(created.canvas)
      scene = createScene(created)
    })()

    return () => {
      cancelled = true
      if (app) {
        teardown(app, scene)
        app = undefined
        scene = undefined
      }
    }
  }, [])

  return <div ref={hostRef} className="game-canvas" />
}
