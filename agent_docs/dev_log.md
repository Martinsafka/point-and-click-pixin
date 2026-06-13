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

### 2026-06-13 — M1: pickup + inventory bar + condition-gated door
**What:** Inventory, first half. Pickables are picked up via the existing click → effect path; a picked item vanishes from the scene and shows in an inventory bar. Added `LayerData.when?` (conditional layers) + a store subscription in `mountScene` that toggles layer visibility as state changes. New `ui/Inventory.tsx` (DOM bar reading `store.inventory`) + styles. Street: a gold `key` pickable (visual + hitArea, both gated `not hasItem(key)`); the room door now gated `hasItem(key)`. Added the `key` item to `gameDoc`.
**Why:** Deliver the pickup → inventory → condition-gated-transition loop — the spine of inventory puzzles — on the M0 condition/effect foundation.
**How:**
- **Pick up once, then vanish, no extra state:** the pickable AND its visual layer are both gated `not hasItem(item)`. Pick up → you hold it → both disappear (the layer via the visibility subscription; the pickable via `pickInteractable`'s `when`). The door's `when: hasItem(key)` is re-checked per click, so it "unlocks" the moment you hold the key. Caveat: if an item is later *consumed*, a `not hasItem` pickable reappears — a per-pickable picked-flag is the robust fix once use/combine can consume items.
- **Conditional layers are general:** any layer with `when` is shown/hidden reactively (scene subscribes to the store, unsubscribes on destroy) — useful beyond pickups (open/closed doors, state props).
- **Inventory UI is display-only** for now (names/placeholders), `pointer-events: none` so it doesn't block world clicks; selection comes with combine/use-on.
- **Verified:** typecheck + lint + build green; dev server transforms the new modules; the gating logic (hasItem / not / giveItem) is Node-tested (M0). Pickup + render is visual — test in `pnpm dev`.
**Follow-ups (M1 inventory, part 2):**
- **Combine** (data-driven recipes) + **use item on object** (select in inventory → click world object): needs `selectedItem` in the store, `recipes` in `GameDoc`, `uses` rules on interactables, and an interactive inventory bar.

### 2026-06-13 — M1: interactables + scene transitions + persistence
**What:** First M1 chunk. Click an interactable → the character walks to it, then its `Effect`s run; an `exit`'s `goTo` swaps scenes. Added `systems/interactions.ts` (`effectsFor`, `pickInteractable`), `Character.setTarget(x, y, onArrive?)`, a store-aware `mountScene(app, scene, store)` + self-driving `createSceneHost(app, scenes, store)` (subscribes to `currentScene`, swaps deferred). New 2nd scene `scenes/room.ts` + a lit door on the street, connected by `exit` interactables. Overlay shows scene name + visited count. Moved `StoryStore` into `conditions.ts` to break an engine↔store cycle.
**Why:** Three original-backlog items at once — interaction (click → effect), scene transitions, persistence — all on the M0 condition/effect + store foundation.
**How:**
- **Walk-then-interact.** A click hit-tests `scene.interactables` (topmost, gated by `when`); if hit, the character walks to the clamped point and `onArrive` runs `effectsFor(it)` via the store. Off-road doors clamp to the nearest road point.
- **Deferred scene swap (key safety).** A `goTo` runs inside `character.update` (inside the ticker); the host swaps via `queueMicrotask`, so the old scene is destroyed *after* the frame, never mid-update. `onArrive` also fires after `syncView`.
- **Persistence is free** — the store is a singleton; the host only swaps scenes, never resets. Inventory/flags/visited survive transitions (visited count proves it).
- **Cycle break:** `StoryStore` now lives in `systems/conditions.ts`; the engine depends on a minimal `SceneStore` view, not `state/story`.
- **Verified:** typecheck + lint + build green; dev server transforms the new graph; goTo state logic is Node-tested (M0). The click → walk → swap is visual — test in `pnpm dev`.
**Follow-ups:**
- M1 continues: **inventory** (pickable items + combine recipes + use-on-object), then menu, audio, stealth (if core). A `key` gating the door (`when: hasItem`) is the natural inventory demo.
- Rapid double-transition isn't guarded (fine for clicks); brief blank frame during the async mount.

### 2026-06-13 — M0 (part 2): scene as data + store wired  ← M0 complete
**What:** The engine now consumes serializable `SceneData` instead of a code factory. `engine/scene.ts`: `mountScene(app, SceneData)` + a **builder registry** (`registerLayerBuilder`) so geometric `builtin` layers stay in the data, while image/SVG layers load via `Assets`. `scenes/street.ts` rebuilt as `SceneData` (painters registered by key) with the walkable as fractions. New `data/game.ts` (`gameDoc`); `data/schema.ts` refined (fractions everywhere, `builtin` params, `anchorYFrac`). Store wired: `state/story.ts` exposes a `storyStore` singleton, `ui/use-story.ts` React hook, `GameCanvas` mounts `gameDoc.scenes[currentScene]`, overlay shows the scene name from the store. Removed `scenes/index.ts`; folded `SceneConfig` into schema's `DepthConfig`.
**Why:** Make the scene fully data-driven (the editor's substrate) and prove the store flows both ways — engine reads `currentScene` to mount, React reads it for the overlay.
**How:**
- **Coordinate convention: fractions of screen (0..1)** in `SceneData` (positions, walkable, spawn, `anchorYFrac`), resolved to px at mount → resolution-independent documents.
- **Builtin builder registry** bridges geometric placeholders into the data model: a `builtin` layer is `{ builder: key, params }`; scenes register painters at module load. The escape hatch disappears as layers become `image` SVGs.
- **Vanilla store singleton** shared by engine (imperative `getState`) and React (`useStore` via `useStory`). Discrete state only.
- **Visual unchanged** — same geometry, now data-driven; overlay gains "Scene: Street".
- **Verified:** typecheck + lint + build green; dev server transforms the whole graph (`/src/main.tsx` 200). Build prints a benign >500 kB chunk advisory (Pixi).
**Follow-ups:**
- M1 next: scene transitions (exit interactables → `goTo`) + interaction (click → effect) + inventory (recipes, use-on) + menu + audio.
- Resize re-layout still deferred (scene built once from `app.screen`).

### 2026-06-13 — M0 (part 1): data schema + condition/effect + story store
**What:** Started the roadmap's M0 (data-driven foundation). Added `agent_docs/roadmap.md` (the milestone plan) and `workflow.md` step 6 ("point to the next step"). New code: `src/data/schema.ts` (serializable `GameDoc` — scenes, layers, interactables, items, flags + the `Condition`/`Effect` vocabulary), `src/systems/conditions.ts` (`StoryState` + pure `checkCondition`/`applyEffect`/`applyEffects`), `src/state/story.ts` (vanilla Zustand store wrapping them).
**Why:** The schema is the project's public API — the engine, the editor, and the future npm package all sit on it. Schema-first means M1 gameplay and the M2+ editor slot on with no refactor.
**How:**
- **Additive only** — no working code touched, so the street game still runs. `schema.ts` is a leaf (no internal imports). Note: `SceneBand` is for now defined in **both** `schema.ts` and `engine/scene.ts` — a deliberate temporary dup, deduped when the engine consumes `SceneData` (next M0 step).
- **One logic vocabulary.** `Condition` (hasItem/flag/visited/all/any/not) + `Effect` (setFlag/giveItem/takeItem/goTo/startDialog) are serializable data; the evaluator is pure + immutable. All gating (exits, interactions, dialog, NPCs, recipes) will route through it.
- **Vanilla Zustand store** (`createStoryStore(doc)`) so engine/Pixi can read/write outside React (getState/subscribe); React binds via a `useStory` hook in M1. Holds only discrete state.
- **Verified:** typecheck + lint + build green; Node test of `conditions.ts` — 15 checks (conditions + effects + immutability) all pass. Store covered by typecheck (Node can't resolve the extensionless internal imports the bundler handles, so it's not in the Node test).
**Follow-ups (rest of M0):**
- Port the street scene to `SceneData` + a builder registry for `builtin` (geometric) layers; make `mountScene` consume `SceneData`; dedupe `SceneBand`.
- Add a React `useStory` hook and provide the store to the app.

### 2026-06-13 — Walkable area, layered scenes + swap, street polish
**What:** Three things on the street. (1) **Walkable area** — new `src/systems/walkable.ts` (`WalkArea` polygon, `containsPoint`, `clampToArea`); `Character` takes an optional area and clamps both the click target and every step, so the cube only travels on the road. (2) **Scene system v2** — `engine/scene.ts` mounts a `SceneDefinition` of stacked `SceneLayer[]` (band + display + optional anchorY); added `createSceneHost(app)` (swap scenes), `imageLayer(url, band)` (load an SVG/image as a Sprite layer — the art path), async `mountScene`/`SceneFactory`; new `scenes/index.ts` registry. `street.ts` rebuilt as layers (sky / land / buildings / road + lamppost/bush). `GameCanvas` mounts via the host. (3) **Polish** — horizon raised to the top third; sky is now clear night-blue bands (was a near-black "void").
**Why:** Requested: keep the player on the road, fix the dead black sky band, and prepare easy scene swap/creation toward SVG-composed scenes (parts layering).
**How:**
- **Walkable = polygon clamp.** The road is a concave ⊥ (horizontal street + receding branch). `clampToArea` returns the point if inside, else the nearest boundary point — off-road clicks walk to the road edge, and per-frame clamping slides the cube along edges around the corner. No A* yet (proper nav for the concave corner) — flagged. Verified the geometry in Node: inside/outside checks pass, house-click → road edge, sky-click → branch top.
- **Layers model "parts stacking."** Each background part (sky, land, buildings, road) is its own Graphics layer drawn in array order; mid layers Y-sort + depth-scale by `anchorY`; foreground always on top. Maps 1:1 to future SVGs — `imageLayer()` loads a URL into a Sprite layer; `SceneFactory` is async so a scene can `await Assets.load(...)`. Swapping is `host.show(scenes.x)`.
- **Sky/horizon.** `HORIZON_FRAC` 0.46 → 0.33; sky split into 3 clearly-blue bands. Kept flat fills (not `FillGradient`): still can't see the canvas from here, and a flat fill can't fail as a runtime error.
- **Verified:** format + typecheck + lint + build green; Node test of the walkable polygon; dev server transforms the new modules (200). The render is eyeballed in `pnpm dev`.
**Follow-ups:**
- **Resize** still unhandled — the scene (layout, walkable polygon, depth, hitArea) is built once from `app.screen`. One resize pass should rebuild it all.
- **Walkable nav** is clamp-and-slide; a walk-mesh + A* would give clean paths around the L corner (architecture's intended approach).
- **SVG art:** `imageLayer` is ready — wire real SVGs when the pipeline produces them; consider a manifest/bundle preload.

### 2026-06-13 — Data-driven scenes + geometric street scene
**What:** Generalised the engine into a scene-manifest mounter and added the first real scene. `engine/scene.ts`: `createScene` → `mountScene(app, SceneFactory)` consuming a `SceneDefinition` (depth, start, `paintBackground`, mid/foreground props); mid props are Y-sorted + depth-scaled by their `anchorY`. New `src/scenes/street.ts`: a geometric city street (sky + hills, a house row with a central gap, a lower-third road branching into an L that recedes to the horizon, mid-layer lampposts, foreground bushes). `data/scene-config.ts`: dropped `demoScene` (scenes own their depth values now). `GameCanvas` mounts `streetScene`; overlay hint updated.
**Why:** The "design a simple street scene" task — and the natural moment to realise the proposed data-driven scene manifest (populates the empty `src/scenes/`). The street exercises all three systems at once: layering, dynamic occlusion, depth scaling.
**How:**
- **Scene = factory `(screen) → SceneDefinition`.** Engine owns the generic "how" (3 layers, input, ticker, teardown, prop sort/scale); each scene owns the "what" (a background painter + a prop list). Adding a scene/prop is data, not engine edits.
- **Two occlusion kinds on show:** the cube hides behind **foreground bushes** (top layer) and Y-sorts in front of / behind the **lampposts** (mid layer, `zIndex = anchorY`). Mid props are also depth-scaled by `anchorY`, so they sit in the character's perspective.
- **Depth test = the L branch.** Walking up the receding side road (feet Y → `yFar` 0.5H) shrinks the cube to `scaleFar` 0.4; the horizontal road is the near (large) end.
- **All geometric, flat Röki palette.** Sky is flat bands, **not** `FillGradient` — deliberately: a gradient-API slip would be a runtime error invisible to typecheck/build, and the canvas can't be seen from here.
- **Verified:** format + typecheck + lint + build green; dev server transforms the new modules (HTTP 200). Visual correctness eyeballed in `pnpm dev`.
**Follow-ups:**
- Everything is laid out from `app.screen` at build time — **no resize re-layout** yet (backdrop, props, depth, hitArea). One resize pass should rebuild/rescale the scene together.
- Still free movement — **walkable-area clamping** (keep the cube on the road/L) is the obvious next step now that there's a road to stay on.
- Props are built inline in `street.ts`; if scenes multiply, consider a small shape/prop schema or shared prop helpers.

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
