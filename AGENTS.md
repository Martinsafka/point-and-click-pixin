# AGENTS.md

Shared instructions for coding agents on this project. Keep this lean — read the linked docs with your file-reading tool **only when a task actually needs them**.

## What this repo is

A 2D point-and-click adventure template (stealth + logic puzzles), built for a game jam — generic by design, with no fixed story or characters yet. Dark-horror "Röki-style" flat-vector look. Web build, runs in the browser.

Mindset: this is a short jam project. **Ship a playable vertical slice.** Functional code is the priority; art is a swappable layer that can be deferred (geometric placeholders are a valid shippable style).

Stack: **PixiJS v8** (renderer) + **React** (DOM/UI overlay) + **Zustand** (discrete state) + **Howler** (audio), in **TypeScript**, bundled with **Vite** + **pnpm** (lint: **ESLint + Prettier**). Frame-by-frame animation baked to PNG texture atlases (`AnimatedSprite`).

PixiJS skills are installed **globally** (`~/.claude/skills/`) — use them for any PixiJS v8 work. Start from the `pixijs` router skill.

## How to approach any task — read this first

Follow the loop in `agent_docs/workflow.md` for **every** assignment: analyze → propose architecture → execute → log. Do not skip the analysis or the log.

## Layout (starting target — adjust as the project grows, and record changes in the dev log)

- `src/engine/` — Pixi `Application` setup, scene/layer system, ticker, occlusion, asset loading.
- `src/scenes/` — per-screen scene definitions (background / interactive / foreground layers).
- `src/entities/` — game objects: **logical state + swappable view** (see architecture doc).
- `src/state/` — Zustand store (discrete/meta state only).
- `src/ui/` — React overlay components (HUD, inventory, dialog, menu).
- `src/systems/` — game logic (inventory recipes, interactions, stealth detection).
- `src/audio/` — Howler setup + sound triggers.
- `src/data/` — data-driven config (item recipes, scene/asset manifests, character view maps).
- `public/assets/` — atlases, audio.

## Read before acting — progressive disclosure

Pull the relevant doc(s) into context **only when the task needs them**:

- Vision, scope, what's in / out of scope, the core loop → `agent_docs/project_brief.md`.
- Engine/rendering architecture, layering + occlusion, state split, entity view/logic separation, UI overlay, audio → `agent_docs/architecture.md`.
- Art pipeline (Recraft → Inkscape → atlas → AnimatedSprite), view descriptors, animation technique, geometric fallback → `agent_docs/asset_pipeline.md`.
- Code style, naming, data-driven patterns, TypeScript rules, performance basics → `agent_docs/conventions.md`.
- How to approach tasks (the loop) → `agent_docs/workflow.md`.
- What's been done and why (running log — **append after every task**) → `agent_docs/dev_log.md`.

## Working rule

**Run typecheck + lint before reporting a task done.** Toolchain (scaffolded 2026-06-13): **Vite + pnpm + TypeScript**, lint via **ESLint + Prettier**. Commands:

- `pnpm dev` — Vite dev server (HMR / React Fast Refresh)
- `pnpm build` — typecheck (`tsc --noEmit`) + production build
- `pnpm typecheck` — types only
- `pnpm lint` / `pnpm lint:fix`
- `pnpm format` / `pnpm format:check`

Vite was chosen deliberately, **reversing the earlier "not Vite" note** — it's the first-class PixiJS path, and the top-level-await prod-build gotcha is handled via `build.target: 'esnext'` in `vite.config.ts`. Full rationale: dev log 2026-06-13.

## Non-negotiable invariants

- **View is separate from logic.** An entity holds a Pixi `Container` (its view) that logic positions and drives via abstract states (`idle`, `walk`, `interact`, `hidden`). Logic never touches pixels. Swapping a placeholder cube for a real sprite must be a **data change, not a refactor**. See architecture doc.
- **The player/characters render inside the Pixi scene graph** (never a DOM overlay), so foreground layers can occlude them (stealth). Only UI chrome that sits on top goes in the React overlay.
- **No per-frame state in the reactive store.** Positions, current frame, anything the ticker mutates ~60×/s lives in plain mutable objects. Zustand holds **only** discrete/meta state (inventory, flags, puzzle progress, current scene).
- **Game-logic systems are data-driven.** Item combinations, interactions, etc. come from data tables (e.g. recipes `[red, blue] → purple`), not hardcoded `if/else`.
- **Strong types.** No `any`; distinguish `null` vs `undefined`.
- **The game must run without the LLM.** The persuasion-NPC LLM is an optional bonus behind a stubbed interface — never make core flow depend on it.
- **Log every task.** After finishing, append a `dev_log.md` entry (what / why / how). Not optional.

If a request conflicts with these invariants or `agent_docs/conventions.md`, **refuse and explain why** — do not silently comply, and do not work around the rule. If a rule is unclear, assume the stricter interpretation.
