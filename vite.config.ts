import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// build.target 'esnext' is required: PixiJS v8 (and some of its deps) ship
// top-level await, which Vite's production build rejects under the default
// target ("the Vite top-level-await gotcha"). Vite 8 bundles deps with Rolldown,
// which handles TLA natively in dev, so only the prod output target needs this.
// See the toolchain decision (the deliberate "not Vite" reversal) in
// agent_docs/dev_log.md. https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
  },
})
