import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// PixiJS v8 ships top-level await, which Vite's prod build rejects under the default target.
export default defineConfig({
  plugins: [react()],
  build: { target: 'esnext' },
})
