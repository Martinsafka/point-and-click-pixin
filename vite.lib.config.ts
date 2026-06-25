import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// Library build for the publishable `pixin` package — separate from the app / GitHub Pages
// build (vite.config.ts). Bundles `src/index.ts` as ESM and emits `.d.ts`; peer deps stay
// external so the consumer dedupes their own copy of React / PixiJS / etc.
//   pnpm build:lib   → dist-lib/index.js + dist-lib/index.d.ts
const EXTERNAL = [
  'pixi.js',
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  'howler',
  'zustand',
  'zustand/vanilla',
  '@xyflow/react',
  'earcut',
]

export default defineConfig({
  plugins: [dts({ include: ['src'], outDir: 'dist-lib' })],
  build: {
    target: 'esnext',
    outDir: 'dist-lib',
    emptyOutDir: true,
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: EXTERNAL,
    },
  },
})
