import { useEffect, useRef, useState } from 'react'
import type { Application } from 'pixi.js'
import type { SceneData } from '../data/schema'
import { createPixiApp } from '../engine/app'
import {
  createSceneHost,
  mountPreview,
  type PreviewAtmosphere,
  type PreviewScene,
  type SceneHost,
} from '../engine/scene'
import { createStoryStore } from '../state/story'
import { editorStore } from './editor-store'
import { setPreviewStore } from './preview-bridge'

/**
 * A live Pixi preview of one scene, sized to its container. Mounts once and re-mounts only
 * when its React `key` changes (the editor keys it on scene + revision) or the **Edit/Live**
 * toggle flips, so non-structural edits like walkable drawing don't tear the canvas down.
 *
 * Two modes (ME.1):
 * - **Edit** (default) — the static `mountPreview`: a placeholder character at the spawn,
 *   draggable image layers, and the DOM overlays author over it. **Atmosphere is live** here
 *   too (M10 ME.0).
 * - **Live** — the **real** game world via `createSceneHost` over the editor's working doc
 *   (its own story store at this scene, whole-scene `fit` camera, no gameplay input, muted):
 *   NPCs walk their routines and the full lighting/weather render in context. The placement
 *   overlays still sit on top, so you author while the world runs.
 *
 * In both modes the scene's atmosphere (weather + lighting) is rebuilt **live** — without a
 * re-mount — as the author edits, via `refreshAtmosphere`.
 */
export function ScenePreview({ scene }: { scene: SceneData }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let app: Application | undefined
    let preview: PreviewScene | undefined
    let sceneHost: SceneHost | undefined
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const teardown = (target: Application) => {
      preview?.destroy()
      sceneHost?.destroy()
      target.destroy(
        { removeView: true, releaseGlobalResources: true },
        { children: true, texture: true, textureSource: true },
      )
    }
    const atmoOf = (): PreviewAtmosphere => {
      const d = editorStore.getState().doc
      return {
        ambientLight: d.ambientLight,
        playerLight: d.playerLight,
        weatherPresets: d.weatherPresets,
      }
    }

    void (async () => {
      const created = await createPixiApp(host)
      if (cancelled) return teardown(created)
      app = created
      host.appendChild(created.canvas)

      // The hot-tunable refreshers differ by mode (preview vs the live host), but both update
      // in place (no re-mount): atmosphere (weather + lighting) and the character size.
      let refresh: (sc: SceneData, atmo: PreviewAtmosphere) => void
      let setCharScale: (scale: number) => void

      if (live) {
        // Run the REAL world from the editor's working doc — its own story store, parked at
        // this scene, fit camera, no gameplay clicks, muted (authoring, not playing).
        const d = editorStore.getState().doc
        const store = createStoryStore(d)
        store.setState({ currentScene: scene.id })
        sceneHost = createSceneHost(
          created,
          d.scenes,
          store,
          d.player,
          d.referenceHeight,
          d.transition,
          d.npcs,
          d.dialogs,
          d.sequences,
          {},
          d.weatherPresets,
          { ambientLight: d.ambientLight, playerLight: d.playerLight },
          { cameraMode: 'fit', gameplayInput: false, muteAudio: true },
        )
        const sceneHostRef = sceneHost
        refresh = (sc, atmo) => sceneHostRef.refreshAtmosphere(sc, atmo)
        setCharScale = (s) => sceneHostRef.setCharacterScale(s)
        // Publish the live world's story store so the World window (ME.5) can drive it.
        setPreviewStore(store)
      } else {
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
        if (cancelled) return teardown(created)
        const previewRef = preview
        refresh = (sc, atmo) => previewRef.refreshAtmosphere(sc, atmo)
        setCharScale = (s) => previewRef.setCharacterScale(s)
      }

      // Apply hot-tunable edits live (no re-mount): rebuild atmosphere on a lighting / weather
      // change (hash-diffed to skip unrelated edits), and rescale the character on a
      // characterScale change. Each is diffed separately so a cheap edit doesn't rebuild the
      // (expensive) lightmap.
      let lastHash = ''
      let lastCharScale = scene.characterScale ?? 1
      const sync = () => {
        const d = editorStore.getState().doc
        const sc = d.scenes[scene.id]
        if (!sc) return
        const hash = JSON.stringify([
          sc.ambientLight,
          sc.lights,
          sc.darkAreas,
          sc.weather,
          d.ambientLight,
          d.playerLight,
          d.weatherPresets,
        ])
        if (hash !== lastHash) {
          lastHash = hash
          refresh(sc, atmoOf())
        }
        const cs = sc.characterScale ?? 1
        if (cs !== lastCharScale) {
          lastCharScale = cs
          setCharScale(cs)
        }
      }
      sync()
      unsubscribe = editorStore.subscribe(sync)
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
      setPreviewStore(null) // World window (ME.5) goes inert until the next Live mount
      if (app) {
        teardown(app)
        app = undefined
        preview = undefined
        sceneHost = undefined
      }
    }
    // Re-mount on a mode flip or scene change; non-structural edits refresh live (no re-mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, scene.id])

  return (
    <>
      <div ref={hostRef} className="preview" />
      <button
        type="button"
        className="preview__mode"
        onClick={() => setLive((v) => !v)}
        title={live ? 'Show the static editing preview' : 'Run the real world in context'}
      >
        {live ? '● Live' : '▷ Live'}
      </button>
    </>
  )
}
