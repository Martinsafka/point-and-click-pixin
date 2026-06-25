/**
 * `pixin` — public API entry point.
 *
 * Phase 1 of packaging (build scaffolding): the GameDoc **schema types** (the documented
 * public API — a whole game is one serializable `GameDoc`) plus the **renderer bootstrap**.
 * The engine runtime and the `mountGame(doc, container)` embedding API are added once the
 * active-document singleton is decoupled from the bundled demo (see the npm-package plan in
 * the dev log).
 */
export * from './data/schema'
export { createPixiApp } from './engine/app'
