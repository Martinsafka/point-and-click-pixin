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

### 2026-06-13 — Scene layering + dynamic occlusion + depth scaling (2.5D)
**What:** Turned the flat stage into a 3-layer 2.5D scene. Added `src/systems/depth.ts` (`DepthScale` + `depthScaleAt`) and `src/data/scene-config.ts` (per-scene depth fractions + `resolveDepthScale`). Reworked `engine/scene.ts` into background / interactive-mid / foreground layers with a placeholder backdrop, a Y-sortable crate, and a foreground pillar occluder. `entities/character.ts` now scales + Y-sorts by feet Y. Overlay hint updated. Also added **workflow step 5 "propose a commit message"** to `workflow.md` + `conventions.md` (Done means) + `AGENTS.md` (the loop summary).
**Why:** Deliver the layering + dynamic-occlusion beat (the cube passes behind the foreground and hides) plus the depth illusion that makes it read — all keyed off the feet point step 2 set up.
**How:**
- **Layers** ordered by `zIndex` on a `sortableChildren` stage: background (0) < interactive (10) < foreground (20). Two occlusion kinds: the **foreground pillar** always draws over the character (top layer ⇒ "hides behind it"); the **mid crate** is Y-sorted — its `zIndex = feetY`, the same rule as the character, so the cube draws in front when nearer (larger feetY) and behind when further.
- **Depth scale + Y-sort both come from feet Y** in `Character.syncView`: `container.scale = depthScaleAt(feetY)` and `container.zIndex = feetY`. These are positioning (engine's job), not touching the view's pixels — the view/logic invariant holds. `DepthScale` is injected via the constructor from `resolveDepthScale(demoScene, screenH)`; perspective is **scene data** (fractions of screen height), not hardcoded.
- **Props are inline geometric placeholders** (Röki silhouette) — real scenes/props become a data-driven manifest later; only the depth config is data so far.
- **Verified:** format + typecheck + lint + build green. Occlusion / sorting / scaling are visual — eyeball in `pnpm dev`.
**Follow-ups:**
- Backdrop, prop positions, depth config and `hitArea` are all computed at build from `app.screen` — none re-sync on **resize** yet (one resize pass should refresh them together).
- Walkable-area clamping still deferred: the cube can walk above the horizon (clamped to min scale) and onto props' footprints.
- Next candidates: walk-mesh/walkable polygon, a real scene manifest (data-driven props + multiple scenes), or wiring Zustand (scene/inventory) + Howler.

### 2026-06-13 — Click-to-move + 8-direction facing (cube placeholder)
**What:** First gameplay system. Added `src/systems/movement.ts` (`Facing`/`MoveState` types, `facingFromVector`, `WALK_SPEED`), `src/entities/character-view.ts` (swappable `CharacterView` interface + `createCubeView` placeholder), `src/entities/character.ts` (`Character` entity), `src/engine/scene.ts` (`createScene`: interactive layer + click-to-move + ticker hook). Removed the static placeholder from `engine/app.ts`; `ui/GameCanvas.tsx` now builds/tears down the scene; overlay hint updated.
**Why:** Establish the core `input → logical state → view` loop (the architecture's first spike) and lay the feet-position groundwork that step 1 (layering + occlusion + depth scale/Y-sort) builds on.
**How:**
- **View ≠ logic kept clean.** `Character` holds only mutable per-frame state (x/y/target/facing/state as plain fields, **not** Zustand) + a `CharacterView`. It positions the view container and calls `setPose(state, facing)` — never touches pixels. Swapping the cube for an `AnimatedSprite` is a change in `character-view.ts` alone.
- **Feet-anchored.** View origin = feet (cube drawn y=-H..0); the click target is a feet target — the single point depth scale + Y-sort will read next. Interactive layer already has `sortableChildren = true` so step 1 only adds containers + drives zIndex.
- **Movement.** Lerp toward target in the ticker (`deltaMS`, px/sec speed), snap + idle on arrival. `facingFromVector` buckets the move vector into 8 via `round(atan2 / 45°)`. Facing is a view concern: the cube shows it with a rotating "nose" marker (tinted idle vs walk), no per-direction art needed.
- **Input (v8 events).** Stage `eventMode='static'` + `hitArea = app.screen` (stage bounds only cover children, so a screen-sized hitArea makes empty space clickable) + `pointertap`; click converted to layer-local via `toLocal` so it survives a future camera/transform.
- **Teardown.** `scene.destroy()` drops the ticker callback + listeners + containers before `app.destroy()` — no leaked tickers across StrictMode remounts / future scene swaps.
- **Verified:** typecheck + lint + build green. Interactive behaviour (click → walk, 8-way marker) is visual — eyeball via `pnpm dev`.
**Follow-ups:**
- **Next (step 1):** 3-layer scene (background / mid / foreground occluder) + dynamic occlusion + depth scale & Y-sort from feet Y.
- Click target not yet clamped to a walkable area (walk-mesh/polygon deferred per architecture).
- `hitArea = app.screen` isn't re-synced on resize — revisit with the resize/camera pass.

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
