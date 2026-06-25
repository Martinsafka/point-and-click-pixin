import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

// Library build for the publishable `pixin` package — separate from the app / GitHub Pages
// build (vite.config.ts). Two ESM entries (the engine + `mountGame`, and the dev-only editor)
// with `.d.ts`; peer deps stay external so the consumer dedupes their own React / PixiJS / etc.
//   pnpm build:lib   → dist-lib/{index,editor}.js + .d.ts (+ index.css)
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
    // Don't copy public/ (the demo's baked art/audio) into the library output.
    copyPublicDir: false,
    lib: {
      entry: {
        index: 'src/index.ts',
        editor: 'src/editor-entry.tsx',
      },
      formats: ['es'],
      fileName: (_format, name) => `${name}.js`,
    },
    rollupOptions: {
      external: EXTERNAL,
    },
  },
})
