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

### 2026-06-13 — Editor guide + "document editor features" rule
**What:** New `agent_docs/editor_guide.md` — a usage guide for the visual editor: every panel / control (Scenes, Walkable, Layers, Interactables, Playtest, Document), the edit → test → publish loop, and reference tables (fit modes, Conditions, Effects). Added a standing rule to `workflow.md` (step 3, Execute), `AGENTS.md` (progressive-disclosure list), and `conventions.md` ("Done means"): any change under `src/editor/` must update the guide in the same task.
**Why:** The editor has grown (scenes · walkable · layers · interactables · logic forms) and was undocumented; it's the eventual OSS product surface, so its usage docs can't lag behind the code. The user asked for the guide + a process rule to keep it current.
**How:** Docs only, no code. The guide lives in `agent_docs/` (the project's doc home), written for the game author (it seeds the OSS user docs later) and listed in `AGENTS.md` so the agent reads it when touching `src/editor/`. Markdown is `.prettierignore`d, so no formatting churn.
**Follow-ups:** keep it current per the new rule. **M4 step 2b** (item catalogue + recipe table) next — it'll add an "Items & recipes" section to the guide.

### 2026-06-13 — M4 step 2a: Condition / Effect / uses forms
**What:** The editor authors per-interactable logic. New `editor/EffectList.tsx` (controlled `Effect[]` editor + shared `ItemSelect` / `SceneSelect`), `editor/ConditionEditor.tsx` (recursive `Condition` editor — hasItem / flag / visited leaves + all / any / not combinators), `editor/UsesList.tsx` (item → effects rules, reusing `EffectList`). `InteractableForm` gains `when` (gate), `effects`, and — for interact / exit — `uses`. `editor-store` gains `setInteractableWhen` / `setInteractableEffects` / `setInteractableUses`.
**Why:** M4's logic step — the full condition/effect vocabulary that powers all gating is now authorable, so an `interact` does things, exits/objects gate on conditions, and "use item on object" puzzles (crank → panel → gem) are buildable in the editor.
**How:**
- **Controlled components** (`value` + `onChange`) so `EffectList` is reused in interactable effects AND in each use rule's effects; the parent persists via the store. No `revision` bump (interactables are DOM-only).
- **Recursive `ConditionEditor`:** all/any render nested editors (+ add / delete each), not renders one. An `allowEmpty` prop lets the top-level gate be "(always)" while nested children must be real conditions. Union edits use `{ ...node, … }` spreads to keep the narrowed `kind`.
- **Panel widened 260 → 320px** + flex-wrap rows so the forms fit the column.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, all four modules). Authoring + in-game behaviour is the user's browser check.
**Follow-ups:** **M4 step 2b** — item catalogue (add/edit items) + recipe table; then **examine** (step 3). Note: pickable `effects` are the optional *extra* effects (giveItem + picked-flag stay implicit); `startDialog` is a marker until M7.

### 2026-06-13 — M4 step 1: place interactables + draw hit-areas
**What:** The editor can place interactables and draw their hit-areas. New `editor/HitAreaOverlay.tsx` (SVG/DOM overlay drawing every interactable's hit-area, colour-coded by kind, the selected one highlighted + labelled by id + vertices; draw mode = click to add points) and `editor/InteractableForm.tsx` (edit the selected one's id + essential field — pickable→item, exit→target scene — and draw/clear its hit-area). Editor gains an **Interactables** panel (+ Pick / + Use / + Exit, a list to select / delete). `editor-store` gains `addInteractable` / `removeInteractable` / `setHitArea` / `setInteractableId` / `setInteractableItem` / `setInteractableTo`.
**Why:** M4 step 1 — author the clickable objects (the jam slice's were hand-coded). Pickable + exit are end-to-end testable now; `interact`'s effects come in step 2.
**How:**
- **Interactables are invisible** (just hit-areas for `pickInteractable`), so they live in the DOM overlay, not Pixi — their store actions **don't bump `revision`** (no preview re-mount), like `setWalkable`.
- **Reused the walkable pattern:** SVG 0–1 viewBox + a click-catcher in draw mode → fractions. Walkable + hit-area overlays stack over the preview; **only one draw mode is active at a time** (mutually exclusive toggles), and both stay pointer-events-none when idle so the Pixi layer-drag underneath still works.
- **Defaults are valid:** a centred box hit-area + a unique id (`<kind>`, `<kind>-2`…); pickable defaults to the first item, exit to another scene — so a freshly placed object isn't broken.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, both new modules). Placing / drawing / in-game behaviour are the user's browser check.
**Follow-ups:** click a hit-area in the preview to select it; drag existing vertices; **M4 step 2** — Condition / Effect / `uses` forms + item catalogue + recipe table; then examine.

### 2026-06-13 — Fix: layer-drag grab offset (no jump on re-grab)
**What:** Dragging an image layer no longer snaps its centre to the cursor on grab. `makeLayerDraggable` records the pointer→origin offset at `pointerdown` and moves with `position = pointer + offset`.
**Why:** User report — grabbing a taller `width` strip made it jump (its centre leapt to the click point), so it looked like the saved Y position was lost / reset to default. The position *was* persisted (`setLayerPos` writes `yFrac`, re-mount reads it); the jump was the whole symptom, and it's worse for tall strips because the grab point sits farther from the centre.
**How:** on `pointerdown`, `grabX/grabY = display.position − e.global`; on move, `clamp(e.global + grab)`. A re-grab resumes from the layer's current (saved) spot with zero jump. X stays locked for `width` strips.
**Verified:** format / typecheck / lint / build green; dev smoke 200; the grab-offset is in the transformed `scene.ts`. The drag feel is the user's browser check.

### 2026-06-13 — M3 step 3c: `width` fit for horizontal strips
**What:** New image `fit: 'width'` — full-bleed horizontally (keeps aspect), positioned vertically by `yFrac` and **draggable on Y only** in the preview. For composing a scene from stacked bands (sky / land / road) instead of one backdrop. `makeLayerDraggable` gained an axis lock; `LayerList` lists the new fit + an updated tip.
**Why:** The user wanted to stack horizontal strips and slide them vertically — `cover` fills the screen and `contain` is centred/locked.
**How:**
- **`width` = scale to viewport width**, anchor centre, X centred, Y = `yFrac`. Renders identically in game + preview (shared `fitImageSprite`).
- **Axis-locked drag:** `makeLayerDraggable(..., axis)` — `width` strips move only on Y (X stays full-bleed; cursor `ns-resize`); `none` props keep free 2D drag.
- **Forward-compatible with M6:** positioned strips are exactly the unit a camera/parallax builds on — in M6 `width` reads against world-width and each strip gets a `parallax` factor. Larger-than-viewport scenes were **deferred to M6 by decision** (it's a coordinate-system change — viewport-fractions → world-space); no speculative fields added now.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; axis-lock (`ns-resize`) + the `width` branch present in the transformed modules. The visual drag is the user's browser check.
**Follow-ups:** optional snapping / arrow-key nudge; a `height` counterpart for vertical strips if it's ever needed. → **M4**.

### 2026-06-13 — M3 step 3b: drag image layers to position them
**What:** Free-positioned (`fit: none`) image layers can be dragged in the editor preview to place them precisely. Engine `mountPreview` gains an optional `onLayerMove` callback + `makeLayerDraggable` (makes such sprites interactive and moves them live). `editor-store` gains `setLayerPos(id, index, xFrac, yFrac)` (no `revision` bump). `ScenePreview` wires the callback → store; `LayerList` shows a positioning tip.
**Why:** The user asked to place uploaded props precisely with the mouse — `fit: none` images were stuck centered with no positioning UI.
**How:**
- **Clean boundary:** the engine takes a callback, not the editor store — `ScenePreview` injects `setLayerPos`. `engine/` stays React/editor-free.
- **Smooth, no jump:** the drag moves only the Pixi sprite live; `setLayerPos` records the fractions WITHOUT bumping `revision`, so the preview doesn't re-mount during/after the drag (mirrors `setWalkable`). A later structural re-mount recreates the sprite at the stored position.
- **Only `fit: none` is draggable** (cover/stretch/contain are screen-locked by design). Passive layers (builtins, the character) don't block hit-testing, so an image is grabbable even under them. Sprite anchor is center, so xFrac/yFrac = the prop's centre; the drag clamps to the viewport.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; `makeLayerDraggable` present in the transformed `scene.ts`. The actual mouse-drag is the user's browser check.
**Follow-ups:** the same drag pattern serves **M4** (place interactables / draw hit-areas) and spawn-point placement; optional snapping / arrow-key nudge.

### 2026-06-13 — M3 step 3: upload image layers (M3 core complete)
**What:** The editor can upload images as scene layers. **Schema:** `image` LayerData gains `fit` (`stretch`/`cover`/`contain`/`none`). **Runtime:** `scene.ts` `fitImageSprite()` sizes/places an image sprite (cover fills the viewport keeping aspect; none = natural size, centered on `xFrac`/`yFrac`). **Editor:** new `editor/LayerList.tsx` + a **Layers** panel — upload an SVG/PNG (FileReader → data-URL stored in the doc) and, per layer, set band / fit / role, reorder (↑/↓), or delete. `editor-store` gains `addImageLayer` / `removeLayer` / `moveLayer` / `setLayerBand` / `setLayerFit` / `setLayerRole`.
**Why:** M3's last core piece — author scenes with real art, not just code painters. Completes the editor core (M3 done).
**How:**
- **schema → runtime → editor:** added `fit` to the schema, taught `buildLayer` to size the sprite, then exposed it. SVG/PNG load via `Assets.load(dataUrl)`; for `.svg` files the mime is forced to `image/svg+xml` so Pixi's SVG loader auto-detects it.
- **Builtin + image share the panel:** the list shows every layer (the demo's `builtin` painters too) — all can be rebanded / reordered / removed. Array order = paint order within a band; ↑/↓ swap neighbours.
- **Re-mount only when visual:** add/remove/move/band/fit bump `revision` (preview reloads; `Assets` caches data-URLs so it's cheap); `role` is metadata → no re-mount (mirrors `setWalkable`).
- **Uploads live in the document** as data-URLs, so they survive Export → `content/game.json`. (This is what will push the localStorage draft past its ceiling → the IndexedDB / async-load migration noted earlier.)
- **`content/` un-prettied:** added `content` to `.prettierignore` so the editor's exported `game.json` isn't reformatted on every `pnpm format` (prettier was collapsing it by ~81 lines); the editor owns that file's format, like `public/` and `*.md`.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, LayerList, scene). Whether an uploaded SVG visually renders is the user's browser check.
**Follow-ups:** image **props need positioning** (`fit:'none'` currently centers them — xFrac/yFrac drag handles, like the walkable overlay); per-layer `when` visibility + `anchorYFrac`; list thumbnails. → **M4** (interactables / items / recipes / exits).

### 2026-06-13 — content/ boundary: load a published game.json
**What:** New top-level **`content/`** (with a README) is the home for the game's data. `data/game.ts` now resolves the document in priority: **editor dev-draft (localStorage) → `content/game.json` → built-in demo** (street + room, in code). `content/game.json` loads via `import.meta.glob` (eager, optional) so the file is optional and bundles into the build when committed.
**Why:** The user asked where the editor's exported `game.json` should live so it actually drives the game — without a defined home + loader, Export was a dead-end download.
**How:**
- **Optional file via glob:** `import.meta.glob('../../content/*.json', { eager: true, import: 'default' })`, then pick the `game.json` entry; no file → empty map → demo. Avoids a static import of a maybe-absent file and keeps the demo as a permanent fallback (the engine always has content).
- **Demo stays in code, not duplicated as JSON:** deliberately did *not* hand-write `content/game.json` from the demo — that would be a parallel, drift-prone copy. The demo lives in `src/scenes/` (data + painters); `content/game.json` is for the author's *published* doc (their own Export, exact by construction).
- **Top-level `content/`** (sibling of `src/`, `public/`) for discoverability + matches the roadmap's `content` package boundary. `public/` would be wrong here (runtime-fetched static, not bundled content).
- Painters still register via the `src/scenes/*` imports regardless of which document wins.
- **Verified:** format/typecheck/lint/build green; dev smoke 200 (game, `?edit`); glob wiring confirmed — the transformed `game.ts` gains the content import only when `content/game.json` exists (temp file → +2 references → removed).
**Follow-ups:** a dev-server endpoint that writes `content/game.json` directly (Export without the manual move). Assets (SVGs / atlases / audio) join `content/` as the pipeline grows.

### 2026-06-13 — M3: editor → game test loop (localStorage doc draft)
**What:** Close the edit → play loop. New `data/doc-draft.ts` (load / save / clear / has a `GameDoc` in localStorage, DEV-only). `data/game.ts` splits into `bakedGameDoc` (the shipped const) + `gameDoc = loadDocDraft() ?? bakedGameDoc` — in dev, an editor draft overrides the baked doc. Editor gains a **Playtest** section: **▶ Test in game** (save the working doc as a draft, then open the game, dropping `?edit`) and **Discard** (clear + reload). The game shows a small **dev draft** badge while a draft is active.
**Why:** The user's question — after editing you couldn't leave the editor and try the changes in the real game. The editor mutated a clone, the game ran the const `gameDoc`, with no bridge between them.
**How:**
- **localStorage (sync), not IndexedDB:** the game's `gameDoc` resolves the draft synchronously when `data/game.ts` evaluates, so no async-boot refactor of the store/host. The save-game slot stays on IndexedDB — different concern (playthrough state vs the authoring document).
- **Builders still register:** `data/game.ts` keeps importing the scene modules (side-effect registers the `builtin` painters), so a draft reusing those builder keys renders.
- **DEV-only:** `loadDocDraft` / `hasDocDraft` gate on `import.meta.env.DEV`; prod ignores any localStorage and ships `bakedGameDoc`.
- **The loop:** `?edit` → Test → title → New game plays the draft; the editor's working clone also starts from `gameDoc` (= the draft), so reopening `?edit` continues editing it. Discard reverts both to baked.
- **Bug fixed this turn:** `App.tsx` referenced `hasDocDraft()` without importing it (an edit in the previous turn had silently failed on a text mismatch, right before the context compacted); added the import. Caught on re-read, then confirmed by typecheck.
- **Verified:** format + typecheck + lint + build green; dev smoke 200 for the game, `?edit`, and the new `doc-draft.ts` transform.
**Follow-ups:** localStorage's ~5 MB ceiling will bite once layers embed SVG data-URLs (M3 step 3) → move the draft to IndexedDB + an async document load then. "Publish to repo" is still Export-JSON-and-bake; a dev-server endpoint that writes `src/data` is the later convenience. **Next:** layer upload — the last M3 core piece.

### 2026-06-13 — M3 step 2b: walkable polygon drawing
**What:** Draw a scene's walkable area in the editor. New `editor/WalkableOverlay.tsx` — a DOM/SVG overlay over the preview that draws the walkable polygon (filled outline + vertex dots) and, in **Draw** mode, turns clicks into vertices. Editor gains a Walkable section (Draw toggle / Clear / point count); `editor-store` gets `setWalkable(id, polygon)` (no `revision` bump). `ScenePreview` now mounts once (re-mounts via React key only), so walkable edits don't tear the Pixi canvas down.
**Why:** Walkable was the most painful thing to author by hand — now you click it out on the live preview (and the existing street/room areas show up immediately).
**How:**
- **Overlay uses screen fractions directly:** SVG `viewBox="0 0 1 1"` stretched to the pane (`preserveAspectRatio: none`) + `vector-effect: non-scaling-stroke` for crisp lines; vertices are DOM dots positioned by `%`. Aligns with the Pixi scene (also positioned by fractions). Clicks → fractions via `getBoundingClientRect`.
- **No re-mount while drawing:** `setWalkable` updates the doc but doesn't bump `revision`; the preview keys on `selectedId-revision` and mounts once (effect `[]`), so each point updates only the React overlay, not the canvas. (Mount-once needed an `exhaustive-deps` disable — re-mount is intentional, via the key.)
- Clicks round to 3 decimals; switching scenes exits Draw mode.
- **Verified:** typecheck + lint + build green; dev server transforms the modules. Visual — `?edit`: Draw → click the preview → the road polygon appears; Export to see it in the JSON.
**Follow-ups (M3):** last piece — **layer upload** (SVG → place in band, reorder, set role); then persist the doc into the project (dev endpoint).

### 2026-06-13 — M3 step 2: editable doc + add/delete scenes + JSON save/load
**What:** Editor goes from read-only to editable. New `editor/editor-store.ts` (Zustand) holds a **mutable clone of `gameDoc`** + selection + a `revision` counter; actions select / add / delete scene + setDoc. The panel gains **+ Scene / Delete** and **Export / Import** (download/upload the doc as JSON). The live preview re-mounts on `selectedSceneId-revision`.
**Why:** M3 step 2 — the data-mutation layer + persistence that the visual tools (walkable, layers) build on.
**How:**
- **Working doc is a clone**, so editing never touches the const `gameDoc` (the running game). Add → a blank scene (default floor walkable + spawn, no layers); delete keeps ≥1 scene and fixes `start` / selection.
- **Save/load = JSON export/import** in-session (download a `game.json`; import validates `scenes` + `start`). Wiring an edited doc back into the build (or loading it at runtime) is a later integration.
- **Preview keys on `selectedId-revision`** so any structural change re-mounts it; walkable edits (step 2b) will use a separate overlay so they don't re-mount.
- **Verified:** typecheck + lint + build green; dev server transforms the editor modules. Visual — `?edit`: add/delete scenes, export → a JSON file, import it back.
**Follow-ups (M3):** **walkable polygon drawing** (SVG overlay over the preview — step 2b); then layer upload / order / role; later, persist the doc into the project (dev endpoint) so edits survive a reload without manual import.

### 2026-06-13 — M3 step 1: editor shell + scene panel + live preview
**What:** Started the editor. `?edit` (DEV-only) routes `main.tsx` to a new `<Editor>` (`src/editor/`) instead of the game: a left **scene panel** (lists scenes from `gameDoc`, click to select) + a **live preview** of the selected scene. New `engine/mountPreview(app, scene)` renders a scene's layers (reusing the layer builder) + a static character at spawn, no gameplay input. `createPixiApp` now takes a `resizeTo` target so the preview canvas sizes to its pane.
**Why:** M3's first chunk — the editor shell + read-only live preview, the surface every later editing tool hangs off.
**How:**
- **Dev-only routing:** `isEditMode()` = `import.meta.env.DEV && ?edit`; `main.tsx` renders `<Editor>` or `<App>`. Editor lives in `src/editor/` (the dev-only boundary). Excluding it from the prod bundle is a packaging task; for now it's bundled but never rendered in prod.
- **Preview = visuals only:** `mountPreview` reuses the engine's `buildLayer` + band/zIndex/depth logic but skips input/ticker/interactables; conditional layers evaluate against an empty initial state. Small band/layer duplication with `mountScene` (left untouched; extract later).
- **Per-scene preview:** `ScenePreview` mounts a Pixi app sized to its container, re-mounts on scene change (StrictMode-safe, like GameCanvas).
- **Verified:** typecheck + lint + build green; dev server transforms the editor modules. Visual — open `…/?edit`.
**Follow-ups (rest of M3):** scene add/delete; an editor store (mutate the `GameDoc`); upload SVG layers + reorder + role; draw the walkable polygon on the preview; save the doc (JSON / dev endpoint).

### 2026-06-13 — Roadmap: scheduled the extra features
**What:** Promoted the candidate backlog into proper milestones at sensible spots: **M6 Movement & camera** (pathfinding A\*/walk-mesh · camera / scrolling scenes · scene-transition fades) and **M8 Cutscenes / scripted sequences**; folded **examine** + optional **verb/cursor** into M4, and **settings (volume)** + **i18n** into M11 (UI theming). Final layout is M0–M13; cross-references fixed.
**Why:** User asked to schedule all the recommendations + nice-to-haves, not leave them in a backlog.
**How:** No code — roadmap only. Movement & camera (M6) sits next to Characters (M5); cutscenes (M8) follow NPCs/dialogue (M7) since they orchestrate characters + lines + effects.
**Follow-ups:** Start the editor (M3).

### 2026-06-13 — Roadmap: characters & animation + candidate backlog
**What:** Added **M5 — Characters & animation** (view descriptor `state → animation`, AnimatedSprite swap of the placeholder cube, 8-dir walk, one-shot triggers pickup/interact/talk with `onComplete`; editor uploads frames + maps states/triggers). Renumbered NPCs → M6 (an NPC = a character + idle anim + the same set), audio → M7, atmosphere → M8, UI theming → M9, story graph → M10, packaging → M11; fixed cross-references. Added a **Candidate additions** backlog: pathfinding (A\*/walk-mesh), camera/scrolling scenes, scene transitions (fade), cutscenes/sequences, settings (volume), i18n, verb/cursor system, examine items.
**Why:** Capture the player + NPC animation/authoring the user flagged, plus likely-forgotten engine features, before starting the editor (M3).
**How:** Characters & animation realise the view-descriptor model already specced in `asset_pipeline.md`; the view/logic split (placeholder cube behind a swappable view) means the swap is a data change, not a refactor. Triggers stay data-driven (the picked item/object names the one-shot). No code changed.
**Follow-ups:** Editor is next (M3).

### 2026-06-13 — M2b: title screen + exit-to-title  ← M2 complete
**What:** The app now has two phases — **title** and **playing**. New `ui/TitleScreen.tsx` (New game / Continue; DOM for now). `App.tsx` holds the phase: New game resets the store + enters, Continue loads the save + enters; the Pixi world (GameCanvas) only mounts while playing. The in-game `Menu` drops New game/Continue and gains **Exit to title** with a confirmation (unsaved progress is lost).
**Why:** The flow requested — in-game you Save or Exit; on the title you start New game or Continue a save. Completes M2.
**How:**
- **Phase = React state in App.** The title branch returns `<TitleScreen>`; the playing branch renders the game + overlay. Hooks stay unconditional (the early return is after them). The store is set (reset/load) *before* entering, so the scene host mounts the right scene.
- **Exit tears the world down** (GameCanvas unmounts → Pixi app destroyed) and leaves the in-progress state in the store until New game (reset) or Continue (load) overwrites it — so unsaved progress is genuinely discarded, as warned.
- **Exit confirmation** is a two-step menu panel; ESC / Resume / backdrop all drop it in handlers, not an effect (lint: `react-hooks/set-state-in-effect`).
- The rich SVG-composed title is deferred to the editor (M8); this is a clean DOM placeholder.
- **Fix:** `saveGame` now persists only the plain `StoryState` fields. `storyStore.getState()` also carries the store's action functions, which IndexedDB's structured clone rejected — so Save silently failed (and Continue stayed disabled). Confirmed with a `structuredClone` check.
- **Verified:** typecheck + lint + build green; dev server transforms the modules.
**Follow-ups:** M2 done → **M3 (the editor)**. Same-scene re-mount-on-reset/load still pending; title visual composer is M8.

### 2026-06-13 — M2: ESC menu + save/load (IndexedDB)
**What:** Menu opens/closes with **ESC**. One-slot **save/load**: `src/state/storage.ts` (hand-rolled IndexedDB wrapper — `saveGame` / `loadGame` / `hasSave`), a `load(state)` store action, and Save / Continue buttons in the menu (Continue disabled when no save; "Saved ✓" feedback).
**Why:** M2's first chunk — runtime polish + persistence, before the title screen and the editor.
**How:**
- **Save = the serialisable story state** (currentScene, flags, inventory, visited) put under one IndexedDB slot, versioned (old saves ignored). The per-frame world (cube position) isn't saved — re-mounting the scene on load reconstructs it. `load` clears `selectedItem`.
- **Load drives the store**, and the existing subscriptions follow: the host swaps to the saved scene (if it differs), the visibility subscription refreshes pickables to match flags, the inventory bar reflects the loaded items.
- **No new deps** — hand-rolled IDB (~50 lines) instead of a library, for one slot.
- **Verified:** typecheck + lint + build green; dev server transforms the modules. Save → Continue is a browser/IDB flow — test in `pnpm dev`.
**Follow-ups:** M2b — title / start screen (app phase title→playing; a visual title scene + Play / Continue). Re-mount-on-reset/load would make a same-scene restart re-spawn the cube (currently it doesn't).

### 2026-06-13 — Roadmap expanded (post-M1 feature planning)
**What:** Reworked `agent_docs/roadmap.md` to fold in 9 requested feature areas. New layout: M2 runtime polish & framing (ESC menu, save/load via IndexedDB, title/start screen), M3 editor core, M4 editor interactables/items/recipes, M5 NPCs + dialogue (typewriter) + stealth (NPC vision) + voice gibberish, M6 audio authoring (conditional per-entity sounds incl. footsteps), M7 atmosphere & lighting (stylised), M8 UI theming, M9 story graph, M10 packaging.
**Why:** Map the path from the jam slice to the full reusable engine + editor before building the editor.
**How:** Every feature stays schema-first → runtime → editor. Honest scoping on the two ambitious asks: lighting = stylised chiaroscuro (Pixi blend modes / shaders, not normal maps); fog/clouds = animated-noise fake (not raymarched volumetrics) — both fit flat vector and run fine in-browser. Old M1 "stealth detection" folded into M5 (NPC vision). No code changed.
**Follow-ups:** Next is M2 (runtime polish) or jump straight to the editor (M3).

### 2026-06-13 — M1: menu + audio  ← M1 / jam slice complete
**What:** Finished M1. A React menu (`ui/Menu.tsx`): a corner button → panel with Resume / New Game (`store.reset`) / Mute. Audio (`src/audio/`): Howler playing placeholder sounds generated in code as WAV data URIs (`sounds.ts`) — a soft drone ambient loop + pickup/transition SFX — wired to the store (`audio.ts`): a blip when inventory grows, a chime on scene change; mute toggles `Howler.mute`. App renders the menu; styles added.
**Why:** Close out M1 (UI + audio) — the 2-scene slice is now a self-contained, playable jam build.
**How:**
- **No audio assets yet, so synthesise them:** `sounds.ts` builds short 16-bit PCM WAVs (a seamless drone + faded blips), base64-encodes them as `data:` URIs, and Howler loads those. Real files swap into the same `Howl`s later. (~79 kB baked into the bundle → ~588 kB now; benign, externalise later.)
- **Audio = side-effect of state** (architecture): `audio.ts` subscribes to the story store at module load and plays SFX on inventory-grew / scene-changed; the drone starts on the first `pointerdown` (browser autoplay policy).
- **New Game** = `store.reset(gameDoc)`: the host re-mounts when currentScene changes; within the same scene the visibility subscription refreshes (pickables reappear) and the inventory clears. Minor: resetting while already on the start scene doesn't re-spawn the cube — a re-mount-on-reset is the clean fix.
- **Verified:** typecheck + lint + build green; dev server transforms the new modules. Sound + menu are runtime — test in `pnpm dev` (click once to start the ambient).
**Follow-ups:**
- M1 done bar **optional stealth** ("only if core"). Footstep SFX deferred (per-frame, not state-driven). Audio data URIs → real files; re-mount-on-reset for a clean New Game.
- Next milestone: **M2 — the visual editor** (the bigger goal), or stealth if wanted.

### 2026-06-13 — M1: inventory complete (combine + use-on-object)
**What:** Finished the inventory verbs. `selectedItem` + `select`/`combine` actions in the store; an interactive inventory bar (click a slot to select, click another to combine via a recipe). Use-item-on-object: a selected item clicked on a world interactable runs its `uses` rule. Schema += `Recipe`/`recipes`, `UseRule`/`uses`. Pickables now gate on a derived `picked:<id>` flag (set on pickup), so a consumed item never reappears. Room demo: pick up gear + handle → combine → crank → use crank on the wall panel → gem.
**Why:** Complete "Inventory: add + combine + use-on-object" — the inventory puzzle loop.
**How:**
- **Picked-flag fixes last step's consume-reappear bug:** `effectsFor(pickable)` auto-sets `picked:<id>`; `pickInteractable` auto-gates pickables by it; the visual layer gates `not flag('picked:<id>')`. So combining (which consumes inputs) doesn't bring them back. (Node-tested: "stays gated after consume".)
- **Combine** = a store action over `gameDoc.recipes` (`findRecipe`, order-independent) → `takeItem a, takeItem b, giveItem output`. **Use-on** = engine onTap: a selected item + an interactable's matching `uses` rule → walk + run; any click consumes the selection (`select(null)`).
- **Inventory bar** is buttons now (`pointer-events: auto` on slots, container stays `none` so gaps pass clicks through); selected slot highlighted.
- **Renamed** `useEffectsFor` → `effectsForUse` — the `use*` name tripped `react-hooks/rules-of-hooks` (false positive on a non-hook function).
- **Verified:** typecheck + lint + build green; Node test of recipes + combine + picked-flag (10 checks); dev server transforms the new modules. The clicky bits are visual — test in `pnpm dev`.
**Follow-ups:** M1 remaining — simple **menu** + **audio** (Howler), then optional stealth. The real dialog runtime is M4 (`startDialog` is still an inert marker).

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
