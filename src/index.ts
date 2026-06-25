/**
 * `pixin` — public API entry point.
 *
 * - **Types** — the GameDoc schema (a whole game is one serializable `GameDoc`).
 * - **Embedding** — `mountGame(doc, container)`: drop a playable game into the DOM.
 * - **Engine** — `createPixiApp` (renderer) + `createSceneHost` (the doc-driven scene runtime)
 *   for hosts that want to build their own UI; `setActiveDoc` to swap the active document.
 *
 * The editor is dev-only and not part of this entry. Load the stylesheet once when using
 * `mountGame`: `import 'pixin/styles.css'`.
 */
export * from './data/schema'
export { mountGame, type GameHandle } from './mount'
export { createPixiApp } from './engine/app'
export { createSceneHost, type SceneHost } from './engine/scene'
export { setActiveDoc } from './data/active-doc'
