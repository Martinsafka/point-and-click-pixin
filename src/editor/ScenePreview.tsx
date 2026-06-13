import { useEffect, useRef } from 'react'
import type { Application } from 'pixi.js'
import type { SceneData } from '../data/schema'
import { createPixiApp } from '../engine/app'
import { mountPreview, type Scene } from '../engine/scene'

/**
 * A live, read-only Pixi preview of one scene, sized to its container. Mounts
 * once and re-mounts only when its React `key` changes (the editor keys it on
 * scene + revision), so non-structural edits like walkable drawing don't tear the
 * canvas down — they show in the DOM overlay instead.
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
    // Mount once; the editor re-mounts via the React key on structural changes,
    // so walkable edits (same key) keep this canvas alive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={hostRef} className="preview" />
}
