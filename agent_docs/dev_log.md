# Dev Log

Running log of changes — the project's memory for future sessions. **Append a new entry after every task** (newest at the top). Keep entries concrete and skimmable, not verbose.

## How to write an entry

Each entry has: a dated title, then **What / Why / How** (and optional **Follow-ups**):

- **What** — what changed (files / features touched).
- **Why** — the goal or reason.
- **How** — approach taken, key decisions, tradeoffs, anything non-obvious the next session needs.
- **Follow-ups** — known gaps, TODOs, deferred items (optional).

Example shape:

> ### 2026-06-13 — Click-to-move prototype
> **What:** Added `src/engine/scene.ts`, `src/entities/character.ts`; cube character moves to click point.
> **Why:** First system in the spike — validate input → movement in the layered scene.
> **How:** Lerp to target in the ticker; character is a `Graphics` cube behind a `view` interface so it's swappable for a sprite later. Click handled via Pixi `events` on the interactive-mid container.
> **Follow-ups:** A* over a walk-mesh deferred; footprint/anchor not yet modeled.

---

<!-- Newest entries below. Add yours on top of the list. -->

### 2026-06-13 — Stripped game-specific branding → generic template
**What:** Removed the placeholder game title "Finn McCool and the Templar's Treasure" and the character names "Finn, Amara" from all source + docs. Display title is now "Point & Click Adventure" (`index.html`, `src/ui/App.tsx`); `package.json` name → `point-and-click-pixin`; `AGENTS.md`, `project_brief.md`, `asset_pipeline.md` reworded to describe a generic template with no fixed story/characters.
**Why:** User wants this repo to be a reusable, generic point-and-click template, not tied to one game's IP.
**How:** Grepped `finn|mccool|amara|templar|treasure` to find all occurrences (6), replaced each with a generic equivalent. Kept genre / mechanics / visual direction / architecture and external references (Röki, Broken Sword, Polda, the art tools) — those define the template, not the IP. Also fixed a stale contradiction while in the file: `AGENTS.md` called the game "side-scrolling", which the rest of the docs explicitly deny (it's 2.5D depth) — dropped the word. Verified: re-grep returns zero brand references; typecheck + lint + build still green.
**Follow-ups:** None new — systems follow-ups unchanged from the scaffold entry below.

### 2026-06-13 — Dev environment scaffolded (Pixi v8 + React, Vite + pnpm)
**What:** Took the repo from docs-only to a runnable app. Added toolchain config (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`), the `src/` layout from AGENTS.md (`engine/ scenes/ entities/ state/ ui/ systems/ audio/ data/` + `public/assets/`, empty ones `.gitkeep`'d), and a minimal boot — `main.tsx` → `ui/App.tsx` → `ui/GameCanvas.tsx` + `engine/app.ts` — that renders a placeholder Pixi cube under a React overlay. Installed pixi.js, react, react-dom, zustand, howler + dev tooling.
**Why:** First build task — establish a verified dev loop before any game systems.
**How:**
- **Toolchain = Vite + pnpm + ESLint/Prettier + TS.** This **reverses the earlier "not Vite"** note, decided with the user after comparing Vite vs Rsbuild/Parcel/esbuild/webpack. Vite wins for this stack: first-class PixiJS path (create-pixi's main template, official examples), best React+TS DX; its one real risk — the **top-level-await prod-build gotcha** — is a one-liner (`build.target: 'esnext'`). Fresh majors installed: Vite 8 (Rolldown-based), TS 6, ESLint 10, React 19.2, Pixi 8.19.
- **Vite 8 uses Rolldown**, so the old `optimizeDeps.esbuildOptions` TLA workaround is deprecated/unneeded — only the prod `build.target: 'esnext'` is required (kept it minimal).
- **Pixi↔React wiring honours the core invariant:** world lives in the Pixi scene graph (`GameCanvas` mounts `app.canvas`), chrome is a DOM overlay (`pointer-events: none`). Async init/cleanup is StrictMode-safe and tears down with `releaseGlobalResources: true` (per the `pixijs-application` skill) to avoid stale-texture flicker on re-init.
- **Strict types enforced:** `tsconfig` `strict` + `noUnused*` + `verbatimModuleSyntax`; ESLint `@typescript-eslint/no-explicit-any: error` for the no-`any` invariant.
- **Verified green:** `pnpm typecheck`, `pnpm lint`, `pnpm build` (722 modules, no TLA error), `pnpm format:check`; dev server boots and serves `/` + transforms `/src/main.tsx` (HTTP 200).
**Follow-ups:**
- Zustand + Howler are installed but not yet wired — add on first real use (discrete-state store; audio as a state side-effect).
- Placeholder cube doesn't re-center on resize (fine for the smoke test). Next: the scene/layer system — background/mid/foreground containers, Y-sort + depth-scale from feet position.
- `pixi-filters` to add when atmosphere work (fog/glow/chiaroscuro) starts.

### 2026-06-13 — Project docs initialized
**What:** Added `AGENTS.md` + `agent_docs/` (project_brief, architecture, asset_pipeline, conventions, workflow, dev_log, building_and_dev).
**Why:** Establish project context + a documented workflow for Claude Code before the jam build.
**How:** Mirrored a lean-`AGENTS.md` + progressive-disclosure pattern; distilled the pre-jam tech spec into the topic docs. Invariants and the analyze→architect→execute→log loop are the spine.
**Follow-ups:** Scaffold the project (Pixi v8 + React + Zustand + Howler; build tooling TBD — not Vite).
