import type { GameDoc } from './schema'

/**
 * The **active** game document, shared by the engine, UI and stores.
 *
 * Decouples the runtime from the bundled demo: the standalone app (`data/game.ts`) resolves the
 * editor draft / baked demo and publishes it via `setActiveDoc`; the `mountGame(doc, …)` embedding
 * API does the same for a consumer's doc — so importing the engine no longer pulls in the demo
 * content. `gameDoc` is a live binding (read at render / call time) and starts as a safe **empty**
 * document so the few module-init reads (the story store, the sound library) never see `null`
 * before `setActiveDoc` runs.
 */
const EMPTY: GameDoc = { start: '', scenes: {}, items: {}, initialFlags: {} }

export let gameDoc: GameDoc = EMPTY

/** Publish the active document. The standalone app calls this with the resolved demo/draft; the
 *  `mountGame` embedding API calls it with the consumer's doc. */
export function setActiveDoc(doc: GameDoc): void {
  gameDoc = doc
}
