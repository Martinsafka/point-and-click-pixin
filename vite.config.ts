import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// build.target 'esnext' is required: PixiJS v8 (and some of its deps) ship
// top-level await, which Vite's production build rejects under the default
// target ("the Vite top-level-await gotcha"). Vite 8 bundles deps with Rolldown,
// which handles TLA natively in dev, so only the prod output target needs this.
// See the toolchain decision (the deliberate "not Vite" reversal) in
// agent_docs/dev_log.md. https://vite.dev/config/
// GitHub Pages serves a project site under a sub-path. The demo game is deployed at
// `/<repo>/play/` (a hand-written landing page sits at the repo-site root), so the
// production build needs that `base`; dev stays at root. Asset refs in the doc are stored
// relative and resolved against `BASE_URL` at load time (see src/data/asset-url.ts).
// Edit GAME_BASE if the repo name changes — it must match `/<repo>/play/`.
const GAME_BASE = '/point-and-click-pixin/play/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? GAME_BASE : '/',
  plugins: [react()],
  build: {
    target: 'esnext',
    outDir: 'dist/play',
    emptyOutDir: true,
  },
}))
