import { useEffect, useRef } from 'react'
import type { Application } from 'pixi.js'
import type { SceneData } from '../data/schema'
import { createPixiApp } from '../engine/app'
import { mountPreview, type PreviewScene } from '../engine/scene'
import { editorStore } from './editor-store'

/**
 * A live Pixi preview of one scene, sized to its container. Mounts once and re-mounts only
 * when its React `key` changes (the editor keys it on scene + revision), so non-structural
 * edits like walkable drawing don't tear the canvas down. **Atmosphere (weather + lighting,
 * M10 ME.0) is shown and rebuilt live** as the author edits — without re-mounting — so
 * lighting / weather are visible while tuning.
 */
export function ScenePreview({ scene }: { scene: SceneData }) {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let app: Application | undefined
    let preview: PreviewScene | undefined
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const teardown = (target: Application, built?: PreviewScene) => {
      built?.destroy()
      target.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true, textureSource: true },
      )
    }
    const atmoOf = () => {
      const d = editorStore.getState().doc
      return { ambientLight: d.ambientLight, playerLight: d.playerLight, weatherPresets: d.weatherPresets }
    }

    void (async () => {
      const created = await createPixiApp(host)
      if (cancelled) return teardown(created)
      app = created
      host.appendChild(created.canvas)
      preview = await mountPreview(
        created,
        scene,
        {
          onLayerMove: (index, xFrac, yFrac) =>
            editorStore.getState().setLayerPos(scene.id, index, xFrac, yFrac),
        },
        editorStore.getState().doc.player,
        editorStore.getState().doc.referenceHeight,
        atmoOf(),
      )
      if (cancelled) return teardown(created, preview)

      // Rebuild the preview's atmosphere when this scene's lighting / weather config (or the
      // doc-level defaults) change — a hash diff avoids rebuilding on unrelated edits.
      let lastHash = ''
      const sync = () => {
        const d = editorStore.getState().doc
        const sc = d.scenes[scene.id]
        if (!sc || !preview) return
        const hash = JSON.stringify([
          sc.ambientLight,
          sc.lights,
          sc.darkAreas,
          sc.weather,
          d.ambientLight,
          d.playerLight,
          d.weatherPresets,
        ])
        if (hash === lastHash) return
        lastHash = hash
        preview.refreshAtmosphere(sc, atmoOf())
      }
      sync()
      unsubscribe = editorStore.subscribe(sync)
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
      if (app) {
        teardown(app, preview)
        app = undefined
        preview = undefined
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={hostRef} className="preview" />
}
