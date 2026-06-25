#!/usr/bin/env node
/**
 * `create-pixin` — scaffold a Pixin game project.
 *
 *   npx create-pixin <project-name> [--template clean|demo]
 *
 * `clean` is the base project (a blank game + the editor wired up); `demo` overlays the
 * "Magický polibek" demo, whose art/audio load from the hosted Pages deployment (CDN refs),
 * so the scaffold stays tiny.
 */
import { cp, readFile, writeFile, rename, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const name = argv.find((a) => !a.startsWith('--'))
const tplIdx = argv.indexOf('--template')
const template = tplIdx !== -1 ? argv[tplIdx + 1] : 'clean'

if (!name) {
  console.error('Usage: npx create-pixin <project-name> [--template clean|demo]')
  process.exit(1)
}
if (template !== 'clean' && template !== 'demo') {
  console.error(`Unknown template "${template}" — use "clean" or "demo".`)
  process.exit(1)
}

const target = resolve(process.cwd(), name)
if (existsSync(target) && (await readdir(target)).length) {
  console.error(`Directory "${name}" already exists and is not empty.`)
  process.exit(1)
}

// `clean` is the base; `demo` overlays its content/game.json onto it.
await cp(join(HERE, 'templates', 'clean'), target, { recursive: true })
if (template === 'demo') {
  await cp(join(HERE, 'templates', 'demo'), target, { recursive: true })
}

// `_gitignore` → `.gitignore` (npm strips a real .gitignore from published packages).
if (existsSync(join(target, '_gitignore'))) {
  await rename(join(target, '_gitignore'), join(target, '.gitignore'))
}

// Fill the project name into package.json + index.html.
for (const file of ['package.json', 'index.html']) {
  const path = join(target, file)
  if (existsSync(path))
    await writeFile(path, (await readFile(path, 'utf8')).replaceAll('{{name}}', name))
}

console.log(`\n✓ Created ${name} (${template} template)\n`)
console.log('Next steps:')
console.log(`  cd ${name}`)
console.log('  pnpm install        # or npm install')
console.log('  pnpm dev            # play the game; open ?edit for the visual editor')
console.log('')
