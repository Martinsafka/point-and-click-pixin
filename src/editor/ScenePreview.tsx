import { useEffect, useRef } from 'react'
import type { Application } from 'pixi.js'
import type { SceneData } from '../data/schema'
import { createPixiApp } from '../engine/app'
import { createSceneHost, type PreviewAtmosphere, type SceneHost } from '../engine/scene'
import { createStoryStore } from '../state/story'
import { editorStore } from './editor-store'
import { setPreviewStore } from './preview-bridge'

/**
 * The editor's live world — the **real** game (`createSceneHost`) over the editor's working
 * doc, filling the preview pane (ME.6: one Pixi world, no static preview). It runs with its
 * own story store parked at this scene, a whole-scene `fit` camera, no gameplay input and
 * muted audio — so you author *over* a running world (NPCs walk their routines, lighting /
 * weather render, gated content shows) rather than playing it. Image layers stay draggable.
 *
 * Re-mounts only when its React `key` changes (the editor keys it on scene + revision), so
 * non-structural edits don't tear the canvas down; atmosphere (weather + lighting) and the
 * character size are rebuilt **live** in place via the host's `refreshAtmosphere` /
 * `setCharacterScale`. The live story store is published to `preview-bridge` for the World
 * window (ME.5).
 */
export function ScenePreview({ scene, paused }: { scene: SceneData; paused: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const pausedRef = useRef(paused)

  // Freeze / resume the live world (NPC motion + routines + atmosphere animation) by
  // stopping the Pixi ticker — no re-mount, so edits still apply. Applied at mount too (via
  // `pausedRef`) so a re-mount while paused stays frozen.
  useEffect(() => {
    pausedRef.current = paused
    const app = appRef.current
    if (app) app.ticker[paused ? 'stop' : 'start']()
  }, [paused])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let app: Application | undefined
    let sceneHost: SceneHost | undefined
    let unsubscribe: (() => void) | undefined
    let cancelled = false

    const teardown = (target: Application) => {
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
      appRef.current = created
      host.appendChild(created.canvas)
      if (pausedRef.current) created.ticker.stop()

      // Run the REAL world from the editor's working doc — its own story store, parked at this
      // scene, fit camera, no gameplay clicks, muted (authoring, not playing).
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
        {
          cameraMode: 'fit',
          gameplayInput: false,
          muteAudio: true,
          onLayerMove: (index, xFrac, yFrac) =>
            editorStore.getState().setLayerPos(scene.id, index, xFrac, yFrac),
        },
      )
      const sceneHostRef = sceneHost
      // Publish the live world's story store so the World window (ME.5) can drive it.
      setPreviewStore(store)

      // Apply hot-tunable edits live (no re-mount): rebuild atmosphere on a lighting / weather
      // change (hash-diffed to skip unrelated edits), and rescale the character on a
      // characterScale change. Each is diffed separately so a cheap edit doesn't rebuild the
      // (expensive) lightmap.
      let lastHash = ''
      let lastCharScale = scene.characterScale ?? 1
      const sync = () => {
        const doc = editorStore.getState().doc
        const sc = doc.scenes[scene.id]
        if (!sc) return
        const hash = JSON.stringify([
          sc.ambientLight,
          sc.lights,
          sc.darkAreas,
          sc.weather,
          doc.ambientLight,
          doc.playerLight,
          doc.weatherPresets,
        ])
        if (hash !== lastHash) {
          lastHash = hash
          sceneHostRef.refreshAtmosphere(sc, atmoOf())
        }
        const cs = sc.characterScale ?? 1
        if (cs !== lastCharScale) {
          lastCharScale = cs
          sceneHostRef.setCharacterScale(cs)
        }
      }
      sync()
      unsubscribe = editorStore.subscribe(sync)
    })()

    return () => {
      cancelled = true
      unsubscribe?.()
      setPreviewStore(null) // World window (ME.5) goes inert until the next mount
      if (app) {
        teardown(app)
        app = undefined
        appRef.current = null
        sceneHost = undefined
      }
    }
    // Re-mount on scene change; non-structural edits refresh live (no re-mount).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.id])

  return <div ref={hostRef} className="preview" />
}
