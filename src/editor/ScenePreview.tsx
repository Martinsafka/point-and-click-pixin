import { useEffect, useRef } from 'react'
import type { Application } from 'pixi.js'
import type { SceneData } from '../data/schema'
import { createPixiApp } from '../engine/app'
import { mountPreview, type Scene } from '../engine/scene'

/**
 * A live, read-only Pixi preview of one scene, sized to its container. Mirrors
 * GameCanvas's StrictMode-safe init/teardown but uses `mountPreview` (no input,
 * no gameplay). Re-mounts when the `scene` prop changes.
 */
export function ScenePreview({ scene }: { scene: SceneData }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let app: Application | undefined
    let preview: Scene | undefined
    let cancelled = false

    const teardown = (target: Application, built?: Scene) => {
      built?.destroy()
      target.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true, textureSource: true },
      )
    }

    void (async () => {
      const created = await createPixiApp(host)
      if (cancelled) {
        teardown(created)
        return
      }
      app = created
      host.appendChild(created.canvas)
      preview = await mountPreview(created, scene)
    })()

    return () => {
      cancelled = true
      if (app) {
        teardown(app, preview)
        app = undefined
        preview = undefined
      }
    }
  }, [scene])

  return <div ref={hostRef} className="preview" />
}
