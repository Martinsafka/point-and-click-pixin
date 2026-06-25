# Pixin — a data-driven point-and-click engine + no-code editor

Build 2D point-and-click adventures (puzzles, dialogue, stealth, cutscenes, atmosphere) **with
no code** — in a visual in-browser editor — then ship them to the web. The whole game is one
serializable `GameDoc` (a single `game.json`), so the engine, the editor, and your content all
sit on the same typed schema.

> **Status:** the editor is **feature-complete (v1)** and **published** — `@theideaguards/pixin`
> (engine + editor) + `@theideaguards/create-pixin` (scaffolder). A demo game is live on
> [GitHub Pages](https://martinsafka.github.io/point-and-click-pixin/). See
> [the roadmap](agent_docs/roadmap.md).

## Quick start

Scaffold a project (the editor + engine, wired up):

```bash
npm create @theideaguards/pixin my-game
#   add  -- --template demo  for the sample game ("Magický polibek")
cd my-game
npm install
npm run dev          # play at http://localhost:5173/
#   open  ?edit  to launch the visual editor (dev-only)
```

Author in the editor — it saves to an IndexedDB draft, and **▶ Test in game** plays it. When you're
happy, **Export** the document and run `npm run assets` to bake the embedded art/audio into
`public/assets/` and write a lean `content/game.json` to commit.

Or embed the engine in an existing app:

```bash
npm install @theideaguards/pixin
```

```ts
import { mountGame } from '@theideaguards/pixin'
import '@theideaguards/pixin/styles.css'

mountGame(myGameDoc, document.getElementById('root')!)
```

📖 **Full walkthrough → [editor guide](agent_docs/editor_guide.md)** (every panel, control, and the
edit → test → publish loop). 🎨 Asset formats are in its **Preparing assets** section.

## What the editor can do

A no-code, in-browser editor over the live running game — a launcher bar opens floating tool
windows; edits update the world instantly.

- **Scenes & layout** — multiple scenes, a horizontal-scrolling camera, parallax layers, depth
  (perspective) scaling, draw the **walkable** floor + **holes** (obstacles the nav-mesh routes
  around), upload SVG/PNG/animated layers (fit / drag to place).
- **Interactables** — pickables, exits, click-to-interact objects, **inspect** (the protagonist
  comments), and **enter-triggers** (volumes that fire when feet cross in / rest / leave). Each
  has a hit-area, a `when` gate, effects, and item-`uses`.
- **Items, inventory & recipes** — an item catalogue (icons, examine text, **conditional examine**,
  **on-click** dialogs/effects), combine **recipes**, and use-an-item-on-an-object.
- **Logic vocabulary** — one `Condition` (`hasItem` / `flag` / `visited` / `all` / `any` / `not`)
  and `Effect` set (setFlag, give/take item, goTo, moveNpc, startDialog, startSequence, playSound,
  playAnim, say, wait, setStance, gameOver, endGame …) gates **everything**.
- **Characters & animation** — a player + a global NPC cast; baked-atlas `AnimatedSprite` views
  (8-direction walk, one-shots), **conditional appearance** variants swapped by flag, depth-sort.
- **NPCs** — place the cast into scenes, draw **patrol paths**, give a cross-scene **routine**
  (a React-Flow node graph), **stealth vision** (range + cone + line-of-sight; **approach** the
  player), **monologues** (world-space speech bubbles, with sound), per-NPC dialogue & voice.
- **Dialogue** — a reusable library of branching trees (typewriter, choices, conditional routers,
  effects, voice blips), assigned per NPC (+ per-scene override) or started by any effect.
- **Cutscenes** — an ordered, skippable sequence runner (move / anim / face / dialog / camera /
  wait / effects) over the cast + a camera override.
- **Atmosphere** — per-scene **weather** (parametric particles), localized **emitters**, rolling
  **fog**, **lighting** (ambient + placed lights with shapes/flicker, a player torch, dark areas),
  **colour grade**, **vignette**, **lightning + thunder**.
- **Game logic** — a global **rules** engine, a **clock** (time-of-day; time-gated routines), and
  an auto-generated read-only **logic-overview graph** of the flag web.
- **Audio** — a global sound **library** (upload once, reference everywhere); ambient beds,
  footsteps (incl. per-NPC), per-animation SFX, voice, weather loops.
- **Framing** — title / loading / game-over / end / credits **screens**, a **font** picker,
  scene **transitions**, save / load, and an in-game settings menu (text size + volume).

…and you **▶ Test in game** any time, then **Export** to `content/game.json`.

## Building with AI (Claude Code)

This repo is set up for AI-assisted development:

- **[`AGENTS.md`](AGENTS.md)** + `agent_docs/` — project context, architecture, conventions, and a
  running dev log for coding agents.
- **Pixin authoring skills** — bundled Claude Code skills (`pixin-gamedoc`, `pixin-editor`,
  `pixin-recipes`) that turn "I want mechanic X" into the exact editor steps or a `game.json` snippet.
- **PixiJS skills** — for any rendering work, install the official **[PixiJS](https://pixijs.com)**
  Claude Code skills (v8); they're the first-class path for the renderer this engine is built on.

## Tech stack

[PixiJS v8](https://pixijs.com) (renderer) · React (DOM/UI overlay) · Zustand (discrete state) ·
Howler (audio) · TypeScript (strict) · Vite + pnpm.

## Develop this repo

```bash
pnpm install
pnpm dev            # the bundled demo + the editor (?edit)
pnpm build          # typecheck + production build (the editor is stripped from the player build)
pnpm lint           # the green bar
```

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Docs

- [Editor guide](agent_docs/editor_guide.md) — using the editor (+ asset formats).
- [Roadmap](agent_docs/roadmap.md) — milestones & what's next.
- [Architecture](agent_docs/architecture.md) · [Asset pipeline](agent_docs/asset_pipeline.md) ·
  [Conventions](agent_docs/conventions.md) · [Dev log](agent_docs/dev_log.md).
- [Contributing](CONTRIBUTING.md) · [Code of conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © Martin Šafka.
