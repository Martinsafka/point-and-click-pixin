/**
 * `pixin` — public API entry point.
 *
 * - **Types** — the GameDoc schema (a whole game is one serializable `GameDoc`).
 * - **Embedding** — `mountGame(doc, container)`: drop a playable game into the DOM.
 * - **Engine** — `createPixiApp` (renderer) + `createSceneHost` (the doc-driven scene runtime)
 *   for hosts that want to build their own UI; `setActiveDoc` to swap the active document.
 * - **Editor draft** — `loadDraft()` (dev-only): the editor's IndexedDB working copy, so a host
 *   can play the draft over its committed `game.json` during the edit → test loop.
 *
 * The editor itself is at `@theideaguards/pixin/editor`. Load the stylesheet once:
 * `import '@theideaguards/pixin/styles.css'`.
 */
export * from './data/schema'
export { mountGame, type GameHandle } from './mount'
export { createPixiApp } from './engine/app'
export { createSceneHost, type SceneHost } from './engine/scene'
export { setActiveDoc } from './data/active-doc'
export { loadDocDraft as loadDraft } from './data/doc-draft'
