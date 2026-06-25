#!/usr/bin/env node
/**
 * Faithful local preview of the assembled GitHub Pages site.
 *
 * `vite preview` doesn't serve our nested `outDir` (dist/play) + `base` combo correctly
 * (it returns index.html for the JS/asset requests → blank page), and the build uses
 * absolute base paths (`/point-and-click-pixin/play/…`). This mounts `dist/` under that
 * base prefix with a tiny static server, exactly like Pages. Run after `pnpm build:pages`:
 *
 *   pnpm preview:site               # http://localhost:4173/point-and-click-pixin/
 *   pnpm preview:site -- --port 5000
 */
import { createServer } from 'node:http'
import { stat, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join, extname } from 'node:path'

const DIST = 'dist'
const BASE = '/point-and-click-pixin/' // must match vite.config GAME_BASE's repo segment
const portArg = process.argv.indexOf('--port')
const PORT = Number(portArg !== -1 ? process.argv[portArg + 1] : 4173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
}

if (!existsSync(`${DIST}/play/index.html`)) {
  console.error('dist/play not found — run `pnpm build:pages` first.')
  process.exit(1)
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (!path.startsWith(BASE)) {
    res.writeHead(302, { location: BASE })
    return res.end()
  }
  const rel = path.slice(BASE.length)
  let file = join(DIST, rel)
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html')
    const body = await readFile(file)
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
    res.end(body)
  } catch {
    // No extension → treat as a route and serve the right index.html; else a genuine 404.
    if (extname(rel)) {
      res.writeHead(404)
      return res.end('Not found')
    }
    const fallback = join(DIST, rel.startsWith('play') ? 'play/index.html' : 'index.html')
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(await readFile(fallback))
  }
}).listen(PORT, () => {
  console.log('Preview (mimics GitHub Pages):')
  console.log(`  landing → http://localhost:${PORT}${BASE}`)
  console.log(`  game    → http://localhost:${PORT}${BASE}play/`)
})
