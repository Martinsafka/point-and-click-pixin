#!/usr/bin/env node
/**
 * Assemble the GitHub Pages site after `vite build`. The game builds into `dist/play`
 * (vite.config.ts `outDir`); this clears any stale files left at the site root by an
 * earlier build, drops the hand-written landing page there (`dist/`), and writes a
 * `.nojekyll` file so GitHub serves every path verbatim (Jekyll would otherwise skip
 * files/dirs starting with `_`). Run via `pnpm build:pages`.
 */
import { cp, readdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const DIST = 'dist'
if (!existsSync(`${DIST}/play/index.html`)) {
  console.error('dist/play not found — run `pnpm build` first (it builds the game there).')
  process.exit(1)
}
// vite only empties dist/play; clear anything else left at the root from an earlier build.
for (const entry of await readdir(DIST)) {
  if (entry !== 'play') await rm(`${DIST}/${entry}`, { recursive: true, force: true })
}
await cp('landing', DIST, { recursive: true })
await writeFile(`${DIST}/.nojekyll`, '')
console.log('✓ site assembled: landing → dist/, game → dist/play/')
