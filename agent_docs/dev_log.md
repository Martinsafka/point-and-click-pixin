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

### 2026-06-25 — M13d: `pixin` npm package — commit 1 (build scaffolding)
**What:** Started packaging on branch `feat/npm-package` (**single-package** layout, chosen with the user
over a pnpm monorepo). Commit 1: `src/index.ts` public entry (GameDoc schema types + `createPixiApp`),
`vite.lib.config.ts` (ESM lib build via `vite-plugin-dts`, peer deps external), `package.json`
`name: "pixin"` + `exports`/`module`/`types`/`files` + `build:lib` script, `.gitignore` `dist-lib`.
**Why:** make `pixin` a buildable, publishable package. Fully additive — no app/runtime change.
**How:** `pnpm build:lib` → `dist-lib/index.js` (0.34 kB) + `index.d.ts` (exposes `GameDoc` + `createPixiApp`).
typecheck + the app build (`pnpm build`) stay green. **Plan (single package):** c1 scaffolding (done) →
c2 decouple the active doc from the bundled demo (`audio.ts`/stores via a settable holder) so the engine is
demo-free → c3 export the full engine + **`mountGame(doc, container)`** embedding API → c4 GameDoc JSON
Schema + validate → c5 versioning/migrations → c6 scaffolder + CI.
**Follow-ups:** `vite-plugin-dts include:['src']` emits the whole `src/` d.ts tree into `dist-lib` — prune to
the entry's graph (or `rollupTypes`) before publish. peerDependencies restructuring deferred to publish-prep.

### 2026-06-25 — IDE (WebStorm) commit-time warnings triage
**What:** Cleaned the only two **real** warnings — in `src/ui/theideaguards-logo.svg`: removed the unused
`xmlns:xlink` namespace and self-closed the empty-body `<path></path>` (→ `<path … />`). Verified the SVG
is still well-formed. The remaining warnings are **IDE false positives**, left as-is:
- `.github/workflows/deploy.yml` — "Unresolved action reference" / "Undefined parameter" for
  `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `actions/upload-pages-artifact@v3`,
  `actions/deploy-pages@v4` (+ their `with:` params). WebStorm can't resolve **external** GitHub Actions
  offline; the workflow is correct and runs on GitHub.
- `src/styles.css` (lines 36 / 406 / 474) — "font-family does not have generic default" on
  `font-family: var(--game-font)`. The generic fallback lives **inside** the variable
  (`--game-font: …, sans-serif`), which the inspection can't see. **Pre-existing**, not from this work.
**Why:** the user saw these in WebStorm's commit dialog and asked which are real.
**How:** SVG-only edits; the Actions and the var-based font stacks are correct, so nothing else changed.
**What:** New `dialogueStore.skip()` — fast-forwards the remaining click-to-continue lines, running each
node's effects, stopping at a live choice or the end. The dialogue **Skip ⏭** button (`DialogueBox`) now
calls `skip()` instead of `end()`. The cutscene runner (`scene.ts`) matches: its skip handler fast-forwards
an active dialogue (`skip()` not `end()`), and a `dialog` step reached while skipping now **begins → skips**
(effects run) instead of being dropped entirely.
**Why:** skipping a conversation — via the button or a cutscene skip — closed it without running the
effects of the lines you hadn't reached yet, so flags those lines set were silently lost (e.g. the
post-kiss cutscene dialog left the story state broken). The cutscene runner already ran standalone
`effects` *steps*; only **in-dialog** node effects were dropped.
**How:** `skip()` walks `present(node.next)` from the current node (whose effects already ran) — `present`
runs effects + follows branch / fall-through — until a node with a live (gated) choice (can't auto-pick) or
the end. Player dialogues stop at choices; scripted, linear cutscene dialogs run to completion. typecheck +
lint + prettier clean.
**Follow-ups:** a forced cutscene skip that hits a dialog **choice** leaves the box up for the player to
pick (the await resolves on their pick) — fine for linear cutscene dialogs; avoid choices in skippable
cutscene dialogs.

### 2026-06-25 — Landing page: Pixin Builder + full feature list + skills
**What:** Rebuilt `landing/index.html` (the Pages root that links to the demo at `./play/`): branded
**Pixin Builder**, a 12-card feature grid covering the whole editor (scenes/layers · interactions/items ·
characters/animation · NPCs/dialogue · cross-scene routines · stealth · cutscenes · audio ·
atmosphere/lighting · time/logic · screens/UI/saves · the live editor), and a highlighted **Claude Code
skills** banner (`pixin-gamedoc` / `pixin-editor` / `pixin-recipes`).
**Why:** the landing was a 3-bullet placeholder; the user wanted it to showcase every editor feature and
advertise the bundled AI authoring skills.
**How:** self-contained static HTML (inline CSS, dark theme), responsive auto-fill card grid; feature copy
pulled from the roadmap. Verified via `build:pages` + a faithful static serve (Pixin Builder heading, demo
link, skills, 12 cards all present). prettier clean.

### 2026-06-25 — End-screen text shadow + V2 roadmap note
**What:** Subtle `text-shadow` on `.screen__text` (the **End** "Konec." / **Game-over** `TextScreen` text)
for legibility over the backdrop image. Roadmap **V2**: added "live screen editing in the editor — show
+ edit all screens like a scene".
**Why:** the end-screen text sits on a background image and needed separation from it; screens are
forms-only in the editor today, so a live/WYSIWYG screen editor is a noted V2 nice-to-have.
**How:** one CSS rule (`0 2px 6px rgba(0, 0, 0, 0.6)`) on the class shared by the end + game-over screens;
a V2 bullet under "UI theming". prettier clean.

### 2026-06-25 — Creator logo on the final screen
**What:** Replaced the hardcoded `made with ⬢ pixin` placeholder in `FinalScreen`
(`src/ui/GameScreens.tsx`) with the creator's brand mark — `src/ui/theideaguards-logo.svg`, imported as
a module so Vite hashes + base-prefixes it. Restyled `.final__logo` from text to an image
(`max-width: 50%` / `max-height: 40vh`).
**Why:** the post-credits screen is the non-editable, hardcoded author/brand slot (the `RELEASE:` TODO in
the code); swapped the engine placeholder for the The Idea Guards logo before ship.
**How:** SVG imported as a URL (typed via `vite/client`), so the build emits
`dist/play/assets/theideaguards-logo-<hash>.svg` referenced at the correct `/point-and-click-pixin/play/`
base — verified by build. typecheck / lint / prettier clean.
**Follow-ups:** final screen background is near-black (`#06070b`); if the logo art is dark it may need a
lighter backdrop or a logo with a light variant.

### 2026-06-25 — Asset externalization pipeline + GitHub Pages deploy
**What:**
1. **`scripts/build-assets.mjs`** (`pnpm assets`) — reads a raw editor export from **`export/`** (a
   gitignored staging folder), pulls every embedded `data:` blob out to
   `public/assets/baked/{img,audio}/<sha1>.<ext>` (images → downscaled WebP via **sharp**, audio
   passthrough), de-dupes by content hash, rewrites refs to relative paths, and writes the lean
   `content/game.json`. Added `sharp` devDep.
2. **`src/data/asset-url.ts`** (`assetUrl()`) — resolves a doc ref against `BASE_URL` (passes `data:`/
   `blob:`/`http` through). Wired into every load site: `scene.ts` layers ×2 + transition image,
   `sprite-view.ts` atlas, `audio.ts` 3 Howls, `Inventory.tsx` + `GameCursor.tsx` `<img>`. `formatFor`
   now also derives the Howler format from a file extension (not just a data-URI mime).
3. **`vite.config.ts`** — function form; `base` = `/point-and-click-pixin/play/` on build (dev stays
   `/`), `build.outDir` = `dist/play`.
4. **GitHub Pages** — `landing/index.html` (repo-site root, links `./play/`), `scripts/assemble-site.mjs`
   + `pnpm build:pages` (build game into `dist/play` → copy landing to `dist/` → `.nojekyll`), and
   `.github/workflows/deploy.yml` (Actions → `actions/deploy-pages`). Local preview via
   **`pnpm preview:site`** (`scripts/preview-site.mjs`): `vite preview` mis-serves the nested
   `outDir`+base (returns index.html for JS/asset requests → blank page — verified), so a tiny static
   server mounts `dist/` under the `/point-and-click-pixin/` prefix exactly like Pages. Build itself is
   correct (a faithful static server serves JS/webp/landing with the right content-types).

**Why:** the editor bakes uploaded art/audio as base64 into the doc, so `content/game.json` had grown
to **66 MB**. `import.meta.glob(eager)` inlines that into the JS bundle → brutal boot parse, VRAM and
Web-Audio decode cost (the "market"/busy-scene jank), and it's too big to commit. Externalizing gives a
**lean 75 KB** committable json + real asset files served normally. Plus: ship the demo on Pages (a
sub-path host, hence `base`/`BASE_URL`) behind a landing page; the editor is already dev-only (lazy import
in `main.tsx`, gated by `import.meta.env.DEV`), so it never reaches the player build.

**How:** recursive walk replaces any `data:` string; images `sharp().resize({height:1620,withoutEnlargement}).webp({quality:80})`, audio kept as-is; refs become `assets/baked/…` resolved at runtime via `assetUrl`. Script is configurable (`--in/--out/--assets/--base/--max-height/--quality`) and idempotent. **Validated non-destructively** on the current 66 MB working copy (scratchpad in/out, real `content/game.json` + `public/` untouched): **69.5 MB → 75 KB** json, 45 images + 6 audio, 6 dupes, 39 MB on disk. typecheck + lint + prettier clean. (Decision: no new "Final export" editor button — option A, the dev uses the existing Export then runs `pnpm assets`.)

**Follow-ups:**
- Dev runs it for real: editor **Export** → `export/game.json` (gitignored staging) → `pnpm assets` →
  commit the lean `content/game.json` + `public/assets/baked/`. Then enable Pages once (Settings → Pages
  → Source = "GitHub Actions").
- The 27 MB MP3 ("Song") is passthrough → still 27 MB on disk (under GitHub's 50 MB warn). Optional:
  ffmpeg bitrate downsample and/or `html5:true` streaming for big tracks (skips Web-Audio full decode).
- Image target tunable (1620px/WebP80 is a balance; `--max-height 1080` for more savings).
- npm package (engine+editor as a library, demo optional) deferred to its own phase.
- Separate perf win still open: `Assets.unload` on scene teardown so VRAM doesn't grow across scenes.

### 2026-06-24 — Frames→atlas in character editor, `setClock` effect, Claude player atlas
**What:** Three asks while finishing the demo.
1. **`+ Frames` in the character editor** (`CharacterEditor`, used by player **and** NPC) — stitch
   individual frame images into the character atlas (reuses `FramesUpload` / `pack-frames`), then map
   them in **Clips**.
2. **`setClock` effect** — `{ kind: 'setClock'; minutes }` (schema + `applyEffect` in
   `conditions.ts` sets `clockMinutes`; `EffectList` picker + a time input). For a "wait until …"
   dialogue choice. The story store already had `setClock`; this exposes it as an effect.
3. **Claude player atlas** (content) — stitched the PixelLab `Claude_the_tramp` export (5 base
   directions × idle rotation + 6-frame walk = 35 frames, 92×92, 7-wide, one direction per row;
   engine mirrors the W-side) into an atlas + 10 clips (`idle.{S,SE,E,NE,N}`, `walk.…`), anchor
   0.5 / 0.88 (computed from the idle feet). Merged into the dev's **exported draft** (`game(8).json`)
   → `~/Desktop/game_claude.json` to **Import** (the live editor runs an IndexedDB draft 3 days ahead
   of `content/game.json`, so editing the repo file would've lost work). Also added a **wait-time**
   dialog (Claude; choices morning 360 / afternoon 720 / evening 960 / "radši nečekat").
**How:** Stitching via a one-off Pillow script (no ImageMagick/canvas/sharp installed). `setClock`
jumps the clock; the day-cycle visuals follow. typecheck + lint clean.
**Follow-ups:** For the evening to **last** (3 beer runs), the dev wants a long/static clock — set
`dayLengthSec` low→0 (manual time) and drive it with the wait dialog (currently 35 s/day). The
wait dialog needs wiring to a trigger/interactable (`startDialog` → `wait-time`). `content/game.json`
left untouched (stale vs the draft — the dev re-exports to commit).

### 2026-06-24 — Fix: animated layer drag position wasn't saved
**What:** Dragging an **animated** layer in the preview moved it live but never persisted — on the
next mount it snapped back to its original spot.
**Why:** `setLayerPos` (editor-store) only wrote `xFrac/yFrac` for `l.kind === 'image'`; animated
layers are draggable (the engine arms the drag for both kinds) but the drop was a no-op for them.
**How:** Persist the position for `image` **and** `animated` layers. `fitImageSprite` already
positions both from `xFrac/yFrac` (none-fit free, width-fit Y), so no engine change needed. typecheck
+ lint clean; HMR clean.

### 2026-06-24 — Animated layer: `loop` toggle (one-shot playback)
**What:** `LayerData` (animated) gets `loop?: boolean` (default true). Off = the `AnimatedSprite`
plays **once** on mount and holds the last frame — for a one-shot (door opening, a flash). A **loop**
checkbox sits with the frame-grid controls on the animated layer row.
**How:** `scene.ts` `sprite.loop = layer.loop ?? true`; `setLayerAnim`'s patch type gained `loop`
(the impl already spreads the patch); checkbox via `setLayerAnim(..., { loop })` — re-mounts so the
sprite restarts with the new mode. typecheck + lint clean; HMR clean.
**Follow-ups:** A one-shot holds its last frame; hiding it afterwards is a separate concern (gate the
layer's `when`, or a future `onComplete` → setFlag hook).

### 2026-06-24 — Editor: stitch individual frames into an animated-layer atlas (`+ Frames`)
**What:** A developer can now upload **individual frame images** and the editor packs them into one
sprite-sheet (atlas) + computes the frame grid — no external sheet-maker needed. **+ Frames** (Layers
toolbar) creates an animated layer from the frames; **↻ Frames** on an animated row re-stitches in
place.
**Why:** Building an animated layer required a hand-made atlas (a grid of equal frames); the dev asked
for either an online tool or in-editor stitching. In-editor is nicer (no round-trip).
**How:** New `pack-frames.ts` — browser `canvas`: sort files by name (numeric-aware), cell = max
frame w/h (smaller frames centred), near-square grid (`cols = ceil(sqrt(n))`) drawn left→right /
top→bottom exactly how the engine slices, `imageSmoothingEnabled=false` for crisp pixels, `toDataURL`
PNG stored inline. `FramesUpload` (multi-file picker → `packFrames` → callback). Store: `setLayerAtlas`
(replace atlas+grid) + `addAnimatedLayer(id, src, grid?)` now takes an optional grid. typecheck + lint
clean; HMR clean.
**Follow-ups:** Frames assumed equal-ish size (centred if not); no per-frame trim / tight-packing. fps
stays at its default / current value — tune on the row.

### 2026-06-24 — Spawn points: per-source `from` for transition spawns
**What:** A `transition` spawn point can now bind to a **source scene** (`SpawnPoint.from?: SceneId`),
so one scene spawns the player at **different ends per entry** (street: left when arriving from the
tavern, right from the tower). A **from scene** picker (with **(any)** fallback) shows on player/all
transition points in `SceneSpawns`; the row shows `· from <name>`.
**Why:** A `transition` spawn previously applied to *every* arrival, so a scene with two doors couldn't
place the player correctly per door.
**How:** `createSceneHost.show` passes `fromScene` (the scene being left, `shownId` before reassign;
undefined at game start) into `mountScene`. Player-spawn resolution prefers a point whose `from` ===
`fromScene`, else a `from`-less point, then `scene.spawn` (`player` target beats `all`). Store
`setSpawnFrom`; `SceneSpawns` gained `sceneIds` (names via the store). The editor preview has no source
(fresh host), so it shows the `(any)` / default spot — per-source spawns are verified in ▶ Test in
game. typecheck + lint clean; HMR clean.
**Follow-ups:** Could let the editor preview simulate "arriving from X" to position visually; for now
the ◎ markers show where each lands.

### 2026-06-23 — Editor: per-layer `when` (visibility gate) — disappear-after-pickup
**What:** Each layer row in the **Layers** panel now has a **when** `ConditionEditor` (the same widget
interactables / NPCs use). `LayerData.when` was already engine-supported (reactive visibility,
`scene.ts`) but the editor exposed **no** control for it — so a prop that vanishes after pickup
(`when = not flag picked:<id>`) was only doable by hand-editing game.json. Now it's no-code.
**Why:** The dev hit exactly this (a cat / hook that should disappear when taken) and "couldn't find
it in the editor" — because it genuinely wasn't there; layers were the only gated element type
missing a `when` UI.
**How:** Store `setLayerWhen` — **no** `revision` bump (the doc carries the gate → export → in-game
mount registers it via `conditional.push`; the authoring preview keeps the prop visible). Re-mounting
would rebuild the Pixi world on every keystroke of the flag name, so the preview just doesn't live-hide
— matches "preview shows, Test-in-game hides". `LayerList` gained `items` + `sceneIds` props (for the
ConditionEditor) wired from `Editor`. CSS `.layer-row__when`. Docs: editor_guide (layer table + a
"Disappear after pickup" recipe). typecheck + lint clean; HMR clean.
**Follow-ups:** None — fills a long-standing gap. (Note: `editor_guide` previously implied layers were
`when`-gateable in the UI; now that's actually true.)

### 2026-06-23 — Authored walk-to points for hotspots + NPCs
**What:** An optional **walk-to point** (a fixed floor spot) on each interactable (4 click kinds) and
each NPC placement: when set, clicking the thing walks the player to that exact point and **faces the
object**, overriding the approach radius / gap. Solves props the player can't reach directly — a
poster **on a wall**, a barman **behind a bar** — where the radius/gap give a side approach or send
the player around the back.
**Why:** Radius/gap are always relative to where the player comes from, so a wall poster always got a
side approach and the bartender put the player behind the bar. The classic adventure fix is an
authored walk-to spot (confirmed the direction with the dev via screenshots).
**How:**
- **Schema:** `InteractableData.approachAt?` (4 kinds) + `NpcPlacement.approachAt?` (design fractions).
- **Engine** (`scene.ts`): `onTap` prefers `approachAt` over `approachPoint(click,radius)` and faces
  the click on arrival; the NPC tap prefers the placement's `approachAt` over the side gap and faces
  the NPC. The npc runtime list carries the px-resolved point.
- **Store:** `setInteractableApproachAt` / `setNpcPlacementApproachAt` (undefined clears).
- **Editor:** new `ApproachOverlay` (one blue marker + a click-catcher, reused for both), Draw modes
  `approach` / `npcwalkto`, **Place / Move / Clear** buttons in `InteractableForm` + `NpcList`, a
  hint line, and CSS. No re-mount (markers update live).
**Follow-ups:** Marker isn't draggable (re-Place to move) — a drag handle would be nicer. The point is
in scene fractions, so it tracks scene-width changes.

### 2026-06-23 — Per-element approach distance (NPC gap + hotspot radius)
**What:** How close the player walks to a thing is now per-element, not a global constant.
- **NPC** — `NpcDef.approachGap?` (default 90) replaces the global `TALK_GAP` at the talk/look walk
  (`scene.ts`). Edited as a number on each cast row (`NpcCast`, via `patchNpcDef`).
- **Hotspot** — `InteractableData.approachRadius?` (px, on the 4 click kinds; default 0) makes the
  player stop **short of the click point** along the player→click line. New `approachPoint` helper +
  `radiusOf` in `onTap` apply it to item-use / inspect / effects walks (a plain floor click is
  unaffected). Edited as an **approach** field in `InteractableForm`; store `setInteractableApproach`.
**Why:** Previously NPCs all used one hard-coded 90 px gap and objects had no standoff at all — the
player walked onto the exact click. The dev wanted to tune closeness per object / NPC.
**How:** Chosen semantics (confirmed with the dev): the hotspot radius is measured **from the click**
(stop-short), so you keep control of *where* and *how close* — and radius 0 = today's behaviour
(backward-compatible; game.json unaffected). `approachPoint` returns the player's current spot if
they're already within the radius (no awkward back-step). typecheck + lint clean; HMR clean.
**Follow-ups:** Could add an editor gizmo to preview the radius; player doesn't explicitly face the
object when it stops short already inside the radius (movement-facing covers the normal case).

### 2026-06-23 — Scene pickers show names + spawn-point trigger (start vs transition)
**What:** Two editor requests.
1. **Scene pickers show the (renamable) name** — exit **to** (`InteractableForm`) and the shared
   `SceneSelect` (goTo / moveNpc, `EffectList`) rendered the raw scene **id**; now they show
   `name (id)` (matching `NpcEditor`). So renaming a scene is reflected everywhere you pick one.
2. **Spawn-point trigger** — `SpawnPoint` gets `on?: 'start' | 'transition'`. A **player** / **all**
   point now has a **spawns on** selector: *scene transition* (default) or *game start*. Only one
   game-start point may exist in the whole game — `setSpawnTrigger` demotes any other `start` when
   you assign one.
**Why:** Default scene names are all "scene", so id-only pickers were hard to choose from; and the
dev needed to control the player's start position separately from arrival-via-transition.
**How (runtime):** `mountScene` gets `isGameStart?`; `createSceneHost` sets it true for the **first**
mount of a *playing* host (`firstMount = options.gameplayInput ?? true`, consumed in `show`), false
for every transition and for the whole editor preview (gameplayInput false). Player spawn resolves to
a point matching the entry context (`(p.on ?? 'transition') === wantOn`, specific `player` > `all`),
else `scene.spawn`. NPC spawn (`spawnAt`) is unchanged / trigger-agnostic. game.json has no spawn
points yet, so no migration. typecheck + lint clean; HMR clean.
**Follow-ups:** Game **restart** (retry) re-creates the host → first mount = game start again (correct).
The `SceneSelect` reads the name via `editorStore.getState()` at render (fine — the editor re-renders
on doc edits); could thread names as props if it's ever used outside the editor.

### 2026-06-23 — Editor: rename layers + rename / reorder scenes
**What:** Three small editor authoring controls:
- **Rename a layer** — `LayerData` gets an optional `name?` (all three kinds); the layer row's static
  label is now a text input (placeholder = the auto kind / builder label). Store: `setLayerName`.
- **Rename a scene** — a **name** field in the Scenes panel edits the selected scene's `name`
  (already in the schema). Store: `setSceneName`.
- **Reorder scenes** — **↑ / ↓** on each scene row, mirroring the layer reorder. Store: `moveScene`
  shuffles the `scenes` Record keys (`Object.fromEntries` over reordered `Object.keys`).
**Why:** The developer wanted to label layers/scenes meaningfully and control scene order in the list.
**How:** All three are **label / list-order only** → `patchScene(..., false)` / `mapLayers(..., false)`
/ plain `set` with **no `revision` bump**, so nothing re-mounts the Pixi preview (no flash, inputs keep
focus). Scene **id** is untouched (rename = display `name`), so exits / `goTo` / routines keep working;
reorder doesn't touch `start` or references. CSS: `.layer-row__name`, `.editor__scene-row`,
`.editor__scene-btns`. Docs: editor_guide (Scenes + layer-row table). typecheck + lint clean; HMR clean.

### 2026-06-23 — Sort line: decouple from size + editor-only yellow guide line
**What:** Refined the new mid-layer sort line (same-day follow-up to the entry below). Three changes:
1. **Decoupled size** — a mid layer's `anchorYFrac` now drives **only** the Y-sort zIndex, not the
   perspective depth scale. Dragging the sort line no longer resizes the prop; size is the **scale %**
   slider / fit alone. (`src/engine/scene.ts`: dropped `depthScaleAt(anchorY) * layerScaleFor` from
   both the mount path and `reapplyLayerScales`; removed the now-unused `depthScaleAt` import.)
2. **Editor-only yellow guide** — a bright line (`0xffd400`) at every mid layer's sort line, in
   `world` space (camera-transformed, above the bands, ungraded), drawn by `redrawSortGuides` and
   redrawn from `applyLive` so it tracks the slider live. Gated on `onLayerMove` (editor authoring
   view) → hidden in **▶ Test in game** (the real `GameCanvas` doesn't pass `onLayerMove`).
3. **Auto-seed** — moving a layer into the **mid** band seeds `anchorYFrac = 0.85` if unset
   (`setLayerBand`), so mid ⟺ has a sort line ⟺ slider + guide + occlusion are all consistent.
**Why:** The user expected the sort line to set *only* the walk-in-front/behind threshold and to be
*visible*. The depth-scale coupling (pre-existing for mid props) surprised them by resizing the prop,
and a numeric slider with no on-canvas feedback was hard to place.
**How:** `world` (not `graded`) hosts the guide so the colour grade doesn't tint it; one `Graphics`
cleared + restroked per redraw. Decoupling drops the perspective auto-size for mid props — fine per
the user (the street/room demo lamps don't matter). typecheck + lint clean; HMR clean.
**Follow-ups:** A drag-the-line handle on the yellow guide (instead of only the slider) would be the
next ergonomic win. `role` (scenery/occluder/floor) is still pure metadata.

### 2026-06-23 — Editor: per-layer "sort line %" slider (anchorYFrac) for mid props
**What:** A **sort line %** slider on every **mid**-band layer (`src/editor/LayerList.tsx`) that sets
`anchorYFrac` (0–100 % of scene height) — the prop's foot line that drives walk-in-front / walk-behind
Y-sort against characters. New store action `setLayerAnchorY` (`src/editor/editor-store.ts`); engine
`reapplyLayerScales` now re-seats the mid layer's **zIndex** (not just scale) on `applyLive`
(`src/engine/scene.ts`) so the line moves live with no re-mount. Docs: `editor_guide.md` (new "Sort
line" section + corrected the `role` row).
**Why:** The occlusion behaviour (character in front below the foot line, prop in front above it) was
only settable by hand-editing `anchorYFrac` in scene data — the no-code editor had **no** control for
it. Users (reasonably) reached for the `role: occluder` dropdown, which is **cosmetic and does
nothing**; the real mechanism is `band: mid` + `anchorYFrac`.
**How:** Mirrored the existing `scale %` slider exactly: `mapLayers(..., false)` (no revision bump →
`applyLive` path), live re-apply via the extended `reapplyLayerScales`. The slider shows for all mid
layer kinds incl. `builtin`; default display 85 % when unset (committing on drag activates occlusion +
the depth scale). typecheck + lint clean; HMR clean. Note: prettier `--check` flags these files, but
they're already flagged at HEAD (repo isn't kept prettier-clean) — left formatting untouched to avoid
churn.
**Follow-ups:** `role` (scenery/occluder/floor) is now pure metadata — could be removed, or wired to
something, later. A drag-the-line handle in the preview would beat a numeric slider for placing the
foot line visually.

### 2026-06-23 — Per-layer scale slider: step 5 → 1
**What:** The **scale %** slider on none-fit image/animated layers (`src/editor/LayerList.tsx`) now
steps by **1 %** instead of 5 %.
**Why:** 5 % increments were too coarse to size a prop precisely to the scene.
**How:** One-line change `step={5}` → `step={1}`; range (10–300 %) and the `v / 100` → `setLayerScale`
wiring are unchanged.

### 2026-06-21 — Colour grade: tint (colour cast) + slider UI for every param
**What:** Added a **tint** to `ColorGrade` — a colour **cast** (`tint` hex + `tintStrength` 0..1)
that a hue rotation can't paint onto near-grey pixels (e.g. a blue night over a stone statue). Also
reworked the grade UI: every param (brightness / contrast / saturation / hue / tint strength) is now
a **slider on its own line**, shared by the static grade **and** each day-cycle keyframe (keyframes
were a cramped inline number row before).
**How:**
- **Schema:** `ColorGrade.tint?: string` + `tintStrength?: number`.
- **Engine** (`colorgrade.ts`): `setColorGrade` applies it via `ColorMatrixFilter.tint` (multiply),
  the effective colour lerped white→tint by strength (0 = no-op); `gradeActive` counts a tint.
  `scene.ts` `applyTimeGrade` interpolates the tint (RGB lerp, `lerpHex`) + strength across keyframes.
- **Editor:** new shared **`GradeSliders`** component (the five sliders + a tint colour picker), used
  by the static colour grade and each `colorGradeByTime` keyframe (one slider per line, in a
  separated `.grade-kf` block).
- **Verified:** typecheck + lint clean; engine — a blue tint turns the warm night street fully blue
  (before / after); editor smoke — sliders + tint render, 0 console errors.
**Follow-ups:** none.

### 2026-06-21 — Fix: time-of-day grade must not touch the peak (timeFadeAt) backdrops
**What:** The global `colorGradeByTime` was a filter on the whole `world`, so it also re-tinted the
`timeFadeAt` crossfade backdrops — which are *already* lit per time (the grade's reference). That
double-graded them, so props could never blend correctly into them. Now **peak layers are exempt**:
the grade tints only everything else, to blend into the untouched backdrops.
**How (`scene.ts`):** split the camera-transformed world into two subtrees — `backdrop` (ungraded,
behind; holds every `timeFadeAt` layer) and `graded` (bands + shadows + world-space atmosphere +
fog) which carries the grade filter. Routed peak layers to `backdrop`; moved the bands, shadow
layer, `createAtmosphere`, `createFog` + the grade filter onto `graded`. The camera transforms the
whole world, so peak layers still scroll / crossfade; lighting / weather / vignette are stage
overlays, so they still cover the backdrop — peak layers skip **only** the colour grade.
**Verified:** typecheck + lint clean; favour-chain regression passes; street night (no peak layers)
still fully graded = no regression; daycycle with a saturation-0 grade keeps its backdrops fully
coloured while the character desaturates = peak exemption confirmed.
**Follow-ups:** none.

### 2026-06-21 — Editor: per-layer scale % for none-fit props
**What:** A **scale %** slider on each `none`-fit image / animated layer (10–300 %) — resize a prop
to fit the scene without re-uploading or re-exporting, independent of its source resolution. (The
user uploads props at fit `none`, where the native size needn't match the scene's viewport fit.)
**How:**
- **Schema:** `scale?: number` (multiplier, 1 = natural) on the image + animated `LayerData`,
  honoured only for `fit: none`.
- **Engine** (`scene.ts`): `fitImageSprite` applies it in the `none` branch; a `layerScaleFor` helper
  gates it to none-fit image/animated; the mid-band depth scale **composes** with it
  (`depthScaleAt × scale`). Re-applied live from `applyLive` (`reapplyLayerScales`) so the slider has
  no re-mount flash (mirrors `characterScale`).
- **Editor** (`LayerList` + `editor-store`): a `Slider` (scale %) per none-fit layer →
  `setLayerScale` (live, no re-mount).
- **Verified:** typecheck + lint clean; visual test — the street grate at `scale 2.0` renders ~2×
  (before / after screenshots).
**Follow-ups:** none.

### 2026-06-21 — Editor: swap any uploaded asset in place (shared AssetSwap)
**What:** Every uploaded asset in the editor (scene layers, sounds, item icons, cursors, the
transition art, screen backgrounds / logos / buttons, character atlases) now has a **⇄ Swap**
control that replaces its source file **in place** — keeping the asset's id + every reference to it.
Before, only single-slot assets could be replaced (an unlabelled "Change"); **scene layers and
sounds had no swap at all** — you had to delete + re-add, which for a sound *broke its id and every
reference* (ambient / footstep / playSound / voice / inspect).
**Why:** the user produces assets externally (UE5 renders, audio) and needs to drop in a new version
without rewiring the doc.
**How:**
- New shared **`AssetSwap`** component (`src/editor/AssetSwap.tsx`) — one file-picker button + the
  data-URL read with the SVG-mime fix; replaces ~6 duplicated `FileReader` handlers across panels.
  `label` switches `+ Image` / `+ Sound` (empty slot) vs `⇄ Swap` (replace existing).
- New store actions `setLayerSrc(scene, index, src)` + `setSoundSrc(id, src)` (in-place; keep id +
  references). The single-slot setters (icon / cursor / transition / screens / atlas) already
  replaced in place — just relabelled + routed through `AssetSwap` for consistency.
- Wired `AssetSwap` into LayerList (per-layer swap + the add buttons), SoundList (per-sound swap),
  ItemCatalogue, CursorEditor, TransitionEditor, ScreensEditor, CharacterEditor.
- **Verified:** typecheck + lint clean; editor smoke test (Playwright, `tools/editor-smoke.mjs`) —
  swap controls render in every panel (Scene / Items / Sounds / Project / Characters), 0 console
  errors.
**Follow-ups:** none.

### 2026-06-20 — M13d+: global time-of-day colour grade (whole-scene day/night)
**What:** Extended the day cycle to a **global grade** so the *whole* scene — backdrop, props **and
characters** — matches the time of day from **one neutral asset set** (the user's worry: the
4-render backdrop crossfade left props / NPCs in flat daylight). A scene can set **`colorGradeByTime`**
(grade keyframes by clock minute); the engine interpolates the grade (brightness / contrast /
saturation / hue, smoothstep, looping) and applies it as a **`world` filter** — which tints every
band, incl. the mid (characters). Replaced the demo's old foreground **dusk overlay** on the street +
tower with this grade, and gave the **`daycycle`** showcase both (layer crossfade + grade together).
**Why:** opacity-crossfading 4 variants of *every* asset (props, NPCs, animations) is impractical;
one global time-driven grade is the standard, cheap way to keep everything consistent.
**How:**
- **Schema:** `SceneData.colorGradeByTime?: { at, grade }[]`.
- **Engine** (`scene.ts` + `colorgrade.ts`): a persistent `ColorMatrixFilter` on `world`;
  `applyTimeGrade(now)` interpolates the bracketing keyframes (shared **`timeBracket`** helper with
  the layer crossfade) and updates the matrix via the new `setColorGrade(filter, grade)`. Driven from
  `refreshVisibility` (per clock-minute + World-scrub); added to the live `atmoHash` so editor edits
  re-apply with no remount.
- **Editor** (`SceneGrade` + `editor-store`): a **"day-cycle grade (time keyframes)"** section — add /
  remove keyframes, each an `<input type=time>` + brightness / contrast / saturation / hue inputs →
  `setSceneColorGradeByTime`.
- **Verified:** typecheck + lint clean; favour-chain regression passes; previewed the street at noon
  vs night — the **whole** scene (player + props + cat + houses) tints dark-blue at night.
**Follow-ups:** none. (The build tool's old `dusk_overlay` helper is now unused.)

### 2026-06-20 — M13d: time-of-day layer crossfade (clock-driven day cycle)
**What:** New engine + editor feature (user request — they render 4 lit variants of a scene in UE5
and want a gradual time blend). A background `image` / `animated` layer can set **`timeFadeAt`**
(minutes past midnight = its peak opacity). Layers with a peak **cross-dissolve** over the game
clock — fully opaque at the peak, blending (smoothstep) into the two nearest neighbours, looping
over midnight. So 4 lit renders at 06:00 / 12:00 / 18:00 / 00:00 glide morning→afternoon→evening→
night→morning. Added a showcase scene **`daycycle`** (4 full-scene colour layers) + the editor UI + docs.
**Why:** opacity vs blend mode → **opacity** is correct (alpha cross-dissolves; blend modes *combine*
pixels = double-bright, wrong for a transition). Explicit per-layer peak times (the user wanted
control over uneven phases — short morning, long afternoon).
**How:**
- **Schema** (`data/schema.ts`): `timeFadeAt?: number` on the image + animated `LayerData`.
- **Engine** (`engine/scene.ts`): collect the `timeFadeAt` layers; `applyTimeFade(now)` finds the two
  bracketing keyframes (sorted ring), sets base α 1 + fading-in α smoothstep(f), and z-orders the
  fading-in layer above the base so the **midnight wrap** composites with no gap
  (`background.sortableChildren` enabled when fade layers exist). Driven from `refreshVisibility`
  (the existing store subscription) → updates per clock-minute **and** on the editor's World-time
  scrub. A fade spans the whole inter-peak interval, so per-minute steps read smooth.
- **Editor** (`LayerList` + `editor-store`): a per-layer **"peak HH:MM"** input (uncontrolled;
  commits on a valid time, clears when blank) → `setLayerTimeFade`; reuses the M12c HH:MM widget.
- **Verified:** typecheck + lint clean; previewed `daycycle` at 3 times — distinct blended tints
  (blue morning → gold afternoon with both labels overlapping mid-dissolve → dark-blue night).
**Follow-ups:** none required. The crossfade is the **backdrop**; the cast isn't time-tinted —
combine with the scene's `ambientLight` if you want the characters lit too.

### 2026-06-18 — Fix: decorative scene layers were blocking pointer input
**What:** A full-screen **foreground** layer (the demo's dinner dusk overlay) intercepted clicks on
NPCs beneath it — the NPC's own `pointertap` never fired, so dialogues couldn't be triggered once the
overlay showed (user report: "once the screen goes orange in the evening, can't talk to the tower
guard / trigger things"). Fixed in `engine/scene.ts`: every scene layer's display is now
`eventMode: 'none'`, so clicks pass through to NPCs (mid band) + the stage (interactables / walk).
The editor's `makeLayerDraggable` still re-enables `'static'` on positionable (fit none / width)
layers, so layer dragging is unaffected.
**Why:** Decorative scenery should never capture input — only NPCs + the stage do. Affects **any**
scene with a foreground / weather / overlay layer, not just this demo.
**How / verified:** Reproduced headlessly (tower at dinner → guard click did nothing); after the fix
the guard dialogue opens with the overlay on. Interactables (the stage `onTap` polygon test) always
worked via event-bubbling — it was specifically **NPC sprite clicks** the overlay shadowed. Audio
was healthy throughout (Howler `running`, ambient loops, footsteps + voice play) — the "sounds
stopped" was the blocked interaction, not an audio fault. Favour-chain + keeper-dialogue regression
passes, 0 console errors.

### 2026-06-18 — Demo P11b: scene-object animations (fountain water + breathing princess)
**What:** `animate_object` (v3) animations wired as `animated` layers — the street **fountain water**
trickling, and the tower-room **sleeping princess breathing** (candle flickering too): the asleep
bedroom is now an animated full-scene layer (gated `when not princess-awake`). `fetch_obj.py`
composes the 7-frame object animations into single-row atlases; `build_demo.py` gained an
`anim_layer` helper.
**Verified**: both render clean frames (room preview + street shot), the chain passes, 0 console
errors. The world now moves at every layer — characters breathe / walk, particles + fog drift, the
fountain runs, the princess breathes.
**Follow-ups (optional, low value):** a flickering-fire sprite (redundant with the ember particles +
hearth flicker-light), flying birds, one-shot cutscene anims (kiss / eat / wake).

### 2026-06-18 — Demo P11: character animations (idle + walk)
**What:** Brought the cast to life (user-requested follow-up). Generated PixelLab **template
animations** — **breathing-idle** for every character (south + east) + a **walk** cycle for the two
movers (Claude + the onion-seller). `fetch_art.py` now downloads each character's export **zip** and
assembles a single-row **animated atlas** (idle.S / idle.E [+ walk.S / walk.E]; W mirrors E),
emitting `char/views.json` with multi-frame clips (idle 4f @5fps, walk 6f @10fps); `build_demo.py`
reads views.json to set the player + NPC `view`s. Every character now breathes; Claude + the
onion-seller walk.
**Why:** P11 — the deferred animation pass; the world should move.
**How:**
- The public `…/characters/<id>/download` zip exposes a clean `rotations/` +
  `animations/<name>/<dir>/frame_NNN.png` layout + `metadata.json` — simpler than per-animation
  frame URLs. A robust direction fallback (missing dir → south anim → static rotation) handled the
  quadruped cat's south-only idle.
- The engine's `AnimatedSprite` view already plays multi-frame `state.facing` clips (walk falls back
  to `idle.<dir>`), so this is **pure data — no engine change**.
- **Verified** (Playwright): characters render clean single frames (atlas slicing correct); the full
  chain + intro cutscene + NPC dialogue still pass, 0 console errors. Looping playback is core
  engine behaviour (the multi-frame clips are present) — the motion is visible in play.
**Follow-ups (optional):**
- One-shot cutscene anims (kiss / eat / wake); guard drink / sleep states (`create_character_state`);
  PixelLab `animate_object` scene anims (fountain water, a fire sprite, birds).

### 2026-06-18 — Demo P10: full art verified + polish + README (M13c done)
**What:** Eyeballed the last two scenes (tower + tower-room) via a start-override preview — both
render beautifully (the tower door aligns with the guard + the to-room exit; the bedroom shows the
sleeping princess on a canopy bed, moonlit window, chest, rug). Tweaked the princess hit-area to sit
over the bed. **Confirmed NPC dialogue works** with the real sprites (clicking the keeper opens his
rats-for-beer deal) — the last unverified interaction. Wrote `content/README.md` (pitch + how-to-play
+ spoiler walkthrough + credits) and ticked the roadmap phases. This is the M13c deliverable.
**Why:** P10 — verify A→Z, no soft-locks, ship.
**How:**
- Every interaction type is now verified in-browser (Playwright, 0 console errors): intro cutscene,
  NPC dialogue, pickable pickup, item-on-object `use`, exits / transitions, the favour chain; all
  four scenes render with the real art.
- Soft-lock trace clean: charm→fish→cat→rats→beer→guard→room→onion-kiss each has a path; the clock
  recurs (morning + dinner), so the onion + the guard are always reachable again.
- `tools/` (gitignored): `build_demo.py` (authors `content/game.json`), `fetch_art.py` /
  `fetch_obj.py` (PixelLab → `public/assets/`), `verify.mjs` / `preview.mjs` (Playwright checks).
**Follow-ups (optional polish):**
- Full A→Z **manual playtest** of the time-of-day loop (3-beer guard ladder at dinner + onion at
  morning + the onion-kiss ending) — verified piecewise + by logic, not in one automated run.
- Character / cutscene **animations** (walk, breathing-idle, kiss / eat / wake) + PixelLab
  `animate_object` scene anims (fire, fountain, birds).
- The 3-beer re-drink after the guard sobers up is a touch grindy — tune if desired.

### 2026-06-18 — Demo P9: framing (title / screens / font)
**What:** A proper **title screen** — a composited dusk image (the PixelLab tower on a night→warm
gradient) behind the gold serif **"Magický polibek"** heading + tagline + **Czech buttons** (Nová
hra / Pokračovat). Screen backgrounds: loading = the tavern, end = the awake-princess bedroom. Set a
storybook **serif font** (Georgia stack — full Czech diacritics, zero setup). Credits keep the
"sabe directs everything" gag (Claude in the lead role). The scene-transition wash is already in place.
**Why:** P9 — the framing so the demo presents as a finished title.
**How:**
- The title tower came back with its sky removed (object bg-removal), so `fetch_obj.py` composites it
  onto a dusk gradient → `bg/title.png` (Pillow).
- **Verified**: the title renders (tower + gold heading + Czech buttons); the chain regression passes.
**Follow-ups:**
- Credits / end screens are reached only via `endGame` — eyeball in the P10 playthrough.
- Cutscene one-shot anims (kiss / eat / wake) still deferred with the character animations.

### 2026-06-18 — Demo P8: real PixelLab art (characters, backgrounds, items, props)
**What:** Generated + wired the full art pass via the PixelLab MCP. **7 characters** (Claude +
keeper / vendor / onion / guard / drunk + a quadruped cat) → composed [south, east] atlases →
ViewDescriptors (idle.S / idle.E, W mirrors E) on the player + NPCs. **Backgrounds** for every scene
(tavern; tower; tower-room with an asleep↔awake bg swap on `princess-awake`; the wide street composed
in Pillow from a mirror-alternated house row + sky gradient + ground strip). **6 item icons**
(hook / charm / fish / beer / onion + the cat from its sprite). **Props** placed as layers (tavern:
poster / cellar / fork-on-bar; street: stall / fountain / grate / alley-cat). Re-anchored the tavern
interactables to the painted bar-left layout.
**Why:** P8 — swap greybox for real art (the showcase). PixelLab proved strong at both characters
**and** backgrounds; cohesion held from style words alone (no style-reference needed).
**How:**
- Gitignored tools: `fetch_art.py` (char rotations → atlases + feet-anchor detection), `fetch_obj.py`
  (objects → trimmed icons / full bgs + the Pillow street compose + cat icon & prop). Assets land in
  `public/assets/` (committed) + are referenced by URL from `game.json`.
- Characters are **static directional stills** (idle.S front / idle.E profile, W mirrored) at
  `characterScale` 3.0 — walk / one-shot **animations are a deferred follow-up**.
- Backgrounds use `fit:'stretch'` (square PixelLab art → 16:9 scene; keeps the floor + composition;
  `cover` would crop the floor). The wide street is parallax bands (sky 0.4 / houses 0.85 / ground 1).
- **Verified** (Playwright): the full pickup → use → street chain + the intro cutscene pass with the
  real art, 0 console errors; tavern + street eyeballed (cohesive, grounded, atmospheric).
**Follow-ups:**
- Eyeball + re-anchor **tower / tower-room** in the P10 playthrough (bg swaps wired, not yet seen).
- Character **animations** + PixelLab `animate_object` scene anims (fire / fountain / birds) — polish.
- The street mid-band is a touch sparse; could add dressing.

### 2026-06-18 — Demo P7: atmosphere, dynamism & ambient life
**What:** Added per-scene mood + motion (engine-driven, art-agnostic). **Tavern**: warm dim
`ambientLight` + a flickering **hearth light** + a rising **ember** emitter + a vignette. **Street**:
bright-day ambient + a light **fog** haze (atmospheric depth, like the reference) + **fountain-mist**
+ **chimney-smoke** emitters + a vignette + an ambient **drunk** townsfolk (idle, two cycling
monologues + an inspect line). **Tower**: cool ambient + haze + vignette. **Tower-room**: dim cool
"moonlit" ambient + a flickering **candle** + a heavier vignette.
**Why:** P7 — make the world feel alive (the user asked for animated / dynamic assets) + the
atmospheric depth of the art reference.
**How:**
- Dynamism without sprite atlases yet: engine **PointEmitter** particles (embers / mist / smoke),
  **LightSource** `flicker` (hearth / candle), animated **fog** — all data. PixelLab `animate_object`
  sprite layers (fire, fountain water, birds, breathing princess, cat tail) come in P8.
- Atmosphere merged post-build (a clean block), tuned with the real art in P8 / P10.
- **Sound** already matches / exceeds the **default project** — global ambient / footstep / pickup /
  transition (P0) + per-NPC procedural voices (P3). Custom recorded SFX / music are the only gap
  (PixelLab is image-only; a later upload swap).
- **Verified** (Playwright): 0 console errors; the warm hearth glow + vignette + fog + smoke render;
  the intro cutscene + favour-chain regression still pass.
**Follow-ups:**
- P8: the real PixelLab art pass — lock the style on a hero asset, then backgrounds (layered), 7
  character atlases, 6 item icons, props; wire + re-tune lighting / fog to the painted art.

### 2026-06-18 — Demo P6: princess, cutscenes & the ending
**What:** Built the endgame + the two required cutscenes. An **intro cutscene** (a tavern `trigger`
`when not saw-intro`, `once`) auto-plays at game start — a camera push-in + the narrator/Claude
intro. The sleeping **princess** is a bed interactable → `startDialog princess`: the wake-puzzle
offers a true-love's kiss (→ **kiss-fail** cutscene; she mumbles, nothing) + funny failed attempts
(shake / slap / yell, one hinting "needs something stronger"). The **onion** is now an inventory
`use` (eat → `ate-onion`, dragon breath); once eaten, the kiss option becomes the **onion-kiss**
cutscene → `princess-awake` → the funny-warm Fiona-style **ending** dialogue → `endGame`. Added
`GameDoc.sequences` (intro / kiss-fail / onion-kiss) + the `end` and `credits` screens (the "sabe
directs everything" gag, Claude in the lead role).
**Why:** P6 — the payoff: the wake puzzle, the comedy, and the A→Z finish.
**How:**
- Intro-once relies on trigger semantics: `t.active` is empty on mount, so a player spawned **inside**
  an `enter` trigger fires it on frame 1; the `when not saw-intro` gate (the sequence sets the flag)
  makes it once-per-game.
- Kiss vs onion-kiss = two `when`-gated choices on the same princess node (on `ate-onion`).
- Cutscenes use `camera {to,zoom}` + `dialog` + `effects` steps (no `anim` yet — real kiss / eat /
  wake one-shots arrive with the P8 sprites).
- **Verified** (Playwright): the intro auto-plays on start (narrator "Vypravěč" line + camera
  push-in + Skip), 0 console errors; the favour-chain regression still passes. The full A→Z
  wake/ending (needs the guard NPC + onion + dinner) is the **P10 manual playthrough**.
**Follow-ups:**
- P7: ambient townsfolk + per-scene lighting / fog / weather + the full sound pass + engine
  particles (smoke / fountain mist / fire) for dynamism.
- P8: real PixelLab art (incl. the princess sleeping / waking sprites + kiss / eat / wake one-shots).
- P10: the full A→Z playthrough (the ending + the clock loop).

### 2026-06-18 — Demo P5: clock, time-of-day gates & the tower gate
**What:** Added the game **clock** (`dayLengthSec` 180, start 10:00) and gated the late game on
time-of-day. The onion-seller's street placement + his "Cibule!" monologue are `when timeOfDay
MORNING (05–13)`; the guard's "offer a beer" choice is `when all(hasItem beer, timeOfDay DINNER
(16–23))`, with a `notyet` branch hinting to come back at dinner. A **sober-up rule** resets
`guard-asleep` + `beer1/2/3` once dinner ends (the kiss-puzzle loop). The tower→tower-room door is
`when guard-asleep` (else a "locked" interactable). A golden **dusk overlay** layer washes the
outdoor scenes `when timeOfDay DINNER` — the visible morning↔dinner mood change.
**Why:** P5 — the clock showcase + the time-gated guard/onion loop + the tower gate.
**How:**
- All gates use the engine `timeOfDay {from,to}` condition (the M13c prereq). Windows are module
  constants (`MORNING` / `DINNER`) — tune in P10.
- The dusk mood is a translucent gold foreground layer gated by `when` (cheap + visible); proper
  per-time lighting / fog comes in P7.
- **Verified**: builds clean, loads with 0 console errors, the favour-chain regression still passes.
  Time-specific visuals span game-time, so they're confirmed in the P6 / P10 playthrough.
**Follow-ups:**
- P6: the sleeping princess + kiss cutscene (fails) + failed-attempt beats + onion eat + onion-kiss
  wake cutscene + ending dialogue + `endGame` → credits.
- P10: tune the clock windows + `dayLengthSec` for a brisk loop.

### 2026-06-18 — Demo P4: the favour chain wired
**What:** Wired the interdependent favour chain end-to-end. The alley **grate** `uses` hook →
`charm` (+ `fished-charm`, with a "grate-empty" variant after); a new alley **cat** interactable
`uses` fish → `cat` item (+ `got-cat`); the tavern **cellar** `uses` cat → `rats-cleared` (+ a
"cellar-clear" variant); a global **rule** `rats-cleared → beer-unlocked`. The charm→fish trade is
the vendor's P3 dialogue; the keeper pours beer once `rats-cleared`. Full chain: fork→hook →
(grate) charm → (vendor) fish → (cat) cat → (cellar) rats-cleared → (keeper) beer.
**Why:** P4 — make the puzzle chain actually playable, no skips / soft-locks.
**How:**
- Item-on-object steps are interactable `uses` (a `UseRule` has no `when`, so single-shot links use
  a **gated pair**: the active interactable `when not <flag>` + an "empty/clear" variant `when <flag>`).
- **Verified** (Playwright): pick up the fork → **Hák** in inventory; cross to the street; select Hák
  and use it on the grate → **Amulet** obtained; 0 console errors. (The street scrolls, so the test
  maps scene-x→viewport for the click.) The remaining links reuse the same proven patterns
  (item-on-object `uses`; NPC trade dialogue) → full A→Z playthrough verified in P6.
**Follow-ups:**
- P5: clock + `timeOfDay` gates (guard drinkable at dinner; onion-seller mornings) + the sober-up
  rule + the tower door `when guard-asleep` + morning↔dinner lighting.

### 2026-06-18 — Demo P3: cast NPCs + dialogue trees
**What:** Added the 4 cast NPCs to `GameDoc.npcs` — **Hospodský** (keeper), **Rybářka** (vendor),
**Cibulář** (onion-seller), **Stráž** (guard) — each with a procedural voice, placed in their scenes
(keeper at the bar, vendor + a roaming onion-seller with a market patrol path, guard at the tower
door), and wrote their Czech comedy dialogue trees (`GameDoc.dialogs`): the keeper's rats-for-beer
deal + post-rats "free beer + fishing-float quip", the vendor's charm→fish trade, the onion-seller's
free-onion patter + "Cibule! Kupte si cibuli!" monologue, and the guard's taunt + the 3-rung
**beer-ladder** (`beer1`/`beer2`/`beer3` → `guard-asleep`). Also did the promised **Czech-diacritics
sweep** over all P0–P2 content strings. Hero = **Claude** (named in the poster proclamation).
**Why:** P3 of the roadmap — the cast + the conversational logic the favour chain (P4) and the
guard gate (P5) build on.
**How:**
- Dialogue uses the engine's `branch` routers for state-driven openings (keeper routes on
  `rats-cleared` / `keeper-deal`; the guard's ladder routes on `beer1` / `beer2`). Trades are
  `takeItem` + `giveItem` + `setFlag` choice effects. The beer choice is gated `when hasItem beer`
  for now; the `timeOfDay dinner` gate + the onion-seller's morning gate land in P5 with the clock.
- `tools/build_demo.py` now validates dialog `start` / `next` / `branch.to` / `choice.next` node refs
  + npc↔dialog id refs at build time.
- **Verified** (Playwright): loads with 0 console errors; the interaction→effect pipeline + Czech
  diacritics render (clicking the poster shows its bubble); the tavern→street loop still works. NPC
  dialogue uses the same proven `beginDialogue` pipeline; the headless click can't reliably hit the
  thin greybox NPC sprite, so the **interactive NPC-dialogue click is deferred to the P6 playthrough**
  (real sprites in P8 + the talk-cursor hotspot make it a non-issue in actual play).
**Follow-ups:**
- **P4 next:** wire the favour chain (hook→grate→charm; charm→vendor→fish; fish→cat→`cat`;
  cat→cellar→`rats-cleared`→`beer-unlocked` rule) + the cat interactable in the alley.
- P5: clock + `timeOfDay` gates + sober-up rule + tower-door gate + morning↔dinner lighting.

### 2026-06-18 — Demo P0–P2: greybox scaffold + parallax layout + items/interactables (_Magický polibek_)
**What:** Started the real demo build. Replaced the old street/room demo with a fresh
`content/game.json` for **_Magický polibek_** — 4 scenes (tavern / street / tower-exterior /
tower-room), walkable + depth + spawn + exits wiring the loop, **parallax greybox** backgrounds
(inline base64-SVG `image` layers), the 6 items (hook / charm / fish / cat / beer / onion), and P2
world objects: the **fork→hook** pickup, the **poster** (reads the proclamation + sets
`read-poster`), the **cellar** (rats hint) and the alley **grate** (use-wiring deferred to P4).
Title heading/tagline set. Authored by `tools/build_demo.py` (gitignored aid; `content/game.json`
is the source of truth) + a reusable `tools/verify.mjs` (Playwright, isolated in gitignored `tools/`).
**Why:** Execute the demo roadmap A→Z, mechanics-first / greybox so the loop is playable before the
PixelLab art pass (P8). Art is a swappable layer.
**How:**
- **Greybox = inline base64 `image` SVG layers** (not code `builtin` painters): fully data-driven +
  swappable for PixelLab PNGs in P8 by changing `src`. **Parallax** far layers (sky / hills /
  buildings) are oversized + `fit:'none'` (centered) so slow parallax doesn't reveal edges on the
  wide (4000px) street; ground / zone-overlay use `fit:'stretch'`. Confirmed `fitImageSprite` sizes
  layers to the **scene design space**, not the viewport — so the wide street fills correctly.
- **Verified in a real browser** (Playwright, clean context → baked doc, no IndexedDB draft): loads
  with **0 console errors**; title → New game → **Hospoda**; click the door → **Ulice** (walking,
  pathfinding, exits, transitions, wide-street parallax all working); player placeholder renders
  (moved the tavern spawn off the foreground table).
- **Art-direction locked** from the user's reference (Octavi Navarro–style detailed painterly pixel
  art, muted earthy palette, warm interiors vs cool exteriors, atmospheric depth) → `demo-assets.md`
  style suffix + note. **Session locks** in `demo-roadmap.md`: hero = **Claude**; parallax sky+nature;
  animated assets (engine particles now + PixelLab anims in P8); full default-style sounds; credits =
  Director (user) + „sabe" on all other roles.
**Follow-ups:**
- Diacritics: greybox examines / `say`s are ASCII; full Czech-diacritic sweep in the P3 content pass
  (the title is already fixed).
- HUD hint text is the engine English default — localize in P9.
- tower / tower-room greybox not yet eyeballed (same mechanism as the verified scenes) — covered by
  the P6 playthrough.
- **Next (P3):** the 4 cast NPCs + dialogue trees.

### 2026-06-18 — Demo: agent to build it via skills + PixelLab MCP (decision recorded in demo-roadmap)
**What:** Docs only. Decided the agent (Claude Code) will assemble the **whole demo itself** as a live test of the Pixin **skills** + **PixelLab via its MCP** for assets — recorded as a new **"Test skills and PixelLab"** section at the top of `demo-roadmap.md`. The user accepts the pixel art won't be polished (their review/tweak afterwards; art is a swappable layer). **Key operational note:** the PixelLab **MCP must be installed and the Claude Code session restarted** — MCP tools register at session start, so they won't appear mid-conversation; nothing is lost on restart (on disk + this dev log), resume from `demo-roadmap.md` (both engine prereqs ✅, next P0). Fallback = hand-authored SVG/geometric greybox if PixelLab is unavailable.
**Why:** the user wants the demo done fast and to see the skills + PixelLab work in practice; the user's subscription is active and just needs the MCP added.
**Follow-ups:** user installs the PixelLab MCP + restarts; new session: `/mcp` to verify, then "continue the demo" → P0 (scaffold) onward, generating assets through PixelLab.

### 2026-06-18 — M13c Prereq 2: contact (blob) shadows
**What:** Built the missed M10 piece — soft **contact shadows**. New `engine/shadow.ts`
`createShadowSystem(layer, cfg)`: a shared soft radial **shadow texture**, and per-caster `Sprite`s
it positions/squashes each frame. A **caster** `sample()`s its feet/base `{x, y, width, visible?}`.
In `scene.ts` a `shadowLayer` (zIndex 5 — above the background, below the characters) holds them;
the **player + every NPC** register automatically (sampling `displayObject.x/y/width` — already
depth-scaled), and a hidden NPC drops its shadow (`visible`). **Props** opt in via new
`LayerData.castShadow` (a blob at the layer's base). Schema: `ShadowConfig {opacity, squash, scale,
disabled}` on `SceneData.shadows` (on by default with sensible defaults). Editor: a Scene-tab
**Shadows** section (`SceneShadows` — toggle + opacity/squash/size sliders) + a **shadow** checkbox
per layer row (`setLayerCastShadow` / `setSceneShadows`).
**Why:** M13c Prereq 2 / variant A — objects + characters should look grounded; we forgot shadows
in M10 chiaroscuro.
**How:** it's plain ambient-occlusion grounding — **no light direction** (that's the V2 directional
shadow). It renders in the **world** (camera-tracked, depth-scaled), independent of the lighting
overlay, which still sits above and darkens the shadow in dark areas. The shadow width is the
entity's on-screen `displayObject.width × scale` (config `scale` default 0.7, `squash` 0.32,
`opacity` 0.32). Config edits + `castShadow` re-mount (structural), like spawn points.
**Verified:** typecheck + lint + build green; `shadow.ts` + `SceneShadows.tsx` Prettier-clean; dev
smoke `/` + `/?edit` 200. (Visual: the existing demo's player + NPCs now sit on soft shadows that
scale with depth and vanish when an NPC isn't in the scene — eyeball in `pnpm dev`.) Editor_guide
updated (Layers row + a Shadows section).
**Follow-ups:** both demo prereqs done (`timeOfDay` ✅, blob shadows ✅) → **P0 — Scaffold** next.

### 2026-06-18 — Plan: shadows — contact (blob) shadows now (M13c Prereq 2), light-driven shadows → V2
**What:** Docs only. Noted that **shadows were missed in M10** (chiaroscuro) and planned them. **Now (M13c Prereq 2):** **variant A — contact / "blob" shadows** — a soft depth-scaled ellipse at each entity's feet, rendered in a world-space pass below the entities (independent of the lighting overlay): characters auto, props opt-in (a layer flag), a small per-scene `shadow` config (opacity + squash). **V2:** **variant B — directional, light-driven shadows** — the user's good question ("shadows aren't only from the sun but from scene lights too — is that even solvable?") → yes, meaningfully, by casting **one** skewed silhouette away from the **dominant light**: blend the ambient/sun direction + nearby placed lights weighted by **intensity × falloff/distance** into a single resultant, length/opacity from the strength. The shadow swings as the player passes a candle/torch; sun + scene lights unify into one believable shadow — avoiding the noise + cost of one-shadow-per-light (≈ full 2D shadow-mapping). Could tie length to time-of-day. Recorded A in the demo-roadmap (Prereq 2 + Decided), B in roadmap V2.
**Why:** the user wants objects + characters to cast shadows; A is the right fidelity for the flat / pixel-art style and cheap, B is the "wow" upgrade once 1.0 ships.
**How (A scope):** the `Character` already computes feet position + depth-scale each frame, so a blob is a small add (an ellipse it positions/scales like its view); a dedicated shadow container below the `interactive` band keeps all shadows under all entities. No light direction in A.
**Follow-ups:** build **Prereq 2** (blob shadows) — likely alongside / after the `timeOfDay` prereq — then **P0**.

### 2026-06-18 — Demo art: PixelLab prompt sheet (`demo-assets.md`)
**What:** Docs only. The user chose **pixel art via PixelLab** for the demo art (no hand-drawing). Skimmed the PixelLab docs and wrote **`agent_docs/demo-assets.md`** — a copy-paste prompt sheet for every demo asset: a **workflow** (lock one style reference / seed first — its text controls drift, so cohesion comes from a style reference, not the prompt; generate **flat/neutral lighting** since the engine does time-of-day light/fog/grade; **Remove background** for anything that stacks), a **global-settings** table (view `side`, facing, sizes), and concrete prompts for the **scenes as separate parallax layers** (the street split into sky / hills-behind-city / buildings / ground / zone props; tavern; tower), the **7 characters** (player + 4 NPCs + cat + princess, with the poses/one-shots each needs), and the **5 item icons**. Plus engine-import tips (bands + parallax, the grid atlas, anchor = feet). Linked from the demo-roadmap asset checklist.
**Why:** the user asked for detailed PixelLab prompts for scenes / NPCs / items; this captures them as reusable reference paired with the asset checklist.
**How (PixelLab notes from the docs):** it generates pixel-art characters / items / tilesets / backgrounds; prompts are terse phrases; view options include **`side`** (sidescroller — what we want), low/high top-down, isometric; **Remove background** gives transparency; **Create images from style references (Pro)** + Seed reuse are how to keep a set cohesive (the per-image text controls are "quite weak"). It does **not** auto-layer a scene, so sky / hills / buildings / street are generated separately and stacked as the engine's parallax layers.
**Verified:** docs only — no code; cross-checked the asset list against `demo-roadmap.md` (7 atlases, 6 item icons, 3 scenes).
**Follow-ups:** the user generates assets from the sheet; building resumes at **P0 — Scaffold** (greybox can start in parallel, no art needed).

### 2026-06-18 — M13c Prereq: `timeOfDay` condition (gate `when` on the clock)
**What:** Built the demo prerequisite — a new `Condition` kind **`timeOfDay { from?, to? }`** (minutes past midnight; wraps past midnight; open bounds allowed). `checkCondition` gained a `case 'timeOfDay'` that reads `state.clockMinutes` via `inTimeWindow`. So `when` can now gate on the game clock **anywhere** (dialogue choices, interactables/exits, NPC presence, lights, rules) — not just routine edges. Editor: `ConditionEditor` gained the `timeOfDay` kind + two **HH:MM** inputs (reusing `time-format.ts`). This resolves the M12c "general timeOfDay condition" follow-up and unblocks the demo's morning-only onion seller / dinner-only guard / time-based lighting.
**Why:** M13c Prereq (variant A). The clock could advance time but nothing could *react* to it outside routines — the missing half.
**How:** **moved `inTimeWindow` from `systems/routine.ts` into `systems/conditions.ts`** (and re-imported it in `routine.ts`) to avoid an import cycle — `conditions.ts` is the leaf that `routine.ts` already depends on. `timeOfDay` touches no flag, so the M12b logic-graph scanner needs no change. The condition is inert (true) when no clock is configured, so adding it never breaks an existing game.
**Verified:** typecheck + lint + build green; `ConditionEditor.tsx` Prettier-clean; an ad-hoc tsx test of `inTimeWindow` + `checkCondition(timeOfDay)` — **13 checks** (inside / before / at-`to`-exclusive / midnight-wrap / no-clock / open-bounds / composes with `not` + `all`) all pass; dev smoke `/` + `/?edit` 200. Editor_guide Conditions table updated.
**Follow-ups:** **P0 — Scaffold** next (fresh `content/game.json`: tavern / street / tower).

### 2026-06-18 — Demo: lock variant A (build the `timeOfDay` condition) as the first phase
**What:** Docs only. The user questioned whether the `timeOfDay` condition is needed (the engine can already set times) — clarified that `fromTime`/`toTime` exist **only on routine edges**; nothing else (dialogue / exit / light / rule) can read the clock. Laid out three paths: A) add the `timeOfDay` condition, B) routine-only + an invisible "timekeeper" NPC flipping is-morning/is-dinner flags (a hack), C) routine-only and drop time-based lighting. The user chose **A** ("we want it on anything"). Firmed up the **Prereq phase** at the top of `demo-roadmap.md`: exact touch points (schema Condition union, `checkCondition` case, the editor's ConditionEditor, logic-scan unaffected), the verify steps, and one **implementation note** — `inTimeWindow` lives in `routine.ts` which imports `conditions.ts`, so it must **move into `conditions.ts`/a shared module** to avoid an import cycle. Recorded variant A in Decided.
**Why:** the demo's onion-seller-mornings / guard-at-dinner / time-lighting all need to gate `when` on the clock, which only the new condition allows cleanly (the onion seller's *movement* alone could be a routine, but dialogue/light/rule gating can't).
**How:** small, self-contained engine addition reusing the existing `clockMinutes` + `inTimeWindow`; resolves the M12c "general timeOfDay condition" follow-up. No code yet — built as the first step of M13c.
**Follow-ups:** implement the Prereq (`timeOfDay` condition), then P0 — Scaffold.

### 2026-06-18 — Demo game: add a time-of-day layer (4th NPC, clock, lighting) + a `timeOfDay` engine prereq
**What:** Docs only — extended `demo-roadmap.md` with a **time-of-day showcase** (the user's idea): a **mobile onion seller** who appears **mornings only** and shouts "Cibule!" (a patrol path + monologue + a `timeOfDay` gate), a **guard** who's drinkable **at dinner only** (the beer-ladder choice gated `when timeOfDay dinner`), a **sober-up rule** (`when not(timeOfDay dinner) & guard-asleep → reset guard-asleep + beer1/2/3`) so he must be re-drunk each dinner, and **lighting that changes** morning↔dinner. This creates the late-game loop: drink the guard at dinner → in → kiss/attempts fail (no onion) → wait for morning → buy onion → wait for dinner → re-drink → in → onion-kiss → win. Roster grew to **4 cast NPCs** (added the onion seller, separate from the static fish vendor — the user's call). Updated cast, the chain, the mechanic map, items/flags, phases (added **Prereq** + reworked P3/P5), asset checklist (7 atlases), and Decided/Open. Synced the roadmap M13c pointer.
**Why:** the user wanted the demo to actively show off **routines, the clock, and lighting**, not just have them sit unused.
**How (the engine gap this surfaced):** time currently gates only **routine edges** (`fromTime/toTime`) — there is **no `timeOfDay` `Condition`**, so dialogue / NPC presence / exits / rules can't gate on time. So the demo gets a **Prereq phase**: add `Condition` kind `{ kind:'timeOfDay', from, to }` → `checkCondition` reads `state.clockMinutes` via the existing exported `inTimeWindow`, + the `ConditionEditor` UI. Small, self-contained, and it **resolves the M12c "general timeOfDay condition" follow-up**. NPC presence + lighting then gate on it; the onion seller's *movement* uses a normal patrol path (no cross-scene routine needed).
**Verified:** docs only — confirmed against the code that no `timeOfDay` condition exists (`Condition` union = hasItem/flag/visited/all/any/not; `clockMinutes` is in `StoryState`; `inTimeWindow` is exported from `routine.ts`).
**Follow-ups:** start the **Prereq** (`timeOfDay` condition) then **P0**; tune `dayLengthSec` + the morning/dinner windows at P5.

### 2026-06-18 — Demo game: title + princess-wake locked (Magický polibek / the onion-kiss)
**What:** Docs only — finalised the two open creative calls in `demo-roadmap.md`. **Title:** **_Magický polibek_** (A Magic Kiss) — the irony being the "magic" is an onion (beer stays the guard's lullaby, not the theme/title). **Princess wake:** no sleeping curse — true-love's kiss does nothing; after a run of **funny failed attempts** (shake / slap / yell → sleep-mutters that hint at "something stronger"), the hero fetches an **`onion`**, **eats it** (`ate-onion`), and the **onion-kiss** jolts her awake in tears (`princess-awake`). The ending is funny with a beat of Fiona-style warmth (she's charmed he went through the whole quest). Updated the dependency chain, items (`+onion`) / flags (`+ate-onion`, `tried-kiss`), phase **P6**, the asset checklist (onion icon + an eat-onion/kiss one-shot + princess waking-in-tears), and split the open questions into **Decided** (title, wake, tavernkeeper task, street zone) vs still-open (beer count 3/5, the exact ending lines). Synced the roadmap M13c pointer.
**Why:** the user wanted the wake designed now and a non-beer, Shrek-style payoff; locked it before building.
**How:** combined the user's two favourites (she-isn't-really-cursed + the onion) into "eat onion → onion-kiss"; kept `princess-awake` as the stable hook so the trigger/lines stay flexible. Draft ending dialogue lives in the chat; finalise at P6.
**Follow-ups:** start **P0 — Scaffold** when ready.

### 2026-06-18 — M13c: demo-game design locked + `demo-roadmap.md` build plan (no code yet)
**What:** Designed the M13c demo game with the user and wrote **`agent_docs/demo-roadmap.md`** — the build plan. Game: **_Pivo pro princeznu_ (A Beer for the Princess)**, a fairy-tale comedy. A penniless tramp earns beer through a favour chain (Tavernkeeper's **rats → cat → fish → charm → grate hook**) to get the **Guard** drunk and reach the **sleeping princess**; the kiss fails and a (TBD) gag wakes her — Shrek/Fiona twist. **3 scenes** (tavern / scrolling street with alley·market·fountain / tower), **3 cast NPCs** (tavernkeeper / vendor / guard) + interactables (cat, princess, poster, cellar, grate) + optional ambient "bushes". The doc has the dependency chain, items/flags (incl. the guard **beer-ladder** via a dialogue `branch` since the engine has flags not counters), a mechanic→`pixin-recipes` map, **phases P0–P10** (greybox first → real-asset pass), an **asset checklist**, and open questions. Linked from roadmap M13c.
**Why:** the user wants the plan captured as a roadmap **before** building — then we'll work through it together (they make assets; we build mechanics in the editor / `game.json`). Used the `pixin-recipes` skill while designing so every beat maps to a real mechanic.
**Decisions (with the user):** tavernkeeper task = **rats in the cellar → need a cat** (chosen); street's third zone = **town square with a fountain** (chosen). **Open:** the princess-wake gag (none of beer/stink/cockerel/cat felt right yet — `princess-awake` kept as the stable hook so the trigger can change freely); beer count 3 vs 5; the title.
**How:** the build is **greybox-first** ("art is a swappable layer") so it's playable end-to-end early, with a dedicated real-asset pass; each phase is committable + testable. Develop in `content/game.json` (the live editor doc), replacing the old M10/M12 demo (preserved in git).
**Verified:** docs only — no code; the `demo-roadmap.md` link resolves (same `agent_docs/` dir; the IDE's "cannot resolve" was a stale-index false positive).
**Follow-ups:** start **P0 — Scaffold** when the user is ready; decide the wake gag + beer count along the way.

### 2026-06-18 — M13b: Claude Code authoring skills (pixin-gamedoc / pixin-editor / pixin-recipes)
**What:** Three repo-committed skills under `.claude/skills/` so anyone cloning gets AI help building games. **`pixin-gamedoc`** — the `GameDoc` mental model + vocabulary + main sub-shapes, pointing at `src/data/schema.ts` as the source of truth (for editing `content/game.json` directly). **`pixin-editor`** — a launcher/tabs table + an "I want to… → panel + steps" map (for driving the no-code editor), pointing at `editor_guide.md`. **`pixin-recipes`** — 10 end-to-end recipes (locked door, fetch quest, stealth beat, branching dialogue, intro cutscene, conditional weather, NPC monologue, global rule, flag-gated asset swap, game-over), each with editor steps **and** a `game.json` snippet. The three cross-reference each other.
**Why:** M13b — turn "I want mechanic X" into either precise editor steps or a ready `game.json` edit, the AI-assist layer the user asked for.
**How:** matched the installed PixiJS skills' format (`SKILL.md` with `name` / `description` (trigger keywords) / `license` frontmatter). Deliberately **don't duplicate the full schema** — the skills give the mental model + gotchas and route to `schema.ts` / `editor_guide.md`, so they don't go stale. Snippets use real field names + the pre-seeded ids (weather `rain`/`snow`/`dust`, sounds `sfx-*`), spot-checked against the schema.
**Verified:** field names / preset ids / sub-shapes cross-checked against `src/data/schema.ts` + `weather-presets.ts`; frontmatter mirrors the working PixiJS skills. No code changed (markdown only) — the green bar from M13a stands. **Each ` ```json ` snippet in `pixin-recipes` is a valid standalone JSON value** (every fragment wrapped in `{}`, no `//` comments — context moved to prose) so an IDE's JSON injection doesn't flag them; verified by parsing all 11 blocks.
**Follow-ups:** **M13c — the complete demo game** (A→Z, real licensed assets) next; it'll also road-test these skills + the docs.

### 2026-06-18 — M13a: documentation pass (editor-guide audit, asset-prep, README, OSS hygiene)
**What:** Docs only. (1) **Editor-guide coverage audit** — walked every shipped editor feature against `editor_guide.md`; found + filled the gaps: a new **Dialogs** authoring section (library, node editor — speaker/text/On-enter/Branch/Choices/next, attaching to NPCs/items/effects), **Items** gained **Examine when** (#1b) + **On click** (#5) docs, the **Effects** reference table was completed (added moveNpc/despawnNpc/gameOver/endGame/startSequence/wait/setStance and fixed the stale `startDialog` note), and a **Keyboard & mouse** reference block. (2) **Preparing assets** section — design space (reference height / fractions), the **animation atlas** grid (frame size / columns / fps / clip naming `state.facing` + one-shots / anchor = feet), images (SVG/PNG/JPG + fit), animated layers, sounds (formats / loopable / built-ins). (3) **README** — rewrote from a one-line stub into a full front page: quick start, an exhaustive "what the editor can do" feature list, the AI/Claude-Code angle (AGENTS.md + the coming Pixin skills + a link to the **PixiJS** skills), tech stack, docs index. (4) **OSS hygiene** — `LICENSE` (MIT), `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `package.json` `license`/`description`.
**Why:** M13a — make the editor fully documented + the repo presentable before packaging. The README links the editor guide and the PixiJS skills (per the user).
**How:** kept the editor_guide's existing style/section conventions; the asset-prep section is the *exact formats the editor expects* (atlas grid, clip names, anchor), deferring the *how to make art* to `asset_pipeline.md` (which it references). README "features" mirror the roadmap's shipped milestones so it stays a true overview.
**Verified:** `package.json` valid; typecheck + lint + build still green (only docs / metadata changed). Coverage re-checked: every editor panel / global section / reference now has an entry.
**Follow-ups:** **M13b — Claude Code authoring skills** (`pixin-gamedoc` / `pixin-editor` / `pixin-recipes`) next.

### 2026-06-18 — Editor v1 declared complete; M13 reshaped into a–e (docs / skills / demo game / package / site)
**What:** Docs only (`agent_docs/roadmap.md`). The user declared the **editor v1 complete** (M0–M12.5) and we restructured M13 (open-source packaging) into five ordered sub-milestones, agreed in conversation: **M13a** documentation pass (editor-guide coverage audit + an asset-prep section incl. animation formats + README + LICENSE/CONTRIBUTING), **M13b** Claude Code skills (`pixin-gamedoc` / `pixin-editor` / `pixin-recipes` — AI help to drive the editor + edit `game.json`), **M13c** a complete short demo game with real licensed assets (also validates the docs/skills/pipeline), **M13d** package + `npx create-…` scaffolder (clean vs demo template) + schema-as-public-API (JSON Schema + `pixin validate`) + versioning/migrations + CI, **M13e** a GitHub Pages site hosting the playable demo.
**Why:** M13 was one vague bullet; the user wanted it split + expanded with new asks (AI authoring skills, a real demo game first, an asset-prep doc, a showcase site).
**Decisions (with the user):** (8) the scaffolder offers **clean vs demo**, demo = the repo's dev default but not forced on new projects; (7) a live **"try the editor"** build on the site is **deferred** (editor is DEV-only) — the site ships only the playable game for now; the README also links the installed **PixiJS skills**. My additions accepted: JSON Schema export + `pixin validate` CLI, `GameDoc.version` + a migration framework, an `engine` embedding API (`mountGame`), and CI/open-source hygiene files.
**Order:** M13a → M13b → M13c → M13d → M13e (docs first; skills + game build on them; package + site last).
**Follow-ups:** start **M13a** (documentation pass) next session. No code this turn.

### 2026-06-18 — Monologues: optional per-line sound (library `SoundId`)
**What:** A monologue line can now play a sound when it appears (M12.5 #6 follow-up). `Monologue.sound?: SoundId` (a library reference, like every other sound). Runtime: `updateMonologues` plays it via `audioMod.playSoundById(line.sound)` right when the bubble shows (so it's once per appearance, muted in the editor preview). Editor: a **sound** `SoundSelect` per line in `MonologueList`. Demo: two stranger lines carry the built-in **`sfx-pickup`** blip (seeded in every doc, so no new asset needed — upload your own in the Sounds tab to replace it).
**Why:** the user wanted monologues to have voice / audio, authored the same way as all other sounds (a library picker).
**How:** reuses the existing `SoundSelect` + `playSoundById` (the same path as `playAnim` clip sounds / the `playSound` effect). The sound fires in the same branch that calls `bubbles.show`, so it stays in sync with the line and respects the cycle / `every` timing.
**Verified:** typecheck + lint + build green; `MonologueList.tsx` Prettier-clean; `game.json` valid. (Visual: the stranger blips as those lines pop up; `/?edit` → NPC modal → Monologues → pick a **sound** per line.)

### 2026-06-18 — Speech bubbles → DOM overlay (Pixi Text clip finally beaten)
**What:** Pixi `Text` kept clipping the right edge of bubble lines no matter what (padding, CanvasTextMetrics, manual `\n` wrap with `wordWrap:false` — all failed; the clip even scaled with line length). Gave up on Pixi for this and moved the bubbles to the **DOM**: `engine/bubble.ts` now only runs the typewriter + tracks each character's feet (design px) and publishes live bubbles on a `bubbleBridge` singleton; a new React overlay `ui/SpeechBubbles` maps those to the screen via `cameraOffset` (an rAF loop, same transform the cursor inverts) and renders one `<div>` per bubble. The browser lays out + wraps the text (CSS `max-width` + `overflow-wrap`), so it never clips; the font is `calc(15px * var(--ui-scale))` so it tracks the Settings text-size; a CSS `::after` triangle is the tail. `createBubbleSystem()` no longer takes a Pixi layer; `scene.ts` dropped the `bubbleLayer`.
**Why:** after ~five attempts the clip was clearly a Pixi v8 `Text` texturing issue we couldn't configure away; DOM text is the bulletproof path and gets wrapping + the `--ui-scale` font for free.
**How:** `bubbleBridge.items` is rebuilt each engine tick (positions move every frame); `SpeechBubbles` diffs before `setState` so it doesn't churn when idle, and only renders in the game's `playing` phase. The "don't restart the typewriter when the same line re-fires" guard stays.
**Trade-off / follow-up:** bubbles no longer render in the **editor live preview** (the DOM overlay is only in the game overlay; the preview canvas isn't at the viewport origin the camera maps to) — author monologues then **▶ Test in game** to see them. A preview-scoped overlay could be added later if needed.
**Verified:** typecheck + lint + build green; `bubble.ts` + `SpeechBubbles.tsx` Prettier-clean. (Awaiting the user's check — single- and multi-line bubbles should now show every character.)

### 2026-06-18 — Speech-bubble clip: manual line-wrap, Pixi wordWrap off (the one that works)
**What:** After padding / measure / align tweaks all failed (and bumping `padding` to 24 even broke the multi-line case — large padding shifts the glyphs inside the texture), switched the bubble to **manual word-wrapping**: a `wrapText()` helper breaks the line itself with `CanvasTextMetrics` (≤ 240 px/line, honouring explicit `\n`) and joins with `\n`, and the `Text` runs with **`wordWrap: false`** so Pixi renders the already-broken string verbatim. `padding` back to 4; the panel is measured (synchronously) from the visible text; the typewriter slices the pre-wrapped string (a `\n` just types as an instant line break).
**Why:** Pixi v8's own `wordWrap` rendered the end of each line a hair narrower than measured, clipping the last glyphs — proportional to line length, so long single lines lost a whole word while short / wrapped lines looked fine. Doing the wrap ourselves sidesteps that renderer path entirely.
**How:** `wrapText` greedily fills lines word-by-word, measuring each candidate; the bubble stores the wrapped string as `full` and types through it. The earlier "don't restart the typewriter when the same line re-fires" guard stays (keeps a vision-`approach` NPC from stuttering its line).
**Verified:** typecheck + lint + build green; `bubble.ts` Prettier-clean. (Awaiting the user's visual check — single-line *and* multi-line should now show every glyph.)

### 2026-06-17 — Speech-bubble clip (attempt 3): bigger text padding + left align + panel slack
**What:** The CanvasTextMetrics measure alone didn't clear it (a long monologue still lost the last word of each wrapped line), so this targets the **text texture clip** directly: `TextStyle.padding` 4 → **8** (Pixi pads the glyph texture so line-end glyphs aren't cut), `align` center → **left** (so the right-side slack actually guards the line ends rather than re-centring), and **+8 px** of panel width on the right (the user's suggestion). Measurement stays on `CanvasTextMetrics`.
**Why:** the clip was at each wrapped **line's end** (per the user's screenshot) — the classic Pixi edge-glyph texture clip, which `padding` addresses; centring meant extra right room didn't protect the actual right edge of each line.
**How:** `layout` adds `RIGHT = 8` to the measured width before drawing the panel; the style carries `padding: 8`; the label is left-aligned at `-w/2`. If a whole word were still dropped after this, the fallback is manual word-wrapping (compute line breaks with `measureText` per word, render with explicit `\n` + `wordWrap:false`).
**Verified:** typecheck + lint + build green; `bubble.ts` Prettier-clean; dev smoke `/` + `/?edit` 200. (Awaiting the user's visual re-check of the long stranger line.)

### 2026-06-17 — Speech-bubble clip: the actual fix — measure with CanvasTextMetrics (not lazy bounds)
**What:** The clip survived the previous attempt (screenshots showed the **last word of each wrapped line** cut off — "…wander down ⟂that⟂", "…if I were ⟂you,⟂"). Root cause: `Text.getLocalBounds()` lags a frame behind a `.text` change (Text measures lazily at render), so the panel was sized from the *previous* (shorter) text and clipped the new tail. Fix: size the panel with **`CanvasTextMetrics.measureText(text, style)`** — a synchronous measurement that applies the same word-wrap the renderer uses — so width/height always match the text exactly. The earlier `ceil` typewriter + `padding` + per-frame relayout stay.
**Why:** verified against the user's two screenshots (guard mid-type was fine; the stranger's settled multi-line bubble clipped each line's end), which pinpointed it as a measurement lag, not a typewriter or padding issue.
**How:** `layout()` now reads `CanvasTextMetrics.measureText(b.label.text || ' ', b.label.style)` for `{ width, height }` and draws the rounded panel + tail around it; the label sits at `-w/2` (centred, `align:'center'`). No display-object bounds involved, so there's no frame lag.
**Verified:** typecheck + lint + build green; `bubble.ts` Prettier-clean; dev smoke `/` + `/?edit` 200. (Visual: re-check the long stranger monologue — every line now shows its final word.)

### 2026-06-17 — Speech-bubble clip + multi-line: real root cause (typewriter `floor` + measure-from-slice)
**What:** The previous bubble pass didn't actually fix the clipped letters / multi-line — corrected here. Two real causes: (1) the typewriter sliced with `Math.floor(revealed)` and **skipped the completing frame** (once `revealed === full.length` the `< length` branch no longer ran), so the **final character was never drawn**; plus Pixi clips edge glyphs with no `padding`. (2) sizing the panel once from a stale measurement didn't track wrapped multi-line text. Fix: the panel is now drawn **every frame from the label's real `getLocalBounds()`** (so it always fits the visible text — last glyph + every wrapped line included), the typewriter uses `Math.ceil` + re-layout (the final char always shows), and the `TextStyle` gets `padding: 4`. `wordWrap` (220-px) gives true multi-line. Demo: a long stranger line now wraps onto multiple lines.
**Why:** the user reported (correctly) that the clip + multi-line still failed after the first attempt — that attempt measured from the full text once but kept the `floor` typewriter bug and the no-padding glyph clip.
**How:** `layout(b)` reads `getLocalBounds()` and draws the rounded panel + tail around it, centring the text (accounting for the bounds origin); `update` re-runs `layout` whenever the visible slice changes and on the completing frame. The box grows slightly as it types (fine — it always fits). Font is still `BASE_FONT 14 × --ui-scale`.
**Verified:** typecheck + lint + build green; `bubble.ts` Prettier-clean; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: full sentence shows incl. the last letter; a long monologue wraps to multiple lines; font tracks Settings → text size.)

### 2026-06-17 — Speech-bubble polish: smaller font, settings font-scale, multi-line (fix clipped tail)
**What:** Three tweaks to `engine/bubble.ts` from playtesting. (1) **−50% font** — `BASE_FONT` 28 → 14 (design px). (2) **Reacts to the settings text-size** — the bubble font now multiplies by the player's `--ui-scale` (the same var the rest of the game UI uses), read straight from the DOM so the engine stays decoupled from the settings module. (3) **Multi-line + the last characters no longer clipped** — the panel is now sized from the **full** text (measured once on `show`) instead of from the typed-so-far slice, so the box never under-sizes the final word; `wordWrap` (left-aligned, 220-px wrap) gives proper multi-line bubbles, and the typewriter just refills the fixed box.
**Why:** the user found the monologue font too big, wanted it to honour the in-game text-size setting, and hit a bug where the last letters of a line were cut off (the box was measured from the mid-type slice, so it ended a touch too narrow).
**How:** `sizeBubble` sets `label.text = full`, measures, draws the bg + tail at that size, then clears the label; `update` only slices `full` into the fixed box (no per-frame resize). `uiScale()` parses `document.documentElement.style.getPropertyValue('--ui-scale')` (set by `applySettings`/the Settings slider), defaulting to 1 when unset (e.g. the editor preview). Read at `show` time — bubbles are short-lived, so new ones pick up a changed scale.
**Verified:** typecheck + lint + build green; `bubble.ts` Prettier-clean; dev smoke `/` + `/?edit` 200. (Visual: monologues are smaller, scale with Settings → text size, wrap onto multiple lines, and show the full sentence.)

### 2026-06-17 — Fix: vision `approach` stalled the routine; monologues now cycle multiple lines
**What:** Two follow-ups from playtesting #6/#18. (1) **Bug** — a vision `approach` NPC got **stuck** after its second detection: walking to the player via `setTarget` replaced the routine path's `onArrive` callback (`routineArrival.notify`), so an `onArrive` routine node (e.g. the guard's *go-door* / *go-back*) never completed and the routine stalled. Fix: a per-routine-NPC `routineReplay` map — after the approach effects run, the NPC **re-walks its active routine path** (`start(activePathOf(...))`), which re-arms the `onArrive` notify so the routine advances again. (The first detection recovered by luck — it happened on the timed *patrol* node, whose `after` timer keeps running regardless.) (2) **Enhancement** — monologues now **cycle through all eligible lines** instead of only showing the first whose `when` passes: the driver filters the eligible set (condition-gated), cycles it in order, and the gap before the next line is that line's `every` (else a default `MONO_GAP` while cycling, else once). So an NPC can have several lines that rotate, and a flag adds / removes lines mid-cycle. Demo: the stranger now cycles three lines (a fourth unlocks after you meet him).
**Why:** the user reported the guard freezing on the second spotting, and asked whether monologues can repeat on a timer + have multiple lines — the old "first active" model only flag-swapped one line.
**How:** `routineReplay` re-issues the same `start(currentPath)` the path-switcher uses, so the routine path (and its arrival notify) resume from the NPC's current position after the diversion — no teleport, the guard just finishes its walk. The monologue cycle keys off the eligible set's text signature; when it changes (a flag flip) the cycle restarts. Both are visual/runtime only.
**Verified:** typecheck + lint + build green; `MonologueList` Prettier-clean; an ad-hoc tsx test of the cycle (in-order rotation, gated line excluded then included, single-once) — 4/4; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: the guard now approaches + speaks + resumes its patrol/room loop repeatedly; the stranger rotates his lines.)
**Follow-ups:** approach still walks to the player's exact spot (a small stop-gap distance would avoid overlap); the routine replay restarts the path leg rather than resuming mid-leg (fine for the short demo paths).

### 2026-06-17 — M12.5 #6 + #18: speech bubbles + player-approach (unified via a `say` effect) → M12.5 complete
**What:** Built the two together on a shared primitive. **Speech-bubble system** (`engine/bubble.ts`) — world-space rounded panels with a typewriter `Text` that **follow a character** each frame, one per actor id, living in the camera-tracked world layer (so they pan/zoom with the scene). A new **`say` effect** `{ kind:'say', text, target?, ms? }` shows a bubble over an actor — reusable from triggers / dialogue / vision / rules. **#6 Ambient monologues** — `NpcDef.monologues?: Monologue[]` (`{ text, after?, every?, when? }`): a per-NPC driver shows the first monologue whose `when` passes after `after` ms, repeating every `every` ms (a flag swaps the line). **#18 Player-approach** — `VisionConfig.approach?`: on detection the NPC **walks to the player first**, then runs its `effects` — so it spots you, comes over, and speaks (a `say`). Editor: `say` added to the effect picker (text + target); a **Monologues** list (`MonologueList`) + an **approach** checkbox in the NPC modal. Demo on **street**: the stranger mutters ambiently (line swaps once you've met him); the guard now approaches + says "Hey! You there — stop!" on spotting you.
**Why:** M12.5 #6 + #18. Combined (the user's call) because the bubble is the shared piece — #18 alone would only set a flag, but with `say` it becomes the readable "noticed → approach → speak" beat. One primitive, both features.
**How:** the bubble layer is a `Container` in `world` (zIndex 500, above the bands), positioned at the character's feet (`displayObject.x/y`) minus a fixed head offset each frame; the typewriter mirrors the dialogue box's reveal. `say` is handled in the scene's `run` (next to `startDialog`/`startSequence`) since it needs the bubble system + actor registry; it's a no-op in `applyEffects` (engine effect). Monologues + bubble `update` tick in the main `onTick` **unconditionally** (visual only, so they show in the editor preview too); monologues are suppressed while a dialogue is active. Approach reuses `Character.setTarget(playerX, playerY, () => run(effects))`. `monologues` edits are structural (re-mount) so the preview shows them; `say`/approach run in-game.
**Verified:** typecheck + lint + build green; new files (`bubble` / `MonologueList`) Prettier-clean; an ad-hoc tsx test of the monologue active-resolution + repeat timing — 3/3; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: walk near the guard → it approaches + a bubble pops; the stranger mutters on a timer, and the line changes after you talk to him.) **→ M12.5 complete (1b/5/14/3/8/7/6/18).**
**Follow-ups:** the bubble head offset is a fixed design-px constant (doesn't scale with the character's depth size); per-line monologue voice / a manual `say` from rules firing engine effects are later. Next: **M13 — open-source packaging**.

### 2026-06-17 — M12.5 #7: spawn points (fixed-shape, assignable character start markers)
**What:** `SceneData.spawnPoints?: SpawnPoint[]` (`{ at: {xFrac,yFrac}, target }`) — a fixed-shape marker that overrides where a character starts in a scene. `target` is `'player'`, a cast NPC id, or `'all'`. Runtime (`scene.ts`): a `spawnAt(id)` resolver (specific id wins over `'all'`) seeds the player + each NPC at its point instead of the scene `spawn` / placement `spawn`. Editor: a Scene-tab **Spawn points** section (`SceneSpawns`) — **+ Spawn point** / **Place** (click the preview) / a **who** picker (player / all / each NPC) — plus a `SpawnOverlay` (a ◎ dot + the target label, the selected one highlighted), wired like the light/emitter placement (a `'spawn'` draw mode + `selectedSpawn` + `placeSpawn`). Store actions `addSpawnPoint` / `removeSpawnPoint` / `setSpawnPoint` / `setSpawnPointPos` (all re-mount so the preview repositions). Demo: the street places the player at the right side (xFrac 0.72) instead of the default 0.42.
**Why:** M12.5 #7 — a clean, repositionable way to say "this character starts here", generalising the single `SceneData.spawn` (player) + per-placement `spawn` (NPC); the shape is fixed (a dot) so it's place-not-draw, like a light.
**How:** spawn points only matter at mount (initial position), so editor edits re-mount the preview (via `patchScene(..., true)`) to show the character at the new point — there's no per-frame reposition to live-update. Resolution is specific-id → `'all'` → default, so one `'all'` point can gather everyone while a named point peels one character off. The overlay mirrors `EmitterOverlay` (markers + a place-mode click-catcher), the section mirrors `SceneEmitters`.
**Verified:** typecheck + lint + build green; new files (`SceneSpawns` / `SpawnOverlay`) Prettier-clean; an ad-hoc tsx test of the `spawnAt` resolution (specific over all, fallback, empty) — 5/5; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: street → the player starts on the right; `/?edit` → Scene → Spawn points → + Spawn point → Place → click, set **who**.)
**Follow-ups:** spawn points override the *initial* position only (not re-applied on `moveNpc` into the scene — that uses the placement spawn); a drag-to-move (vs click-Place) could be added later. Remaining M12.5: #6 monologues, #18 player-approach.

### 2026-06-17 — M12.5 #3 + #8: conditional character appearance + animated scene layers
**What:** **#8 Animated scene layers** — a new `LayerData` `animated` kind (atlas grid → a looping `AnimatedSprite`): `{ src, frameWidth, frameHeight, columns, frames, fps?, + image-layer placement (band/parallax/fit/xFrac/yFrac/anchorYFrac/role/when) }`. `buildLayer` slices the atlas + plays it; `fitImageSprite` generalised to any Sprite; animated layers are draggable + `when`-gated like images (so a flag swaps a static **or** animated asset). Editor: a **+ Animated** upload in the Layers panel + per-layer frame-grid inputs (w/h/cols/frames/fps). **#3 Conditional character appearance** — `GameDoc.playerViews?` + `NpcDef.views?` (`CharacterAppearance[] = { when?, view }`); the first variant whose `when` passes renders instead of the base view, **swapped live at runtime**. `Character.setView` re-parents a fresh sprite view in place (position/facing/state preserved); the mounted scene tracks each actor's resolved variant and rebuilds only on change (async `createSpriteView`, dropped if torn / superseded). Editor: a reusable `AppearanceList` (ConditionEditor + the existing `CharacterEditor` per variant) in the Characters tab (player) + the NPC modal. Demos on **street**: a blinking lamp-glow animated layer; the player swaps to a bright figure when the `night` flag is set (toggle it in the World window).
**Why:** M12.5 #8 (animated backgrounds/props + flag-swap of animated assets) and #3 (a character changes its whole look by state — the "step into darkness → different assets" / "just eyes" idea, which a fixed-at-mount view couldn't do).
**How:** the appearance swap reuses the existing store-subscription pass (`refreshVisibility` → `refreshAppearances`): an `appearances[]` of `{ id, char, base, variants }` with a per-actor resolved-index map seeded to `-1` (base), so a base-active mount never rebuilds; only an index change triggers `createSpriteView` + `char.setView`. `playerViews` rides into `mountScene` via `SceneOptions` (both callers pass `doc.playerViews`); NPC `views` come from the cast (`NpcDef`). `CharacterAppearance` / the `animated` layer forward-reference schema types (declared later) — fine for type decls. Editor: `setPlayerViews` + `patchNpcDef({views})` bump `revision` (structural → re-mount so new variant *content* shows; the flag-driven swap itself is live). Demo atlases are inline SVG data-URLs (no art needed): a 4-frame glow strip + a one-frame figure.
**Verified:** typecheck + lint + build green; new file (`AppearanceList`) + edited `LayerList` / `ItemCatalogue` Prettier-clean; `game.json` valid (animated street layer + `playerViews`); dev smoke `/` + `/?edit` 200. (Visual: street shows a pulsing glow; `/?edit` → World → set `night` → the player swaps to the red figure and back when cleared; Scene → Layers → + Animated to add one.)
**Follow-ups:** the variant's atlas has only an `idle` clip in the demo (walking falls back to idle); real use uploads a full alternate view. Remaining M12.5: #6 monologues, #7 spawn points, #18 player-approach.

### 2026-06-17 — M12.5 #1b + #5 + #14: conditional examine, inventory item actions, dialogue skip
**What:** Three V1 quick wins in one commit. **#1b Conditional examine** — `ItemDef.examineWhen?: ExamineLine[]` (`{ when?, text }`, first match wins over the base `examine`); `systems/examine.ts` `resolveExamine`; the inventory shows the state-dependent line. **#5 Inventory item actions** — `ItemDef.use?: ItemUse[]` (`{ when?, effects?, dialog? }`); clicking an item runs the first matching `use` (effects + optional `startDialog`) **instead of** selecting; items without `use` keep the select/combine flow. Dispatched through the mounted scene via a new `engine/item-action.ts` bridge (`itemAction.run`, set by `mountScene`, cleared on teardown — like `sceneHit`) so `startDialog` + engine effects work from the DOM inventory. **#14 Skip dialogue** — a Skip ⏭ button (top-right of the dialogue box) → `dialogueStore.end()` (beyond the existing per-line typewriter complete-on-click). Editor: `ItemCatalogue` gained per-item conditional-examine + on-click-action editors (reuse `ConditionEditor` + `EffectList` + a dialog picker; `setItemExamineWhen` / `setItemUse` store actions). Demo: the `gem` reads differently once `machine-ready`, and clicking it sets `gem-handled`.
**Why:** M12.5 cheap wins — the mechanics already existed (examine text, the effect/dialogue runtime, `dialogueStore.end`), so these were mostly wiring + small schema. #1b makes inspect text reactive; #5 turns inventory items into actors (item-driven conversations / flags); #14 lets players bail out of a conversation.
**How:** examine + use resolve against the live story state (`checkCondition`). The **item-action bridge** is the one structural piece: the inventory is DOM and can't reach the scene's effect dispatch (actor registry, `startDialog`), so the mounted scene publishes its `run` through a module singleton (the same pattern as `sceneHit` / `routineArrival` / `cameraOffset`); no scene mounted → no-op. `ItemDef` forward-references `Effect` / `Condition` / `DialogId` (declared later in `schema.ts`) — fine for type decls. Scope note: conditional examine is **items-only** for now (the user's ask) — world-object / inspect conditional examine is a quick follow-up.
**Verified:** typecheck + lint + build green; new files Prettier-clean; an ad-hoc tsx test of `resolveExamine` (base vs conditional, no-when-always-wins, undefined) — 5/5; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: in-game open the inventory → clicking the gem says its line + sets `gem-handled`; flip `machine-ready` in the World window → the gem's examine changes; in any conversation the Skip button ends it.)
**Follow-ups:** conditional examine for world objects / inspect interactables; remaining M12.5 — #3 conditional character appearance, #6 monologues, #7 spawn points, #8 animated layers, #18 player-approach.

### 2026-06-17 — Planning: triage the user's idea backlog → new M12.5 (V1 polish) + V2 additions
**What:** Docs only (`agent_docs/roadmap.md`). Went through the user's ~20 end-of-dev ideas, checked each against shipped code, and recorded the triage. Added a new **M12.5 — V1 polish** milestone (before M13) with 8 items the user chose for V1: **1b** conditional examine, **5** inventory-item dialogs/effects, **14** skip dialogue, **18** player-approach detection (extends NPC vision), **6** NPC monologues (world-space speech bubbles), **7** spawn points (fixed-shape, assignable areas), **8** animated scene layers + conditional swap, and **3** conditional character appearance (player + NPC view variants by `when`). Pushed the rest to **V2**: global animation library (#10), UI chrome theming (#19), checkpoints (#13), highlight usable objects (#15), map + fast travel (#16), journal (#17), cutscene preview (#20).
**Why:** the user parked these during the 3-day build to avoid bloating the roadmap; with only M13 left it was time to triage — what's already done, what's a cheap win, what's V2.
**How (key findings):** **already done / free today** — #1 inventory examine (`ItemDef.examine` → `Inventory.tsx` `say`), #2 lights by flag (`LightSource.when`), #4 conditional asset swap (image layers already have `when` → two gated layers), #12 death screen + load (M11 `gameOver` → Retry = `loadGame()`). **Correction on #3:** a character's view is **fixed at mount** (`createSpriteView(playerView)` runs once; no conditional view) — so swapping the *player's own* assets by flag is a **new** feature, folded into M12.5 (#3) rather than "already possible"; the "just eyes in the dark" *ambiance* is separately a content technique (dark area + eyes sprite, no code). #18 is partly done (vision already fires arbitrary effects incl. `startDialog`) — only the walk-to-player is new. No code changed.
**Follow-ups:** decide M12.5 vs M13 ordering; then implement M12.5 (schema-first each). The "already done" four need no work.

### 2026-06-17 — Roadmap audit: reconcile stale checkboxes (everything to M12 done; 2 V2 deferrals)
**What:** Docs only (`agent_docs/roadmap.md`). Went through the roadmap to confirm everything up to M13 is done and ticked **6 boxes** that were complete but left unchecked (parent / redirect items): M1 stealth (→ done in M7 step 5), M7 2b "NPC current scene = runtime state" (→ done in 6a), M10 compositing order (→ `atmosphere.ts` slot stack), ME.1 (all sub-steps were `[x]`), ME.2 (a+b done, c via ME.6), ME.2c "retire fixed panel" (→ deleted in ME.6.3). Reworded the M10 "Performance + quality" note to show the runtime particle **budget shipped** while the quality / reduced-motion **toggle UI** is **V2**.
**Why:** the user asked to verify all is done bar M13. The audit found no oversight — only stale checkboxes + two **intentional V2 deferrals** (the quality/reduced-motion UI and i18n, both agreed during M11 scoping). Keeping the roadmap honest so M13 starts from an accurate picture.
**How:** grepped `- [ ]` between M0 and M13, traced each against shipped code / commits, ticked the genuinely-done ones with a "_(Done: …)_" note pointing at where, and left only the two V2 items unchecked (each clearly marked → V2). No code touched.
**Follow-ups:** **M13 — open-source packaging** is next (pnpm workspace split `@scope/engine` + `@scope/editor`, publish the `GameDoc` schema as the public API, README / MIT / scaffolder, CI + npm publish). V2 backlog: quality/reduced-motion settings UI, i18n, richer settings, full persistent world sim.

### 2026-06-17 — M12c: time scheduler (game clock + time-gated routine transitions) → M12 complete
**What:** A **game clock** — a time-of-day that advances over real time — plus routine transitions that can gate on a **time window**. Schema: `GameDoc.clock?: ClockConfig` (`dayLengthSec`, `startMinutes?`) + `RoutineEdge.fromTime?` / `toTime?` (minutes past midnight). Runtime: `StoryState.clockMinutes` (+ `setClock`), seeded in `freshState` when a clock is configured; a clock ticker in `createSceneHost` advances it and writes the store **only when the integer minute changes** (coarse, not per-frame). `routine.ts` gained `inTimeWindow(now, from, to)` and `nextRoutineNode` now also requires the edge's time window to contain `state.clockMinutes`. Editor (all in the new **Game logic** tab, **above Rules**): a **Clock** section (`ClockEditor` — enable + day length + start time) and, in the NPC routine edge panel, **from/to time** inputs; the **World** window gets a live **time scrubber** when a clock exists. Shared `editor/time-format.ts` (`minutesToHHMM` / `hhmmToMinutes`). Demo: `content/game.json` clock (day = 120 s, start 08:00) + the guard only heads to the room **08:00–18:00** (`fromTime 480 / toTime 1080` on `patrol → go-door`).
**Why:** M12c — the optional time-scheduler piece deferred from M7 step 6. Routines could only advance by elapsed `after` ms; now a station can be entered by **time-of-day** (a guard patrols by day, rests at night), the natural "schedule" axis. Authored in the global Game logic tab since the clock is game-wide.
**How:** time-of-day lives in the **story store** (`clockMinutes`) so it persists in saves and a future `timeOfDay` condition / a HUD clock can read it — but the clock keeps a runtime float and only writes the store on a minute boundary (≤ ~12 writes/s at the fast demo speed; 1/s at real-time), so it doesn't violate "no per-frame state in the store". The ticker **resyncs** its float to an external change (the World scrubber, or `reset`) by comparing the store value to the last value it wrote, so scrubbing/reset isn't fought. `inTimeWindow` is inert when no clock runs (`now` undefined) or no window is set, and **wraps past midnight** when `from > to` (e.g. 22:00–06:00). New positional `clock` param on `createSceneHost` (after `rules`, before `options`); both callers pass `doc.clock`.
**Verified:** typecheck + lint + build green; new files Prettier-clean; an ad-hoc tsx test of `inTimeWindow` + `nextRoutineNode` time-gating (windows incl. midnight wrap, open bounds, no-clock pass-through, edge fires/blocks by time) — logic confirmed; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → Game logic → Clock on; open the **World** window → drag **time** and watch the guard stop visiting the room outside 08:00–18:00.)
**Follow-ups (M12 done):** a general `timeOfDay` **condition** (rules/gates react to time — trivial now that `clockMinutes` is in the store), an in-game HUD clock, and a dagre auto-layout for the M12b graph. Next milestone: **M13 — open-source packaging**.

### 2026-06-17 — New "Game logic" tab + M12b: auto-generated logic-overview graph
**What:** (1) **Tab restructure** — pulled the M12a **Rules** editor out of the Project tab into a new top-level **Game logic** tab (`TABS` + `TAB_LABEL`, so it gets its own launcher window too). (2) **M12b** — the **logic-overview graph** in that same tab: an auto-generated, **read-only** React Flow view of the **flag web**. New `editor/logic-scan.ts` (`scanLogic(doc)`) walks the whole doc for everything that touches a flag — rules, interactables / triggers / exits, scene `onEnter` + gated visuals (weather / lights / emitters / layers / lightning `when`), NPC placements, dialogue trees, cutscenes, NPC vision / dialog-gate / routine — tagging each **element** with the flags it **reads** (a `Condition`) and **writes** (a `setFlag`). New `editor/LogicGraph.tsx` lays it out bipartite: element nodes (left, border-coloured per kind) ↔ flag nodes (right, ⚑ pills), a **green** arrow element→flag (sets) + an **amber** dashed arrow flag→element (gated on). Live (re-scans on every doc edit); drag is exploration-only (not persisted). CSS `.logic-graph*`.
**Why:** the user wanted the rules + the graph together under their own tab (not buried in Project). M12b is the "see the whole flag web" overview — which object sets a flag and what reacts to it — derived purely by scanning the doc (no new authoring surface).
**How:** `scanLogic` is pure (a `Condition` flag-walker + a `setFlag` collector over every effect/condition site in the schema), so it's cheap to recompute each render and has no engine coupling — editor-only. The graph mirrors the routine editor's React Flow setup (provider + `useNodesState`/`useEdgesState`, `colorMode="dark"`, `fitView`), but is read-only (`nodesConnectable={false}`, `deleteKeyCode={null}`). React Flow stays in the already-split **Editor** chunk (whole editor is lazy behind `?edit`), so the player bundle is unaffected (verified: `index` chunk unchanged, graph code in `Editor-*.js`).
**Verified:** typecheck + lint + build green; new files Prettier-clean; an ad-hoc tsx run of `scanLogic` on `content/game.json` → **10 flags / 11 elements**, all edges sensible (rule machine-ready → flag; guard vision writes `spotted` / reads `hidden`; dialog writes `met-stranger` + `stranger-leaving`; cutscene writes `saw-intro`; gated visuals read `picked:*`); dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → **Game logic** tab → Rules section + the live flag-web graph.)
**Follow-ups:** M12b could grow item/scene nodes (the graph is flags-only today); rules firing **engine** effects (M12a follow-up); **M12c** time scheduler. Optional: an auto-layout (dagre) instead of the simple two-column stack.

### 2026-06-17 — M12a: global rules engine (game-wide reactive rules)
**What:** The cross-cutting "event graph" that orchestrates logic / NPCs without attaching it to one object. Schema: `GameDoc.rules?: GameRule[]` (`GameRule = { id?, when: Condition, then: Effect[], once? }`). Runtime: new `systems/rules.ts` `createRulesRunner(rules, store)` — created in `createSceneHost` (after the routine runner, before the first mount); it **subscribes to the story store** and on every state change evaluates each rule's `when` (`checkCondition`) and runs its `then` (`store.run`), to a **fixpoint** (a rule's effects can satisfy another). `once` rules fire at most once (tracked in a Set). Editor: a Project **Rules** section (`editor/RulesEditor.tsx`) reusing `ConditionEditor` (when) + `EffectList` (then) + an `once` checkbox + optional id; store action `setRules` (patchDoc, no revision bump — runtime logic, not the Pixi scene). Demo: a `once` rule in `content/game.json` (have `crank` **and** `gem` → `setFlag machine-ready`).
**Why:** M12a — the **game-wide** layer above M7's per-NPC routines. Per-object logic stays local (interactables / triggers / dialogue); the global, object-less orchestration (e.g. `hasItem k1 & k2 & k3` → `setFlag gate-open` → `moveNpc guard away`) is a thin reactive rules pass over the shared flag / condition / effect vocabulary.
**How:**
- **Fixpoint + loop guard.** Each evaluation runs a full pass of all eligible rules, then repeats until a cheap **state signature** (`currentScene` + flags + inventory + visited + npcScene + npcNode + screen) stops changing — so an always-true idempotent rule (`setFlag X` while it's already X) settles in one pass instead of burning hops, while a genuine chain (a→b→c) resolves in a single evaluation. Capped at `MAX_HOPS = 32` (mirrors the routine runner) so a flip-flopping cycle can't hang.
- **Re-entrancy guard.** A rule's `store.run` mutates state → fires our own subscription. A `running` flag makes that nested call a no-op; the outer pass loop does the work. Clean unsubscribe on host `destroy()`.
- **Scope = state effects only** (`setFlag / giveItem / takeItem / goTo / moveNpc / despawnNpc / gameOver / endGame` — all handled by `applyEffects`/`store.run`). Engine effects (startSequence / playSound / playAnim) are inert in the pure evaluator → **follow-up** (they need the mounted scene's dispatch). `EffectList` still offers them; they're simply no-ops in a rule for now.
- **Wiring.** New positional `rules` param on `createSceneHost` (before `options`); both callers pass `gameDoc.rules` / `d.rules` (GameCanvas + the editor's live ScenePreview), so the editor preview runs rules for free.
**Verified:** typecheck + lint + build green; new files Prettier-clean; an ad-hoc tsx Node test of the runner — **9 checks** (chain→fixpoint, startup seeding, `once` fires once, loop-guard returns fast, empty = no-op) all pass; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → Project → Rules → add a rule; in the live world give the items via the **World** window and watch `machine-ready` flip.)
**Follow-ups:** rules firing **engine** effects (route through the mounted scene's `run`); persist `once`-fired across saves (today the Set is runtime-only, so a loaded save could re-fire a `once` rule — matches the routine runner's non-persisted `arrived`). Next: **M12b** (auto-generated read-only logic-overview graph), **M12c** (time scheduler).

### 2026-06-17 — Planning: M12 broken into a/b/c — next up M12a (global rules engine)
**What:** Docs only (no code). Agreed the M12 breakdown with the user (see roadmap M12): **M12a** global rules engine ⭐ (do first), **M12b** auto-generated logic-overview graph (React Flow), **M12c** optional time scheduler. Context was near full → noting the plan so the next session resumes M12a cleanly.
**M12a plan (build this next):**
- **Schema:** `GameDoc.rules?: GameRule[]`, `GameRule = { id?: string; when: Condition; then: Effect[]; once?: boolean }`. (Add near `initialFlags` in `GameDoc`, ~schema.ts line 834.)
- **Runtime:** a global rules runner created in **`createSceneHost`** (engine/scene.ts, next to `createRoutineRunner` ~line 1197) — **subscribe to the story `store`**; on each change, evaluate every rule's `when` via `checkCondition`; if true (and, for `once`, not already fired) run `then` via `store.run(then)`. **Loop guard:** re-evaluate to a fixpoint with a hop cap (mirror the routine runner's `MAX_HOPS = 32`) since a rule's effects change state → re-trigger. Track fired `once` rules in a Set. Unsubscribe on host `destroy()`. Editor live preview (ScenePreview → createSceneHost) gets it for free.
- **Effect scope:** `then` = **state** effects only for now (setFlag / giveItem / takeItem / goTo / moveNpc / despawnNpc / gameOver / endGame — all handled by `applyEffects`/`store.run`). Engine effects (startSequence / playSound / playAnim) are inert in `applyEffects` (the scene dispatches them) → **follow-up** (would need to route through the mounted scene's `run`).
- **Editor:** a **Project → Rules** section (new `editor/RulesEditor.tsx`): list of rules, each with `ConditionEditor` (when) + `EffectList` (then) + an `once` checkbox; store action `setRules` (patchDoc, no revision bump — it's runtime logic, not the Pixi scene). Reuse the patterns from `ScreensEditor` / `EffectList`.
- **Verify:** typecheck + lint + build + dev smoke; a small Node test of the rules runner (mock store + a rule chain reaching a fixpoint, like the routine test). Demo: a rule in `content/game.json` (e.g. when the player has the key → setFlag something).
**Why:** the "game-wide event graph that orchestrates NPCs together" (vs M7's per-NPC routines), keeping per-object logic local — the global layer is a thin reactive rules pass.
**Follow-ups:** M12b graph, M12c scheduler, and rules firing engine effects.

### 2026-06-17 — M11 4b: Screens editor (Project) — author the game screens
**What:** The authoring side of the M11 game screens. New `editor/ScreensEditor.tsx` in the **Project → Screens** section: each screen (loading / title / game-over / end / credits) has an **enable** toggle and fields. Reusable pieces: **`ImageField`** (upload → data-URL, with the SVG-mime fix), **`BgFields`** (a colour + an image, image wins), **`TextFields`** (text / colour / size / align, + scroll speed for credits), and **`ButtonFields`** (a title button's **text** label or uploaded **image**). Title also gets logo / heading (text + colour + size) / tagline / button colour + size. Store action `setScreens` (patchDoc). CSS: `.screens-editor` / `.screens-thumb`.
**Why:** M11 4b — make 4a's screens authorable no-code. Backgrounds + logos + button images upload like cursors / layers (data-URLs in the doc); a note points the author to the `gameOver` / `endGame` effects for triggering, and that the final logo is fixed.
**How:** all fields immutably patch `doc.screens` through one `setScreens`; enabling a screen seeds a sensible default, disabling sets it `undefined`. No `revision` bump (screens are DOM, not the Pixi scene) — they show in **▶ Test in game**. Reused `Slider` + the editor form classes; images are data-URLs (consistent with the rest of the doc).
**Verified:** typecheck + lint + build green; `ScreensEditor.tsx` Prettier-clean; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → Project → Screens → enable + tune any screen, upload a logo/bg, set a title button to image → ▶ Test in game.)
**Follow-ups:** M11 done bar V2 (i18n; richer settings). A configurable Final image + real loading-progress % are later. Next milestones: M12 (story/logic graph), M13 (packaging).

### 2026-06-17 — M11 4a: game screens (runtime + flow) — loading / title / game-over / end / credits / final
**What:** The full-screen game-screen system, runtime side. `GameDoc.screens` (`ScreensConfig`): **loading** (bg + logo + progress bar), **title** (bg / logo / styled heading + tagline / buttons that are styled **text** or click-through **image**), **gameOver** + **end** (styled text screen), **credits** (formatted scrolling text). New components in `ui/GameScreens.tsx` + a rewritten `ui/TitleScreen.tsx`; a shared `screenBg` helper (`ui/screen-bg.ts`). `App` became a **phase state machine** — `loading` (first visit only) → `title` → `playing`, and from playing: `gameOver` effect → **gameover** (Retry = last save / Title) or `endGame` effect → **end** → **credits** → **final** → title. Two new **effects** `{ kind: 'gameOver' | 'endGame' }` (wired through `applyEffects` → `StoryState.screen`, which `App` watches via a store subscription, then clears via `setScreen`); both added to the editor's effect picker. **Final** screen is a hardcoded "made with pixin" placeholder (replaced by a real `<img>` at release — not editable). Demo: a `screens` config in `content/game.json`.
**Why:** M11 — the user's screens spec (loading first-visit-only, title with image/text buttons, game-over/end text screens, scrolling credits, a fixed creator-logo final).
**How:** the loading screen shows **only on the first visit** — `App` gates it on a `localStorage` flag (`pixin-loaded`; functionally a cookie, no server) set when it finishes; min 5 s (demo 2.5 s) + a progress bar (timed for now — a real per-asset preload % is a follow-up once there's an asset manifest). Credits scroll via an imperative `transform` (rAF), ending on scroll-past or Skip. The Pixi world only mounts in `playing`, so a screen tears it down. Effects are state-only (`screen` request) so the engine stays UI-agnostic.
**Verified:** typecheck + lint + build green; new files Prettier-clean; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: first load shows the loading bar → title "A Tiny Night"; add a `gameOver`/`endGame` effect to an interactable/dialogue in `/?edit` → ▶ Test in game to see the game-over / end → credits → final flow.)
**Follow-ups:** **4b** — the editor **Screens** authoring section (Project): image uploads + text/colour/size/align fields + per-button mode/image. Real loading-progress %, and a configurable Final image, later.

### 2026-06-17 — M11: simple settings (text size + volume) + a Project font picker
**What:** (1) **Settings** — a new in-game **Settings** view in the menu with two sliders: **text size** and **master volume**. `state/settings.ts` persists them (localStorage, per device — not in the GameDoc) and `applySettings()` (called on game boot in `App`) applies them: text size as a `--ui-scale` CSS var the game text multiplies by (`calc(<px> * var(--ui-scale,1))` on dialogue / choices / narration / inventory labels), volume via a new `audio.setMasterVolume` (Howler global gain). (2) **Font picker** — `GameDoc.font` (a CSS font stack) picked in the **Project** tab from a curated list (`FONT_CHOICES`); applied to the game shell + title via a `--game-font` var (`.app-root` / `.title` use `font-family: var(--game-font, inherit)`). Kept deliberately small per the user.
**Why:** M11 — the user wanted minimal settings (just text size + volume) and a doc-level font, no general UI-text editing (inventory shows item names, dialogue shows NPC names — nothing else needs it). i18n + richer settings (music/SFX split, quality, fullscreen) were moved to **V2**.
**How:** settings live outside the doc (player/device prefs); the font lives in the doc (a game-presentation choice). The font only shows in the actual game / ▶ Test in game (the editor's own chrome keeps its font); the editor preview's Pixi world has no DOM game-UI to restyle.
**Verified:** typecheck + lint + build green; `settings.ts` Prettier-clean; dev smoke `/` + `/?edit` 200. (Visual: in-game ☰ Menu → Settings → text size scales the dialogue/inventory, volume affects audio; `/?edit` → Project → font → ▶ Test in game shows the new font.)
**Follow-ups:** **M11 game screens** (loading / title / game-over / end / credits / final) — the bigger piece, planned next. i18n + richer settings in V2.

### 2026-06-17 — M10 10d: colour grade + vignette + lightning/thunder
**What:** The mood/polish pass. (1) **Colour grade** — `SceneData.colorGrade` (`ColorGrade`: brightness / contrast / saturation / hue) → a `ColorMatrixFilter` on the scene art (`world`); `engine/colorgrade.ts` maps the `1 = normal` config to the filter's native deltas. (2) **Vignette** — `SceneData.vignette` (intensity / size / colour): `engine/vignette.ts` stretches a radial-gradient sprite over the viewport in the `screenFx` slot. (3) **Lightning + thunder** — `SceneData.lightning` (`LightningConfig`): `engine/lightning.ts` flashes a screen-space colour rect on a random `minGap..maxGap` interval, gated by `when`, and fires an optional **thunder** `SoundId` a beat later (muted in the editor). All three are live (in the `applyLive` atmosphere hash + rebuilds: `buildColorGrade` / `buildVignette` / `buildLightning`). Editor: one **Grade & FX** Scene-tab section (`SceneGrade`) with enable checkboxes + sliders + thunder `SoundSelect` + a `when` editor; store actions `setSceneColorGrade` / `setSceneVignette` / `setSceneLightning`. Demo: a cool moody grade + vignette on the **room**; lightning + a faint vignette on the rainy **street**.
**Why:** M10 10d (vignette + lightning) and the per-scene colour grade — the final atmosphere beats.
**How:** grade is a `world` filter (grades the art; the screen-space lighting / weather / vignette / lightning composite over it). Vignette + lightning live in `screenFx` (z 100, over lighting + weather, below the transition wash). Lightning is gated by `when` via `checkCondition` each tick (the World window can set the flag); a single `onUpdate` ticks each (reading the current rebuilt system, like fog). Thunder uses `audioMod.playSoundById` only when not muted.
**Verified:** typecheck + lint + build green; new files Prettier-clean; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: room reads cooler + framed; street flashes every ~6–16 s; `/?edit` → Scene → Grade & FX tunes all three live.)
**Follow-ups:** the perf/quality (particle budget / reduced-motion) **UI** is the only M10 leftover — it lands with the M11 settings screen. Next milestones: M11 (UI theming + settings + i18n), M12, M13.

### 2026-06-17 — Fog: noise seed + 2D drift (parallax X / Y)
**What:** (1) **Seed** — `FogConfig.seed` (a slider, 0–64): the noise texture is now generated from a **seeded RNG** (mulberry32) instead of `Math.random`, so a seed gives a deterministic cloud shape and changing it reshuffles the pattern; textures are cached per seed (`fogTexCache`). (2) **2D drift** — replaced the single `speed` + `parallax` with **`parallaxX` / `parallaxY`** (the back layer's drift velocity in px/sec, either sign), so fog can flow any direction (sideways / up / diagonal); the front layer **leads** for depth (×1.6 speed, ×1.25 size, fixed). The vertical drift is now a real control (was a hard-coded 0.12× the horizontal). Editor: **parallax X ↔ / parallax Y ↕ / seed** sliders (replacing speed/parallax).
**Why:** the author wanted reproducible/varied noise and full control of the fog's drift direction.
**How:** `fogTexture(seed)` keys a `Map<seed, Texture>` (a scene mounts one; the editor reuses it across non-seed edits, regenerating only on seed change). `FogLayer` gained `vy`; the scroll still multiplies by `tileScale` so it's visible at any noise zoom. Front lead is fixed constants (`FRONT_LEAD` / `FRONT_GROW`) — "front auto-leads for depth" per the chosen design.
**Verified:** typecheck + lint + build green; Prettier-clean; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: Scene → Fog → **seed** reshapes the clouds; **parallax X/Y** drift it any direction, the front leading.)
**Follow-ups:** none for fog — M10 remaining: per-scene colour grade, 10d (vignette, lightning + thunder).

### 2026-06-17 — Fog: overall scale % + back layer slottable behind a chosen scene layer
**What:** Two fog follow-ups. (1) **Overall scale** — `FogConfig.scale` (percent, 100 = unchanged) multiplies both `scaleX`/`scaleY` (now the noise **aspect**), so the author zooms the whole noise uniformly while keeping the W/H ratio. (2) **Back behind a layer** — `FogConfig.backLayer?` (index into `SceneData.layers`): the **back** fog slots **inside that layer's band, just behind it** (e.g. behind the buildings, over the sky) instead of being a world overlay at `backZ`. The **front** layer stays a world overlay over everything (so characters still get the haze). Editor: a **scale %** slider + a **back behind** dropdown (the scene's layers, or "— world depth" → the `backZ` slider).
**Why:** the author wanted a master noise zoom on top of W/H, and fog that sits behind specific scenery — which a single world zIndex can't reach within a band (buildings + road are both `background`). A single sprite is at one depth, so "behind buildings *and* over characters" is geometrically two layers: back goes deep, front stays over the scene.
**How:** `createFog` gained a `FogBackInto { parent, index?, zIndex? }`; `mountScene` now tracks `layerDisplays[]` and builds fog **after** the layer loop, computing the back target from `backLayer` — `addChildAt(index)` for non-sorted bands (background/foreground), or a `zIndex` just behind for the sortable mid band. `applyLive`/`buildFog` rebuild is stable: it destroys the old back sprite (the layer returns to its index) before recomputing. Caveat (noted): the back-in-band fog doesn't parallax with its neighbours, so it can drift relative to them when the camera scrolls in-game — add a matching parallax if it bothers.
**Verified:** typecheck + lint + build green; Prettier-clean; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: Scene → Fog → **scale %** zooms the noise at the W/H ratio; **back behind** = a background layer drops the back fog behind it while the front haze still covers characters.)
**Follow-ups:** optional parallax-match for back-in-band fog; the general per-layer world-z model remains a bigger future change.

### 2026-06-17 — Fog polish: one global speed + parallax interpolation + visible scroll fix
**What:** Reworked `FogConfig` per feedback: a single **`speed`** (overall drift) + a **`parallax`** (0..1.5) that **interpolates** the front layer faster + larger than the back (replaced the separate `frontSpeed`; front speed = `speed × (1 + parallax)`, front noise scale = `× (1 + parallax × 0.4)`). **Scroll-visibility fix:** the tile scroll now multiplies by `tileScale`, so the pattern drifts sideways at a consistent on-screen rate **regardless of noise size** — previously a large noise (`scaleX/Y`) made the sideways motion imperceptible (it "morphed" but didn't slide). Kept `scaleX`/`scaleY` (noise W/H) + `backZ`/`frontZ` (depths). Editor: **speed / parallax / noise W / noise H / back ◢ + depth / front ◤ + depth**. Demo updated.
**Why:** the user wanted one master speed with back/front interpolated (same for scale via parallax) and noticed the fog stopped scrolling sideways after the noise W/H change.
**How:** `tilePosition` is texture-space, so a step of `vx` only shifts the magnified pattern `vx / tileScale` on screen — multiplying the increment by `tileScale` restores a `vx` px/sec screen drift at any noise size.
**Verified:** typecheck + lint + build green; Prettier-clean; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: street fog drifts sideways again; Scene → Fog → speed + parallax move both layers, the front leading.)
**Follow-ups:** fog *between* specific background layers still needs a per-layer world-z model (see the layer-model note for the user).

### 2026-06-17 — M10 fog depth/noise/speed controls + emitters made live
**What:** Two follow-ups from testing 10c/emitters. (1) **Fog** got per-layer control: `FogConfig` now has **`scaleX` / `scaleY`** (noise width / height — stretch the cloud texture independently), **`speed` + `frontSpeed`** (the two layers scroll independently — before, the front was hard-coded to 1.7× the back), and **`backZ` / `frontZ`** (each layer's **depth** = a world `zIndex`). `createFog` now adds its sprites **straight into the camera-tracked `world`** at those zIndices (dropped the fixed `fogBack`/`fogFront` atmosphere slots), so the author places fog around the scene bands (background 0 / characters 10 / foreground 20) — e.g. back behind characters (default 8), front over the scene (default 26). Editor: noise W/H + back/front opacity + speed + depth sliders, with a note on the band z-order. (2) **Emitters are now live** — editing one updates the running world immediately (was Test-in-game only). Refactored the emitter mount to a rebuildable set: `buildEmitters()` (destroy + recreate from the current scene), **one** `onUpdate` iterating the live set (no stale per-emitter closures), and `when`-visibility folded into `refreshVisibility`; `applyLive` now includes `sc.emitters` in the atmosphere hash and calls `buildEmitters`.
**Why:** the user wanted to shape the fog noise + place/speed the layers independently, and emitters weren't in the hot-param path (the inconsistency the `applyLive` work fixed for everything else).
**How (fog depth granularity):** the buildings on the street are **background** layers (one container at world zIndex 0), so a world zIndex interleaves fog with the **bands**, not with individual background layers — i.e. fog can sit behind/in front of the background block, characters, or foreground, but not *between* two background layers (that'd need per-layer world zIndices — a bigger layer-model change, noted for later). `createFog` lives in `world` (sortableChildren), so the zIndex sorts it. The emitter rebuild mirrors fog/lighting: a single updater over a mutable array, so a live rebuild can't leave a destroyed system being ticked.
**Verified:** typecheck + lint + build green; new code Prettier-clean; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → Scene → Fog → tune noise W/H, back/front depth + speed live; Emitters → tweak sliders and they update without Test-in-game.)
**Follow-ups:** truly interleaving fog *between* background layers (per-layer world zIndex) if needed. M10 remaining: colour grade, 10d (vignette, lightning).

### 2026-06-17 — M10 10c: animated fog & clouds (noise TilingSprite, back/front split)
**What:** `SceneData.fog` (`FogConfig` — colour, **back** opacity, **front** opacity, scale, speed). New `engine/fog.ts`: a **tileable soft-noise** texture (6 layered integer-frequency sines → seamless soft clumps, biased thin) scrolled as a `TilingSprite`. A **back** layer (behind characters, `fogBack` slot) + an optional **front** layer (over them, `fogFront`) that's larger + faster for a parallax/depth feel. World-space (sized to the design), so it scrolls / scales with the scene. `mountScene` builds it (`buildFog`) + ticks via `atmosphere.onUpdate`; **live-rebuilt** by `applyLive` (added `sc.fog` to the atmosphere hash + a `fogScene` ref). Editor: a Scene-tab **Fog** section (`SceneFog` — enable checkbox + colour + back/front/scale/speed sliders) + `setSceneFog` store action. Demo: light fog on the street.
**Why:** M10 10c — a convincing *fake* (scrolling/warped noise), not volumetrics, using the foundations' back/front split.
**How:** the noise is tileable because each sine uses an **integer** frequency over the canvas, so it wraps seamlessly when the `TilingSprite` repeats it; a smoothstep + threshold biases it into soft clumps (thin most of the frame). The fog sprites are `fogBack`/`fogFront` children (world-space, in `world`), so they ride `world.destroy({children})` on teardown; `buildFog` destroys the old system on a live rebuild. Authored per-scene in the **Scene** tab (not the global Atmosphere tab) for consistency with per-scene weather / lighting.
**Verified:** typecheck + lint + build green; new files Prettier-clean; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: the street has soft drifting fog; `/?edit` → Scene → Fog → tune back/front/scale/speed live.)
**Follow-ups:** M10 remaining — **per-scene colour grade** (ColorMatrixFilter), **10d polish** (vignette, lightning + thunder).

### 2026-06-17 — M10: localized point emitters (smoke / embers / drips)
**What:** Particle sources placed at a **scene point** (not full-screen weather): `SceneData.emitters[]` (`PointEmitter` — position, rate, life, colour/alpha, size+grow, shape, angle+spread, speed+gravity, spawnRadius, blend, `when`). New `engine/emitters.ts` `createEmitterSystem`: a fixed pool of `rate × life` particles (capped by `PARTICLE_BUDGET`) launched from the point, accelerated by gravity (negative = rises like smoke), grown + faded over `life`, recycled. **World-space** via a new `emitters` atmosphere slot (zIndex 22, in `world`, over the foreground) so it stays at the scene point and scrolls with the scene. `mountScene` builds them (gated by `when` through the reactive `conditional` toggle) + ticks via `atmosphere.onUpdate`. Editor: a Scene-tab **Emitters** section (`SceneEmitters` — + / Place / colour / shape / blend / sliders / `when`) + ⛲ preview markers (`EmitterOverlay`) + store actions (`addEmitter` / `removeEmitter` / `setEmitter` / `setEmitterPos`) + a `Draw` `'emitter'` mode. Demo: chimney smoke on the street (`content/game.json`).
**Why:** M10 roadmap item ("localized point emitters, placed like lights") — chimney smoke, a fire's embers, a dripping pipe. Reuses the particle infra (`roundTexture`, the budget) but emits from a point with a lifetime/fade, unlike weather's edge-recycling.
**How:** world-space (vs weather's screen-space) because it's positional — the layer rides the camera-transformed `world`, particles move in design px. `roundTexture` + `ROUND_SIZE` are now exported from `weather.ts`. `when`-gating toggles the emitter's particle-container visibility via the existing `conditional` subscription. The live editor renders it immediately (it runs the real world), so tuning is live.
**Verified:** typecheck + lint + build green; new files Prettier-clean; `game.json` valid; dev smoke `/` + `/?edit` 200. (Visual: street shows smoke rising from the chimney; `/?edit` → Scene → Emitters → + Emitter → Place → tune sliders, it updates live.)
**Follow-ups:** next M10 — **10c fog & clouds** (noise-based, the `fogBack`/`fogFront` slots). Emitter shapes are round/streak (shared with weather); a sprite-textured emitter (real smoke puff) could come later.

### 2026-06-17 — Persistent routines off-scene (B-lite): onArrive by walk-time + mid-path seeding
**What:** Routines now progress **even when the player isn't in the NPC's scene** (a real game bug, not editor-only). Before, an `onArrive` routine edge only fired when that node's scene was mounted and the NPC physically walked the path to its end (`routineArrival.notify`) — so e.g. the guard could **never reach the room** if the player went there before it finished walking to the door; the routine stalled and the path "reset" on return. (`after`-timed edges already worked globally.) Fix (B-lite): (1) the routine runner takes a `pathInfo(npc) → { durationMs, onScene }` resolver and, **off-scene**, completes a `once` path's `onArrive` after the path's estimated walk time (length ÷ speed); on-scene the visual walk still fires arrival (precise). (2) On mount, the scene **seeds** a routine NPC mid-walk at its global progress (`runner.progressOf` → `startNpcPath(startProgress)` seeks along the polyline) instead of restarting from the path start.
**Why:** the world's ambient life (routines / NPC path movement) should be **persistent** regardless of where the player is. The user chose B-lite (1D path progress, persistent routines + mid-path entry) over full headless 2D simulation (logged as a V2 nice-to-have) — B-lite gets the value at a fraction of the cost without splitting `Character` sim from view.
**How:** `createSceneHost` computes `pathInfo` from `scenes` + `designSize` + `WALK_SPEED × cast speed` (+ `node.scene === shownId` for the on/off-scene flag) and passes it to `createRoutineRunner`; it also passes `npcPathProgress: (npc) => routines.progressOf(npc)` into `mountScene` (new internal `SceneOptions` field), used for the seed. `startNpcPath` gained a `startProgress` seek (new `polylineLengthPx` helper). `routineArrival.notify` (on-scene) is unchanged and idempotent with the timer (the `onScene` guard stops the timer firing on-scene, so no early/double transition).
**Verified:** typecheck + lint + build green; a headless Node test (player never on street) shows the guard's node trail `patrol → go-door → in-room@room → go-back → patrol` — it reaches the room and **cycles** off-scene; dev smoke `/` + `/?edit` 200.
**Follow-ups:** **Full B** (V2) — global headless 2D sim of all NPCs (exact off-scene positions) when a feature needs it (minimap / cross-scene perception). Mid-path seeding currently covers `once` paths (patrol pingpong restarts — minor).

### 2026-06-17 — Editor: one `applyLive` hot-param hook + re-mount the structural stragglers
**What:** Closed the "stale until ▶ Test in game" gap (doc edits that silently didn't show in the live preview). (1) **Consolidated the hot-param path** into a single host hook: `SceneHost` / `PreviewScene` lost `refreshAtmosphere` + `setCharacterScale` and gained **`applyLive(patch)`** (`LivePatch = { scene, atmo, cast }`). `mountScene` holds the mount's hashes and, on each `applyLive`, **diffs each hot system and re-applies only what changed** — atmosphere (weather + lighting), character size, and **NPC walk speed** (the new one: `n.character.setSpeedScale(cast[id].speed ?? 1)`). `ScenePreview` now has **one** store subscription that just hands the host the latest `{ scene, atmo, cast }`; the host owns the diffing, so adding a hot param later is one place (the host's `applyLive`). (2) **Re-mount the structural stragglers** so nothing stays silently stale: `setDepthStops` now bumps `revision`, and `patchNpcDef` bumps it **selectively** when the patch touches `view` (sprite) / `routine` (behavior) / `home` (start scene) — vision / dialog / footstep / voice / inspect stay live (overlay / gameplay / audio, no churn).
**Why:** the user noticed NPC **speed** edits only applied after Test-in-game while lighting was live — inconsistent, feels like a bug. The fix is the ME.3/ME.6 policy made complete: every visible prop is **hot** (live setter) **or** **structural** (re-mount), never nothing. Option B (host reads all hot params; editor has one subscription) was chosen over per-property editor hooks (doesn't scale) and over a blanket debounced re-mount (loses the live-in-place feel).
**How:** `applyLive`'s atmosphere branch is hash-gated (a full lightmap RT rebuild), so a speed edit doesn't churn lighting; char size + cast speed are cheap diffs. Initial hashes are seeded from the mount inputs so the first post-mount `applyLive` is a no-op (no redundant rebuild). The game (`createSceneHost` in `GameCanvas`) never calls `applyLive`, so it's unaffected. Depth uses number inputs (discrete) so the re-mount doesn't churn per keystroke much; if it bites, a commit-on-blur is a trivial follow-up.
**Verified:** typecheck + lint + build green; `ScenePreview.tsx` Prettier-clean; no refs to the old method names; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` Characters → an NPC's **speed** updates the live world immediately; **depth** / NPC **appearance** re-mount with a quick fade; lighting/weather/character-size still live.)
**Follow-ups:** this completes the editor migration (ME). Optional: depth → commit-on-blur if the re-mount churn annoys; reset the player's on-screen position (World Reset re-seeds store state only).

### 2026-06-17 — Editor live-world fixes: no auto-cutscenes (routine freeze) + a Freeze toggle
**What:** Two issues from testing the one-world editor. (1) **Guard wouldn't follow its routine** — it just ping-ponged its `patrol` path. Cause: the street's `intro` cutscene **trigger** fired in the editor's live view; the cutscene can't be advanced there (no input), so `sequenceStore.active` stayed true and `isBusy` **froze every NPC routine** (the guard sat on its seeded `patrol` node while the scene ran that path). Fix: gameplay reactions don't run in the editor's live view — gated `checkTriggers()` / `checkVision()` and the scene-`onEnter` effects on `gameplayInput`. Routines now run (guard: patrol 15s → door → room 6s → back); drive other state from the **World** window. (2) **No way to stop wandering NPCs while authoring** (the old Edit/static toggle is gone). Added a **⏸ Freeze / ⏵ Resume** toolbar toggle that stops/starts the live world's Pixi ticker (NPC motion + routines + atmosphere animation freeze) without a re-mount — `ScenePreview` gained a `paused` prop (applied via `appRef`, and at mount via `pausedRef` so a re-mount stays frozen). Edits still apply while frozen (the React tree isn't paused).
**Why:** the editor authors **over** the live world — it should show the base world (no auto-cutscenes hijacking the stage) and let you freeze motion when NPCs get in the way, without resurrecting the static preview (ME.6 kept one world).
**How:** the trigger/vision/onEnter gates mirror the existing `gameplayInput` gating of the stage tap + NPC clicks; the game (`gameplayInput:true`) is unchanged. Freeze = `app.ticker.stop()` (idempotent), Resume = `start()`. Known limitation: while frozen, atmosphere edits don't repaint until you resume (the lightmap renders on the ticker).
**Verified:** typecheck + lint + build green; `ScenePreview.tsx` Prettier-clean; dev smoke `/` + `/?edit` + the editor module all 200. Also audited the editor after the ME.6 refactor: all 8 tabs present in `renderTab` (scene/items/characters/dialogs/sequences/sounds/atmosphere/project) + the World window; launcher = `TABS.map` + World; overlays ride `SceneViewport`; typecheck guarantees every section's component + store action resolves.
**Follow-ups:** reset the player's on-screen position (the World **Reset** re-seeds store state, not per-frame motion).

### 2026-06-17 — ME.6 step 3: one Pixi world — deleted the static preview + the fixed panel
**What:** The irreversible cleanup. Removed **`mountPreview`** + `PreviewOptions` from `engine/scene.ts` (≈146 lines); `ScenePreview` is now **Live-only** — it always mounts `createSceneHost` over the working doc (dropped the Edit branch, the `live` prop, the static placeholder). `Editor` lost the fixed `editor__panel` (tabs + content), the resizer, the in-panel footer, and the Edit/Live + Hide-panel toggles + their state (`tab` / `panelHidden` / `live` / `panelWidth` / `startResize` / `changeTab`); it's now just the **fullscreen live world + the floating launcher** (which already mirrors all tabs via `renderTab` + the World window) and a top-right **Test / Discard** toolbar. Deleted the now-dead CSS (`.editor__panel` / `.editor__tabs` / `.editor__tab*` / `.editor__tab-content` / `.editor__footer*` / `.editor__resizer*` / `.preview__mode`).
**Why:** ME.6 finale — collapse the two Pixi worlds (game + static preview) into **one**. The launcher reached tab parity (ME.2b), live-world layer-drag closed the last gap (ME.6.1), and the fullscreen flow was validated (ME.6.2 + the cursor fix), so the static path could go.
**How:** `makeLayerDraggable` stays (now used by `mountScene`); `PreviewScene` / `PreviewAtmosphere` stay (mountScene's live-refresh interface). Kept the **dev-only gate + lazy-load** (`isEditMode()` + the lazy `Editor` chunk) — the player build still never loads the editor (the engine never imported the editor anyway; this only removed editor-facing engine code). Verified the removal left **zero** references to `mountPreview` / `PreviewOptions`.
**Verified:** typecheck + lint + build green; `ScenePreview.tsx` Prettier-clean; no refs to the deleted symbols; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` is the fullscreen live world + launcher; Test/Discard top-right; everything authored from the floating windows.)
**Follow-ups:** none for ME — **ME.0–ME.6 complete**. Remaining elsewhere: M10 colour grade (ColorMatrixFilter) / 10c fog / 10d polish; the ME.5 pause/reset-player follow-up.

### 2026-06-17 — ME.6 step 2 polish: move the Live toggle into the top-right toolbar
**What:** The Edit/Live toggle sat top-left of the preview and overlapped the launcher's **Scene** entry (also top-left). Moved it into the **top-right preview toolbar** with Hide panel / Test / Discard. Lifted `live` state from `ScenePreview` to `Editor` (passed as a prop); `ScenePreview` is now just the canvas host. Removed the unused `.preview__mode` CSS.
**Why:** the two top-left controls collided (user report).
**How:** `Editor` owns `live`/`setLive` and renders the toggle in `.preview-tools`; `ScenePreview({ scene, live })` keeps its `[live, scene.id]` effect deps, so flipping the prop still re-mounts the world exactly as before.
**Verified:** typecheck + lint + build green; dev smoke `/?edit` 200.

### 2026-06-17 — ME.6 step 2 fix: keep the native cursor in the editor's live view
**What:** `mountScene` set `app.stage.cursor = 'none'` unconditionally; the live editor preview has no DOM `GameCursor` to replace it, so the pointer vanished over the canvas — obvious once the panel is hidden and the canvas fills the pane. Now `app.stage.cursor = gameplayInput ? 'none' : 'default'`, so only the real game (which draws the DOM cursor) hides the native one. (The per-NPC `cursor='none'` was already gated by `gameplayInput`; `.game-canvas canvas { cursor:none }` is game-only, not the editor's `.preview`.)
**Why:** regression from ME.6 step 2 (fullscreen + Live default) — the live world now fills the editor, so its game-only cursor hiding became visible there.
**Verified:** typecheck + build green; dev smoke `/?edit` 200. (Visual: hide the panel → the cursor stays.)

### 2026-06-17 — ME.6 step 2: fullscreen live preview by default + reversible side panel
**What:** The editor preview now **fills the pane** (was a centred scene-aspect box): `.editor__stage--fill` is absolute-inset, the world **letterboxes** inside (mountScene `fit`), and the ME.4 `SceneViewport` keeps overlays aligned. `mountPreview` (the Edit fallback) now **letterboxes too** (min + centre, was height-only fit) so it fills the pane consistently; its lighting camera (`previewCamera`) tracks the new centring offset. The preview **defaults to Live** (the real world). The fixed side panel is now **hideable** via a top-right toolbar toggle, and **Test in game / Discard** moved from the in-panel footer to that toolbar so they're reachable with the panel hidden. Dropped the scene-aspect `stage` measuring; a `ResizeObserver` on the pane dispatches `resize` so Pixi (`resizeTo: host`) re-fits on window resize / panel toggle / panel drag.
**Why:** ME.6 (incremental, user chose reversible-first) — make the **launcher-over-a-fullscreen-live-world** the default experience so it can be validated, while keeping the panel + Edit mode as one-click fallbacks. Nothing is deleted yet (step 3 removes `mountPreview` + the panel after a visual pass).
**How:** fullscreen "just works" for overlays because ME.4 already maps them through the world rect (now actually letterboxed). The panel toggle changes the pane width without a window event, so the pane `ResizeObserver` → `dispatchEvent('resize')` nudges Pixi to re-fit. Reversible: Edit/Live toggle + panel toggle + `mountPreview` all still present.
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200. (Visual to confirm: `/?edit` opens on a fullscreen Live world + launcher; **Hide panel** → launcher-only; **Test/Discard** work from the toolbar; the scene letterboxes when the pane isn't its aspect and overlays stay aligned.)
**Follow-ups:** ME.6 step 3 — delete `mountPreview` + the Edit toggle + the fixed panel once validated.

### 2026-06-17 — ME.6 step 1: layer-drag in the live world (parity with the static preview)
**What:** `mountScene` gained an `onLayerMove` `SceneOption` — free image layers (`fit: none` → xy, `fit: width` → y) are **draggable** in the live world, committing the new fractional position on release (same as the static `mountPreview` already did). `createSceneHost` forwards the option (it already spreads `options`); `ScenePreview`'s Live mode passes it (→ `setLayerPos`). `makeLayerDraggable` gained an optional `onMoveLive(x,y)` so a dragged **parallax** layer's rest base stays in sync — otherwise the `fit` camera's per-frame pin (`pl.display.position.set(baseX, baseY)`) snaps the drag back.
**Why:** ME.6 needs the live world at **parity** before retiring the static preview. Layer positioning was the one thing only Edit mode had (there are no numeric X/Y inputs in `LayerList` — you place free layers by dragging). The user chose to bring the drag into the live world (vs adding numeric inputs).
**How:** the live world's layers sit under a band container inside the camera-scaled `world`, so `display.parent.toLocal(global)` resolves to design space exactly like the preview — `makeLayerDraggable` is reused as-is, plus the parallax-base sync. The layer's own `eventMode='static'` captures the drag, so `gameplayInput:false` (no stage tap) doesn't block it. Additive — the game never passes `onLayerMove`.
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` (Live) → drag a `none`-fit image layer → it moves and sticks, including parallax layers.)
**Follow-ups:** step 2 (fullscreen + Live default) below.

### 2026-06-17 — ME.5: World window — drive the live preview's state (flags / items / scene)
**What:** A launcher-only **World** window (`WorldState`) that drives the **live** preview world: **jump scene** (`goTo`), **set/clear flags** (the doc's known flags — scanned via a `"flag":"…"` pass — as checkboxes, plus an input to add an arbitrary one), **give/take items** (the Items catalogue, showing what's held), and **Reset world**. New `preview-bridge` (a tiny vanilla store) carries the live scene-host's story store from `ScenePreview` (Live mode) to the window; `ScenePreview` publishes it on Live mount and clears it on teardown / in Edit mode. The window writes via the store's `run(effects)` / `reset(doc)`; in Edit mode it shows a hint (no running world).
**Why:** ME.5 — drive the running world to a state to author against, e.g. reveal content gated on a flag/item (the ME.0 "gated lights need their `when` met" follow-up). The live world **already reacts** to its story store (conditional layers / NPCs / lights subscribe; the host swaps on `currentScene`), so this is just exposing + writing that store — no engine changes.
**How:** `WorldState` reads `previewBridge`; if no store (Edit mode) → hint, else `WorldStateControls` binds the live store with `useStore(store, …)` and re-subscribes automatically when the bridge swaps the store (mode flip / scene change → ScenePreview re-mounts → new store or null). Effects go through the existing vocabulary (`setFlag` / `giveItem` / `takeItem` / `goTo`), so the reactions are exactly the game's. Reused form classes (`intr-form__field` / `logic__chk` / `editor__toolbar`) — no new CSS.
**Verified:** typecheck + lint + build green; `WorldState.tsx` / `preview-bridge.ts` Prettier-clean; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → select **room**, **● Live**, open **World** → **Give** the key/flashlight or toggle a flag → the gated light / layer appears; **scene** dropdown jumps the world.)
**Follow-ups:** pause/resume the ticker + reset the player's on-screen position (Reset re-seeds store state, not per-frame motion). Could also feed these into the **Edit** preview's static `StoryState` so gated content shows without Live — but Live already covers it.

### 2026-06-17 — ME.2b: launcher reaches tab parity (Scene / Atmosphere / Project) via one renderTab
**What:** The floating launcher was missing **Scene** and **Project**, and listed atmosphere as **Weather** + a stray **Lighting**/**Document** (review prompted by the user). Fixed to **mirror the fixed panel's 8 tabs one-to-one**: Scene, Items, Characters, Dialogs, Cutscenes, Sounds, **Atmosphere**, Project. Refactor: extracted every tab's JSX into a single `renderTab(t: Tab)` rendered by **both** the fixed `editor__tab-content` and the launcher windows; `floatPanels` is now just `TABS.map(...)` → `renderTab(t)` with `TAB_LABEL[t]`. Removed the earlier per-section duplication (Items/Characters/… were copied into the float registry).
**Why:** the launcher must reach **parity** with the panel before ME.6 can retire the panel; one source per tab keeps them honest (no drift) and means the **Scene** window drives the same `draw` modes → placement/drawing works from a floating window over the (ME.4) overlays.
**How:** `renderTab` closes over all of `Editor`'s state + handlers (it's defined inside the component before `return`), so the Scene window's Walkable/Holes/Hit-area/NPC/light tools toggle the same `draw` state and the overlays (now in `SceneViewport`) react identically whether driven from the panel tab or the window. The fixed panel + a window showing the same tab render two independent copies of the forms (shared store → consistent), an accepted transitional cost until ME.6.
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → launcher now shows all 8; open **Scene** / **Atmosphere** / **Project** windows; Scene window's **Draw** still places points on the preview.)
**Follow-ups:** ME.2c — retire the fixed `editor__panel` once the floating UI is the daily driver (ME.6). The Scene + fixed Scene tab can both be open (duplicate forms) — fine until the panel goes.

### 2026-06-17 — ME.4: overlays mapped via a world-rect wrapper (camera-driven, ME.6-ready)
**What:** New `SceneViewport` wraps all the editor's placement / drawing overlays (Walkable / Holes / Hit-areas / NPC spawn+path / Lights / Dark areas) in a box sized to the scene's on-screen **world rect** — the same `fit` transform the engine camera publishes as `cameraOffset` (one uniform scale + centring). The overlays keep their fractional internals (`left:x%`, `viewBox 0 0 1 1`), so reparenting them under a correctly-sized box keeps them aligned **even when the canvas isn't the scene's aspect** (letterbox), which is what the fullscreen world (ME.6) needs. CSS: `.scene-viewport` (absolute, `pointer-events:none` so the canvas beneath — e.g. Edit-mode layer drag — still gets events; the overlays' own catchers/handles re-enable).
**Why:** ME.4 — stop assuming "the scene fills the box" and map overlays through the camera transform, so ME.6 can swap the design-aspect box for a fullscreen/letterboxed canvas **without rewriting six overlays at once**. The user chose the pure refactor (no preview-fills-pane companion) since ME.6 removes the left panel anyway.
**How:** the editor preview is always a whole-scene `fit` view (no scroll, both Edit `mountPreview` and Live `createSceneHost` use `fit`), so `SceneViewport` derives the rect **deterministically** from the pane size + design (`scale = min(sw/dw, sh/dh)`, centred) via a `ResizeObserver` + `useLayoutEffect` — decoupled from engine frame timing and the fact that `mountPreview` doesn't publish the global `cameraOffset`. (The in-game cursor keeps reading the live singleton, since the game can scroll.) **No visual change today:** the editor keeps the box at the scene's aspect, so `sw/sh == dw/dh` → rect = `{0,0,sw,sh}` = the full stage (proved by the fit math); the wrapper just makes the mapping explicit. A single wrapper is lower-risk than per-overlay coordinate rewrites (no overlay's internal coords change).
**Verified:** typecheck + lint + build green; `SceneViewport.tsx` Prettier-clean; dev smoke `/` + `/?edit` 200. Invisible refactor → no editor_guide change (overlays behave identically). (Visual sanity: `/?edit` → draw walkable / place a light / NPC marker — they sit exactly where before.)
**Follow-ups:** ME.6 makes the canvas fullscreen (box ≠ scene aspect) — then `SceneViewport` letterboxes and the overlays ride it for free. If the editor ever authors over a **scrolling** (`follow`) camera, switch `SceneViewport` to read the live `cameraOffset` on rAF instead of the deterministic fit.

### 2026-06-16 — ME.3: live-update-vs-re-mount policy + character size as a hot tunable
**What:** Pinned down the preview's update policy and closed the clearest re-mount-churn case. **Policy:** *hot* (apply live, no re-mount) = atmosphere (ambient / lights / dark areas / weather / player light) **and character size**; *re-mount* (revision bump) = geometry/structure (scene width, reference height, depth, layer add/remove/move, player sprite, scene add/remove); *overlay-only* (walkable / holes / hit-areas / interactables) = React DOM. New hot param: **character size** — `Character.setCharScale` (mutable `charScale` + re-position), `mountScene`/`mountPreview` expose `setCharacterScale` on `PreviewScene` (rescale the player + all NPCs / the placeholder), `createSceneHost` delegates it on `SceneHost`, and `ScenePreview` diffs `characterScale` separately from the atmosphere hash → applies it live in both Edit and Live modes. `editor-store.setCharacterScale` no longer bumps `revision`; the **characters** slider commits live on `onChange` (dropped the `charDraft` + commit-on-release).
**Why:** ME.3 — sliders should tune in place, not re-mount. Most of this already landed with ME.0/ME.1 (atmosphere); character size was the remaining slider that re-mounted the whole Pixi scene on release **and** showed no feedback during the drag. Now it rescales live as you drag.
**How:** `charScale` rides on top of each actor's depth scale, so the live setter just re-runs `positionView()` (player + every NPC, via the `actors` map). Diffed separately from atmosphere so a size tweak doesn't rebuild the (expensive) lightmap RT. Width keeps its draft + commit-on-release because it changes the design **aspect** (the preview box itself resizes → a re-mount is correct).
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → Scene → drag **characters** — the placeholder/NPCs resize live; toggle **Live** and it holds.) `editor-store.ts` / `Editor.tsx` were already Prettier-dirty at HEAD (pre-existing) — left untouched beyond my edits.
**Follow-ups:** **depth** edits currently neither re-mount nor live-update (apply on next re-mount) — make depth live or bump `revision` when it bites. Remaining M10: colour grade (ColorMatrixFilter), 10c fog, 10d polish.

### 2026-06-16 — ME.2 (step a): floating editor — launcher bar + draggable windows
**What:** First slice of the in-game floating editor. New `FloatingWindow` (a backdrop-less, draggable window — title-bar drag, ✕, raises on click) + `FloatingEditor` (a **launcher bar** top-left of the preview whose entries toggle windows; manages the open stack + z-order; several open at once). Wired into `Editor` over the preview pane, hosting the **standalone global / document sections** — Items, Characters, Dialogs, Cutscenes, Sounds, Weather, Lighting, Document — via a `FloatPanel[]` registry that **reuses the same forms** the fixed-panel tabs render. CSS: `.flaunch*` / `.fwin*`.
**Why:** ME.2 — start moving the editor to a floating multi-window UI over the live world (the user's intended shape), without disturbing the working editor. Kept **coexisting** with the fixed `?edit` panel (the launcher is additive) so there's no regression; the panel is retired only in ME.6.
**How:** the windows float inside `.editor__preview` (already `position: relative`), absolutely positioned and staggered; drag is window-level `pointermove`/`pointerup` so it tracks past the window bounds. Only the **non-scene** sections are floated for now — they're self-contained (read `doc`, write via `editorStore`), so hosting them in a window is zero-coupling. Scene-coupled sections (walkable / holes / hit-areas / layers / NPCs / light placement) stay in the panel until ME.4 moves their overlays onto the live camera. `EditorModal` (centered, modal) is left as-is; `FloatingWindow` is the new non-modal chrome.
**Verified:** typecheck + lint + build green; new files Prettier-clean; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → click launcher entries top-left of the preview → windows open, drag by the title bar, ✕ closes, click raises; same forms as the tabs.)
**Follow-ups:** **ME.2b** — float the scene-coupled sections with ME.4 (overlays → live camera). **ME.2c** — retire the fixed panel at parity (ME.6). Window positions reset on close (local state) — lift into `FloatingEditor` if persistence is wanted. The launcher currently sits over the preview beside the fixed panel; once ME.6 removes the panel it becomes the sole UI over a fullscreen world.

### 2026-06-16 — ME.1 (step 2c): editor preview gains an Edit ⇄ Live toggle (runs the real world)
**What:** `ScenePreview` gained a corner **Edit ⇄ Live** toggle (`▷ Live` / `● Live`). **Edit** (default) is the unchanged static `mountPreview` (placeholder character + draggable layers + overlays). **Live** mounts the **real** `createSceneHost` over the editor's working doc — a dedicated story store (`createStoryStore(doc)`) parked at the selected scene, `{ cameraMode:'fit', gameplayInput:false, muteAudio:true }` — so NPCs walk their routines and the full lighting/weather render in context, with the placement overlays still on top (view-only world). Both modes keep ME.0's live atmosphere refresh (Edit → `preview.refreshAtmosphere`, Live → `host.refreshAtmosphere`, same hash-diffed subscription). Added a `muteAudio` `SceneOption` (gates the ambient/footstep audio import in `mountScene` + the host's teardown audio import) so the live preview makes no sound and doesn't pull the audio chunk. CSS: `.preview__mode`.
**Why:** ME.1 — let the editor show the **real** world (motion + atmosphere in context) without the static preview's blind spots, realising the confirmed **Edit↔Play** workflow. Kept as an **opt-in toggle** (not a wholesale swap) so there's zero regression to layer-drag / placeholder / overlays; retiring the static preview is ME.6.
**How:** the design→box mapping is identical in both modes — the preview box is the scene's **design aspect** (Editor.tsx), so `mountScene`'s `fit` (`min()` + centre) collapses to `mountPreview`'s scale-by-height with a zero offset → the DOM overlays (fractional, full-box) stay aligned. `ScenePreview`'s effect now depends on `[live, scene.id]`; `revision` only bumps on **structural** edits, so atmosphere edits still refresh live without a re-mount. Engine still never imports the editor — the editor drives `createSceneHost` with its own doc + store.
**Verified:** typecheck + lint + build green; `ScenePreview.tsx` Prettier-clean; dev smoke `/` + `/?edit` 200. (Visual: `/?edit` → select **room** → click **▷ Live** — the dark interior + lamp render and the guard walks its routine; toggle back to **Edit** for placement.) Pre-existing repo-wide `format:check` warnings (incl. untouched `lighting.ts`/`weather.ts`) are unrelated.
**Follow-ups:** ME.2 — floating launcher + draggable windows over the live world (the toggle's Live mode becomes the always-on world). ME.4 — migrate the placement overlays to the live `cameraOffset`. The Live preview re-mounts on a mode flip / scene change / structural edit (acceptable); ME.3 defines the live-update-vs-re-mount policy.

### 2026-06-16 — ME.1 (step 2b): createSceneHost exposes refreshAtmosphere (delegates to current scene)
**What:** `createSceneHost` now returns a `refreshAtmosphere(scene, atmo)` on its `SceneHost` that **delegates to the currently mounted scene** (the `PreviewScene` from step 2a) — a no-op while no scene is mounted (mid-swap). `current` is now typed `PreviewScene | undefined` (was `Scene`; `mountScene` already returns the superset). This is the host-level hook the editor will call as the author tunes atmosphere on the **real** game world.
**Why:** ME.1 step — bridges step 2a (scene can rebuild atmosphere) to step 2c (`ScenePreview` mounts `createSceneHost` and drives the live refresh). Keeps the live-tuning capability at the host boundary the editor talks to.
**How:** pure capability add — nothing in the game calls `host.refreshAtmosphere`, so the shipped game is unchanged (the host swaps scenes exactly as before). `SceneHost` gained the method in its interface; the returned object forwards to `current?.refreshAtmosphere`.
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200 (game + current preview identical).
**Follow-ups:** **2c** — `ScenePreview` mounts `createSceneHost(editorStore.doc.scenes, <story store @ selected scene>, …, { cameraMode:'fit', gameplayInput:false })` instead of `mountPreview`, subscribing to the editor store for the live `host.refreshAtmosphere` (replacing ME.0's `preview.refreshAtmosphere`); suppress audio in the editor.

### 2026-06-16 — ME.1 (step 2a): mountScene gains refreshAtmosphere (rebuildable lighting/weather)
**What:** `mountScene` (the game scene) can now **rebuild its weather + lighting live** without a re-mount — `refreshAtmosphere(scene, atmo)` swaps in an edited scene + doc atmosphere defaults and rebuilds only those two systems. Refactored the weather/lighting build to read from mutable refs (`weatherScene` / `weatherPresetsRef` / `lightScene` / `lightDefaults`) + a `buildLighting()` helper; the initial build is byte-for-byte the same. `mountScene` now returns `PreviewScene` (Scene + refreshAtmosphere), like `mountPreview`.
**Why:** ME.1 step — so the editor can drive the **real** game scene live (next step points `ScenePreview` at `createSceneHost`) **without losing ME.0's live atmosphere tuning** (the host's scene will expose this refresh).
**How:** nothing calls `refreshAtmosphere` yet → the game + current editor preview are unchanged; it's a pure capability add. `PreviewScene` is a superset of `Scene`, so `createSceneHost`'s `current: Scene` handling is unaffected.
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200 (game + preview identical).
**Follow-ups:** **2b** — `createSceneHost` exposes the current scene's `refreshAtmosphere`; **2c** — `ScenePreview` mounts `createSceneHost(editorStore.doc, …, { cameraMode:'fit', gameplayInput:false })` + a story store, subscribing for the live refresh.

### 2026-06-16 — ME.1 (step 1): scene camera + input modes (foundation for the live editor)
**What:** Parameterised `mountScene` (+ `createSceneHost`) with a `SceneOptions` bag — `cameraMode` (`follow` = the game's fit-height + scroll-follow-player; `fit` = fit the whole scene centred, no scroll — for the editor's live view so the static overlays' design→box mapping stays linear) and `gameplayInput` (default true; `false` suppresses the stage walk/interact tap **and** the NPC talk clicks, so the editor authors *over* a live world instead of playing it). Defaults preserve the game exactly.
**Why:** ME.1 (reframed) — the editor will run the **real** `createSceneHost` from `editorStore.doc` (not the static `mountPreview`), which needs a whole-scene camera + no gameplay clicks. This is the safe foundational slice (no caller passes the options yet, so nothing changes).
**How:** `cameraMode === 'fit'` → `scale = min(screen/design)`, centred, parallax at rest; `gameplayInput` gates the `pointertap` registration + the NPC click loop. `createSceneHost` threads `options` to `mountScene`.
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200 (defaults → game + the current editor preview unchanged).
**Follow-ups:** next — point `ScenePreview` at `createSceneHost(editorStore.doc, …, { cameraMode:'fit', gameplayInput:false })` + a dedicated story store (keeping ME.0's live-atmosphere refresh).

### 2026-06-16 — ME.0: live atmosphere (weather + lighting) in the editor preview
**What:** First step of the in-game-editor migration — the editor's preview now **shows weather + lighting live** (was a static preview), so the dev sees what they're authoring while tuning sliders (no "Test in game" round-trip). `mountPreview` gained a ticker + `createAtmosphere` + the weather system + `createLighting`, all read from the editor doc, with a `refreshAtmosphere(scene, atmo)` that rebuilds the weather + lightmap. `ScenePreview` passes the doc-level atmosphere (ambientLight / playerLight / weatherPresets) and **subscribes to the editor store**, calling `refreshAtmosphere` when the scene's lighting / weather config (hash-diffed) changes — live, no re-mount. `lighting.ts` `createLighting` gained a **camera** param (the preview passes its own fit transform `{ x:0, y:0, scale }` instead of the game `cameraOffset`).
**Why:** ME.0 (roadmap) — the immediate, no-risk win that unblocks "I need to see the light while setting it up." Also prototypes the live-rebuild mechanism that ME.3 generalises.
**How:** additive to the preview only — the engine still doesn't import the editor; `ScenePreview` (editor) drives the refresh by passing the latest doc config. The reactive rebuild is hash-diffed (lighting/weather fields) so unrelated edits don't churn the RT. Boundary + the separated `?edit` are untouched (this is just a richer preview).
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200. (Visual — select the **room** in the editor: the preview shows the dark interior + lamp; tweak ambient/lights/weather sliders and watch the preview update.)
**Follow-ups:** gated lights / player light need their `when` met to show in the preview (ME.5 adds flag/state controls). Next migration step: **ME.1** (unify the doc + persistence), done in isolation.

### 2026-06-16 — Planning: in-game (live) editor — proposed incremental migration (roadmap "ME")
**What:** Docs only. Added a **proposed** roadmap section **"ME — In-game (live) editor"** (after M10 10b) sketching a move from the separated editor (static `mountPreview` + draft/Test-in-game reload) to a **dev-only panel over the live running world**, so lighting / weather / motion / state are tuned in context with no reload loop. Phased: **ME.0** live atmosphere in the *current* preview (no-risk, unblocks seeing lighting now) · **ME.1** unify the doc + persistence (most sensitive, in isolation) · **ME.2** in-game panel coexisting with `?edit` · **ME.3** live-update tunable systems (re-mount only structural) · **ME.4** migrate placement/drawing overlays to the live camera (`cameraOffset`) one at a time · **ME.5** live-context utilities (jump scene / set flags / give items) · **ME.6** retire the static preview → one Pixi world.
**Why:** the user is weighing whether to merge the editor into the game for better, in-context tuning (the static preview can't show lighting/weather). Captured the analysis so the decision is informed.
**How (risk framing):** low risk to the shipped game (additive, dev-gated, **engine never imports editor** — it only reacts to doc changes; player build identical). Medium-but-dev-only risk to editor functionality during migration (doc/save wiring + camera-mapped overlays). Mitigation: incremental behind the existing `?edit`, reversible at each step, separated path kept until parity.
**Verified:** docs only — no code.
**UI intent (user clarified):** the in-game editor is a **floating multi-window** UI, not a fixed side panel — a small **launcher bar top-left** (dev mode) whose entries open **floating, draggable modal windows** (✕ top-right), several at once, arranged around the live scene. Recorded in ME / ME.2 + memory; reuse/generalise `EditorModal` for the draggable chrome.
**Follow-ups:** user to review/decide. If yes, likely do **ME.0** first regardless (live lighting preview), then ME.1 in isolation. Meanwhile M10 still has colour grade / 10c fog / 10d polish.

### 2026-06-16 — M10 10b (editor): lighting controls + light placement + dark-area drawing — 10b complete
**What:** No-code lighting authoring. **Scene → Lighting** (`SceneLighting`): an **ambient** override (colour + intensity), placed **local lights** (**+ Light** → **Place** → click the preview; per-light **colour / shape (sphere|cone) / radius / intensity / flicker / rotation / width / height / cone° / `when`** — the user-requested shape + deform), and **dark areas** (**+ Dark area** → **Draw** a polygon on the preview + a **feather** slider). **Project → Lighting** (`LightingDefaults`): the document default ambient + the **player light** (sphere/cone, radius, colour, intensity, cone°, `when`). Preview overlay (`LightOverlay`): ☀ light markers + dashed dark-area polygons + click-to-place / click-to-draw. Schema: `LightSource` gained `shape` / `angle` / `rotation` / `scaleX` / `scaleY` (runtime `lighting.ts` `makeLight` renders them — cone texture, ellipse scale, rotation). Editor store + a shared `Slider`. New `Draw` modes `light` / `darkarea`. **Completes M10 10b.**
**Why:** M10 10b editor — author ambient / lights / dark areas / the player light visually, with local lights getting the same shape options as the player light plus deform sliders (per the user's note).
**How:** lights place like an NPC spawn (a `setLightPos` from a preview click); dark areas draw like holes (append polygon points). Lighting only renders in-game (the static preview shows markers/outlines) — a live lighting preview is a follow-up. Store actions are `patchScene` (no remount). `LightSource.shape` reuses `PlayerLightShape`.
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200. (Author in `/?edit` → Scene/Project → Lighting → ▶ Test in game.)
**Follow-ups:** a **live lighting preview** in the editor; **10c fog** + **10d polish** (vignette / lightning+thunder) remain in M10.

### 2026-06-16 — M10 10b fix #2: back to multiply-reveal (additive looked like fog balls)
**What:** The all-additive lights from fix #1 looked bad — colored fog balls that washed the scene out (the user's screenshot). Additive only *adds colour*, it doesn't reveal the scene art, so over a mostly-dark room it's just glowing blobs. Reverted to the **multiply-reveal** look (which read well) but kept the viewport coverage: the **lightmap** (ambient base + additive lights brightening toward white + dark zones) renders to a **viewport-sized** RenderTexture each frame and **multiply**-composites over the scene — lit areas show the art at full, dark hides it (a soft reveal). Local lights additionally get a **faint additive glow** (≤0.28 alpha) so a lamp still emits over black, without the fog-ball wash. Scene-positioned contributors live in camera-tracked groups, so the lightmap fills the whole viewport (incl. pillarbox) while lights track scene coords. The RT re-fits on viewport resize. Demo player light back up to 0.9 (multiply-reveal doesn't blow out).
**Why:** additive-only can't reveal art (the look the user wanted from the first cut); multiply-reveal does, and a small additive glow covers the "lamp over black" emissive case.
**How:** lightmap → viewport RT (`app.renderer.render({ target })` each frame), shown as a full-viewport multiply Sprite; a parallel faint additive `glowWorld` for local lights; both camera-synced. Player light is reveal-only (no glow → no wash).
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` 200. (Re-check the room: a soft warm reveal under the lamp + the player light revealing the scene as you move, not opaque balls.)
**Follow-ups:** 10b editor next; tune light intensities/colours to taste.

### 2026-06-16 — M10 10b fix: lights glow (additive) + lighting fills the viewport
**What:** Two issues from the first lighting cut (user screenshot). (1) **Lamps didn't show** — the pure-multiply lightmap only *reveals* existing art (`scene × lightmap`), so a light over a black part of the scene stayed black (0 × anything = 0). (2) The **darken didn't cover the full viewport** — lighting was world-space (only the scene's design width), leaving un-darkened pillarbox bars on narrow scenes. Reworked `lighting.ts` to the standard 2D model: a **screen-space** full-viewport **multiply** darken (ambient × tint) + **additive** local lights + the player light — so lamps *glow* even over black and the player light brightens / reveals the scene; dark zones still multiply toward black. Scene-positioned elements live in a `worldGroup` whose transform tracks the camera (`cameraOffset`), so lights stay at scene coordinates while the base fills the whole viewport (incl. pillarbox). Dropped the RenderTexture (plain blend-mode layering now). Moved the `lighting` atmosphere slot from world-space to screen-space (above the world, below weather). Demo: lowered the player light to 0.6 (additive doesn't need as much).
**Why:** the multiply-only model couldn't make a lamp emit light, and world-space lighting left gaps on pillarboxed scenes.
**How:** base = a huge `multiply` rect (covers any viewport); lights/dark/player = additive/multiply sprites inside `worldGroup` (position = `cameraOffset.x/y`, scale = `cameraOffset.scale`, set each frame). Cone/sphere player light unchanged. No render-texture → simpler + cheaper.
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200. (Re-check the room: a warm glowing lamp + full-viewport darkness + the player light.)
**Follow-ups:** unchanged — 10b editor next.

### 2026-06-16 — M10 10b (runtime): lighting — ambient / local lights / dark areas / player light
**What:** The lighting runtime. Schema: `AmbientLight` (colour + intensity; `GameDoc.ambientLight` default → `SceneData.ambientLight` override), `LightSource[]` (`SceneData.lights` — pos/radius/colour/intensity/flicker, `when`-gated), `DarkArea[]` (`SceneData.darkAreas` — polygon + feather), `PlayerLight` (`GameDoc.playerLight` — sphere/cone, radius, colour, intensity, angle, `when`). New `engine/lighting.ts`: a **lightmap** — a base ambient fill + additive local-light radials + blurred black dark-area polygons + the player's light (radial **sphere** / a `coneTexture` wedge following facing) — rendered to a **half-res RenderTexture** each frame and composited over the scene with a **multiply** blend, so lit areas reveal the scene art and dark areas hide it. Lights toggle by `when` + flicker per-frame; the player light follows the character (gated, e.g. `hasItem flashlight`). Wired into `mountScene` (into the world-space `lighting` slot) + `createSceneHost` + `GameCanvas`. Activates only when a scene is actually dark / has lights (no wasted render-texture in lit scenes). Demo: the **room** is a dark interior (ambient 0.15) with a warm flickering **lamp** + the player's **light sphere** (gated `hasItem key`, which you hold to get in).
**Why:** M10 10b — the headline visual. The lightmap-multiply technique is the "overlay + masks" approach that **reveals** the scene under lights (point 4: a black scene + a flashlight), not just glow pools.
**How:** half-res lightmap (`LM_SCALE 0.5`) — soft lighting reads fine downscaled, ¼ the memory. Procedural radial / cone textures (canvas gradients). The base fill = ambient `colour × intensity` (multiply darkens), additive radials brighten toward white (reveal), dark-area polygons are black + `BlurFilter` for the feathered edge. All world-space (lights at scene coords; the player light at the character's world pos). The composite Sprite is `blendMode: 'multiply'` in the lighting slot above the scene bands.
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` + `/?edit` + the module 200. (Lighting is visual — enter the **room**: dark, a warm lamp pool, a light following you.)
**Follow-ups:** **10b editor** — place lights + draw dark-area polygons in the preview, ambient + player-light controls, per-scene colour grade. Then 10c fog / 10d polish.

### 2026-06-16 — Fix: editor tab bar scrolls horizontally (was clipping tabs)
**What:** The editor's top tab bar (`.editor__tabs`) couldn't scroll, so with 8 tabs (the new Atmosphere tab tipped it over) some were squashed / clipped in a narrow side panel. Now the bar **scrolls sideways** when the tabs don't fit. CSS only: `.editor__tabs` got `overflow-x: auto` + `flex-wrap: nowrap` (+ thin scrollbar); `.editor__tab` changed from `flex: 1` to `flex: 1 0 auto` + `white-space: nowrap` — tabs still grow to fill when there's room, but never shrink below their label, so the bar overflows + scrolls instead of clipping.
**Why:** user-reported — tabs became unreachable without widening the panel.
**How:** `flex: 1 0 auto` (grow 1, shrink 0) is the key: fills when N < width, holds natural width + scrolls when N > width.
**Verified:** build green; dev smoke `/?edit` 200.

### 2026-06-16 — M10 10a (editor): Atmosphere tab + weather sliders — 10a complete
**What:** No-code weather authoring. A new top-level **Atmosphere tab** (`WeatherList`) lists presets (rain/snow/dust + custom; + Preset / Edit / ✕); **Edit** opens `WeatherEditor` — a modal of **sliders** for every parameter (count / alpha / size / angle / speed / sway / swayFreq) + **shape** (round/streak) / **blend** (normal/add) pickers + a **colour** swatch + an optional **ambient** `SoundField` (layered over the scene ambient). Per scene: a **Scene → Weather** section (`SceneWeather`) — a conditional `{ preset, when }` list (preset picker + `ConditionEditor`), so a flag triggers/swaps weather. Editor store gained `addWeatherPreset` / `removeWeatherPreset` / `setWeatherPreset` + `addSceneWeather` / `removeSceneWeather` / `setSceneWeatherPreset` / `setSceneWeatherWhen`. **Completes M10 10a.**
**Why:** M10 10a editor — author the parametric presets + per-scene weather visually, no JSON.
**How:** mirrors the library + modal pattern (Sounds/Sequences); sliders are range inputs with a live readout (`.weather-slider`). The preset editor commits live via `setWeatherPreset` (merge); the per-scene list is a `patchScene` (no remount). The editor is still lazy-loaded (atmosphere/weather runtime is tiny; the heavy bit is the canvas, already split).
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200. (Authoring is visual — Atmosphere tab → Edit a preset → ▶ Test in game; or Scene → Weather to pick one.)
**Follow-ups:** a **live weather preview** in the editor (slide → see it) — `mountPreview` is static today. Then **10b lighting**.

### 2026-06-16 — M10 10a: weather ambient sound (layered over the scene ambient)
**What:** A weather preset can now carry a **looping ambient sound** that plays *over* the scene's ambient (e.g. rain hiss + the scene drone). `WeatherPreset.ambient?: SoundConfig` (a library reference). Audio: the ambient bed became **channel-based** — `setAmbient(channel, src, volume)` with a `'scene'` channel (the scene/doc ambient) + a `'weather'` channel (the active preset's loop) playing concurrently (mirrors the footstep channels). The scene resolves the active preset's ambient and drives the `'weather'` channel reactively (rebuilt with the weather; cleared on scene teardown / when weather stops). Added a procedural **rain hiss** (`sounds.ts` `hiss()` — low-passed white noise, seam-crossfaded) as a built-in library sound `sfx-rain`, and the built-in **rain** preset references it — so the street's rain is now audible over its ambient.
**Why:** user request — weather should have its own ambient bed alongside the scene's.
**How:** generalising `setAmbient` to channels (like footsteps) keeps the scene + weather beds independent and concurrent; the unlock-gesture starts all channels. `audioMod` was hoisted above the weather block so `applyWeatherAmbient` can drive the channel once the (dynamically imported) audio module is ready (it's also called from the import's `.then`). The host teardown stops both `'scene'` + `'weather'`.
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200. (Audible — the street now has a rain bed; mute still works via Howler.)
**Follow-ups:** the **Atmosphere tab** (10a editor) gets a per-preset ambient `SoundField` alongside the sliders.

### 2026-06-16 — M10 10a (runtime): weather particles
**What:** The weather/particle runtime. Schema: `WeatherPreset` (parametric — count, colour, alpha, size, **shape** round/streak, angle, speed, sway + swayFreq, blend) + `GameDoc.weatherPresets` + `SceneData.weather` (a conditional `{ preset, when }[]` list). New `engine/weather.ts` — a screen-space `ParticleContainer` of `count` particles (capped by the quality `PARTICLE_BUDGET`) falling at angle/speed, swaying, recycled off-screen; round (canvas radial-gradient texture, snow/dust) or streak (`Texture.WHITE` scaled, rain) shape, tinted, optional `add` blend. `data/weather-presets.ts` (`BUILTIN_WEATHER`: **rain / snow / dust**) + `seedWeatherPresets`, seeded at load like the sounds. Scene wiring: the active preset = the first `scene.weather` whose `when` passes, rebuilt **reactively** (a flag triggers/swaps weather) into `atmosphere.layers.weather`, ticked via `atmosphere.onUpdate`. Threaded `weatherPresets` through `mountScene` / `createSceneHost` / `GameCanvas`. Demo: the **street** gets `rain`.
**Why:** M10 10a runtime — the first thing the compositing foundation renders. Parametric (not per-weather code) per the locked plan.
**How (also adjusted the foundation):** **weather is screen-space** (moved out of the world slots into a stage layer below `screenFx`) so rain falls vertically regardless of the camera pan — a world-space layer would drag it sideways as you walk; lighting/fog stay world-space (local lights / dark areas sit at scene coords). `ParticleContainer` needs a `boundsArea` (else culled) — a generous fixed rect; only `position` is dynamic (we animate it), the rest static for speed; blend is container-level. The active-preset switch reuses the existing store subscription (`refreshVisibility`), destroying/rebuilding the system on change.
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` + `/?edit` + the new module 200. (Rain is visual — check `/`: the street should rain.)
**Follow-ups:** **10a editor** — the **Atmosphere tab** (preset list + sliders) + a per-scene weather picker (with `when`). Then 10b lighting.

### 2026-06-16 — M10 foundation: atmosphere/lighting compositing stack
**What:** The layer scaffolding the rest of M10 renders into (built first, by request). New `engine/atmosphere.ts`: `createAtmosphere(world, stage)` adds the **compositing slots** in the locked z-order — world-space `fogBack` (5) · `fogFront` (25) · `weather` (30) · `lighting` (40), slotted around the scene bands (background 0 / interactive 10 / foreground 20), plus a screen-space `screenFx` (vignette / lightning flash) on the stage (below the host's fade wash). Returns an `Atmosphere` with `onUpdate(cb)` (subsystems register per-frame updaters), `update(dt)` and `destroy()`. Plus the **performance/quality** hooks: `atmosphereQuality` (defaults from `prefers-reduced-motion`; the M11 settings UI will drive it) + `PARTICLE_BUDGET` per level. Wired into `mountScene`: created after the bands, `update`d each tick, `destroy`ed on teardown.
**Why:** M10's cross-cutting foundation — establish the stack + the update/quality hooks once, so 10a (weather) / 10b (lighting) / 10c (fog) / 10d (polish) slot in without reordering or re-plumbing.
**How:** slots are plain `Container`s with `eventMode: 'none'` (overlays never intercept clicks — they pass to the stage hitArea) ordered by `zIndex` on the already-`sortableChildren` world; the world slots ride `world.destroy({ children })`, so `atmosphere.destroy()` only removes the stray `screenFx` on the stage. Empty for now (invisible) — the scene renders unchanged.
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` + the new module 200; the scene renders as before (empty slots).
**Follow-ups:** **10a** (weather particles into the `weather` slot + the Atmosphere tab) next.

### 2026-06-16 — M10 planning: expanded the atmosphere/lighting roadmap
**What:** Docs only. Reworked `roadmap.md` M10 into **10a–10d** with the user, and recorded the locked design decisions (memory `m10-atmosphere-plan`). 10a particles/weather (a **parametric** `WeatherPreset` + sliders + a new top-level **Atmosphere tab**, pre-seeded rain/snow/dust, per-scene conditional preset gated by `when`); 10b lighting (ambient `GameDoc.ambientLight` → per-scene override; local `SceneData.lights[]` gated by `when`; black scene + a player **cone/sphere** light; `SceneData.darkAreas[]` polygons with a gradient — visual only); 10c fog/clouds; 10d polish (vignette; **lightning + thunder** with a thunder sound = M9 synergy; flicker).
**Why:** the user wanted to flesh M10 out before building — adding weather particles (beyond the original lights+fog), flag-driven everything, per-scene ambient override, a black-scene player light, and dark-area gradients.
**How (decisions, locked):** lighting = **overlay + gradient textures + masks** (blend modes, not a custom shader yet); player light = **both cone + sphere** (selectable); weather control = **per-scene `{ preset, when }`** (reactive, no new runtime state). Compositing order, performance caps + a quality/reduced-motion setting, and localized point emitters / per-scene colour grade noted as follow-ups.
**Verified:** docs only — no code touched.
**Update:** promoted all of the recommended extras from "follow-ups" to **committed** M10 items (user wants each built): localized point emitters → 10a; per-scene colour grade + light flicker → 10b; vignette + lightning/thunder → 10d; **compositing order** + a **performance/quality (+reduced-motion)** setting → cross-cutting foundations; darkness confirmed **visual-only**.
**Verified a design hypothesis (point 8):** making a dark room's hotspots unresponsive until the lights are on needs **no new code** — gate them with the existing `when` (`flag: lights-on`, the same flag that turns on the light). `pickInteractable` is used by *both* the click handler and the cursor, and already skips a `when`-failed interactable, so it neither fires nor changes the cursor. Recorded in the roadmap's "darkness is visual-only" foundation.
**Follow-ups:** build **10a** (particles/weather) next.

### 2026-06-16 — M9 9c: per-NPC footsteps + per-animation sound — M9 fully complete
**What:** The two sound-bindings the library unlocked. **Per-NPC footsteps:** `NpcDef.footstep` (a `SoundConfig`); `audio.ts` footsteps became **channel-based** (a `FootChannel` per walker — `'player'` + each NPC id — each its own sound + cadence timer), the scene sets each footstep-NPC's sound on mount and drives `setFootstepsMoving(id, visible && moving)` per-frame (hidden/routine-moved NPCs stay silent). **Per-animation sound:** `AnimClip.sound` (a `SoundId`) — `sprite-view.ts` `playOnce` plays it (dynamic import) when a one-shot clip runs, so a gesture's SFX isn't hand-chained with a `playSound`. Editor: a **footsteps** picker in the NPC modal (`SoundField`) + a **sound** picker per clip in the character editor (`SoundSelect`). Demo: the **guard** now has footsteps (`content/game.json`); the placeholder's **`interact`** clip carries a blip (`sfx-pickup`), so interacting with the room panel sounds.
**Why:** M9 9c — the user asked to confirm NPC footstep + per-animation sound were possible; they weren't, so they were built on the reference library (both are just `SoundId`s).
**How:** channels are a `Map<id, FootChannel>`; the unlock gesture re-syncs all of them; scene teardown stops the player channel + drops the NPC channels. Per-anim sound lives at the one choke point (`view.playOnce`) so it covers gestures *and* on-arrival one-shots; it only fires for one-shots (looping walk/idle use footsteps, not this). `AnimClip.sound` referencing a `SoundId` declared later in the schema is fine (type declarations hoist).
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200. (Audible — walk to hear the player + (near the guard) its footsteps; click the room panel to hear the interact blip.)
**Follow-ups:** none for M9. (Reactive ambient `when` re-evaluation stays a minor nicety.)

### 2026-06-16 — M9 9b.1: built-in procedural sounds as real library entries
**What:** The procedural sounds (drone / pickup / transition / footstep) were runtime-only fallbacks, so the Sounds tab showed just the one uploaded clip. They're now **real library entries** referenced by select everywhere. New `audio/builtin-sounds.ts` (`BUILTIN_SOUNDS` under stable ids `sfx-ambient` / `sfx-pickup` / `sfx-transition` / `sfx-footstep`) + `data/seed-sounds.ts` (`seedBuiltinSounds`, run at load after `migrateSounds`, non-destructive). The previously **hardcoded** pickup/transition SFX became data-driven: `GameDoc.pickupSound` / `transitionSound` (a `SoundId`), played via `playSoundById` (default the built-in), with **picker** fields in Project → Audio. The demo (`content/game.json` + in-code `demoGameDoc`) now **references** the built-ins for ambient / footstep / pickup / transition, so every select shows its selection.
**Why:** user feedback — all synthesized sounds should appear in the library and be re-selectable wherever used (not hidden as code fallbacks).
**How:** `builtin-sounds.ts` imports only the pure URIs from `sounds.ts` (no Howler), so `data/seed-sounds.ts` can use it without pulling audio into the data layer. Seeding is idempotent + non-destructive (a renamed/replaced built-in under the same id is kept). `audio.ts` dropped its two hardcoded `Howl`s; pickup/transition now resolve through the library like everything else. The Sounds tab now lists 5 (4 built-ins + the room ambient).
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` + `/?edit` + the new modules 200.
**Follow-ups:** unchanged — **9c** (per-NPC footsteps + per-animation sounds).

### 2026-06-16 — M9 9b: global Sounds library (reference, not inline)
**What:** Sounds are now a **global library** referenced by id, not uploaded inline at each use-site (user's call; same shape as routine paths-by-reference). Schema: `SoundAsset { id, name, src }` + `GameDoc.sounds`; `SoundConfig` is now `{ sound: SoundId, volume? }` (was `{ src }`); `playSound` / `VoiceConfig.sound` / `inspect.audio` hold a `SoundId`. Runtime: a registry in `audio.ts` (`setSoundLibrary` from `gameDoc.sounds`) + `resolveSrc` / `playSoundById`; `effects.ts`, `voice.ts`, the scene's inspect audio + `applySceneAudio` all resolve ids → src. **Migration** (`data/migrate-sounds.ts`, run at load in `data/game.ts`): hoists any inline `data:audio…` (deduped) into the library and rewrites fields to ids (idempotent; also renames ambient/footstep `src`→`sound`) — so old docs / drafts keep working. Editor: a new **Sounds tab** (`SoundList`: upload once / name / Test / ✕) + a `SoundSelect` picker; every inline upload became a picker — `SoundField` (ambient/footstep), the `playSound` effect, NPC voice + inspect audio, interactable inspect audio. The editor keeps the audio resolver pointed at the *working* doc (so Test resolves just-added sounds). `content/game.json` migrated on disk (the room ambient → a `room-ambient` library entry).
**Why:** no duplication (one upload referenced N times), smaller documents, rename/swap in one place — the user asked why audio was inline-only.
**How:** the migration is a typed deep-walk (no `any`): a targeted `src`→`sound` rename for the known ambient/footstep configs, then a generic pass hoisting every remaining inline `data:audio` string in place. `audio.ts` statically importing `gameDoc` shifted the chunk graph — Pixi now splits into per-renderer chunks + Howler into its own `audio` chunk (player payload unchanged in total; the lazy `Editor` chunk stays `?edit`-only). **Confirmed to the user (now follow-ups):** per-NPC footsteps + per-animation sounds are NOT possible yet — both become trivial once sounds are referenced (`NpcDef.footstep?: SoundId`, `AnimClip.sound?: SoundId`); see roadmap 9c.
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` + `/?edit` + `/src/audio/audio.ts` 200; ported migration sim — idempotent on the demo + dedupes/hoists synthetic inline sounds (playSound / inspect / ambient / voice / footstep) correctly.
**Follow-ups:** **9c** — per-NPC footsteps + per-animation sound (the library makes both small). Reactive ambient `when`.

### 2026-06-16 — M9: audio authoring — per-scene ambient + footsteps — M9 complete
**What:** Data-driven audio. Schema: `SoundConfig { src, volume? }`; `SceneData.ambient` (a per-scene loop + a `when` gate); `GameDoc.ambient` (default bed), `GameDoc.footstep` + `GameDoc.footstepsOff` (the player's walk cadence). Runtime (`audio.ts`): the hardcoded global drone became a **managed ambient** (`setAmbient` swaps the loop per scene, seamless on a same-src swap, falls back to a procedural drone) and a new **footstep cadence** (`setFootstepSound` + `setFootstepsMoving` → plays a step every 330 ms while the player walks; procedural `thump` default). A one-call `applySceneAudio` resolves it; the scene applies it on mount (ambient gated by `when`) and drives `setFootstepsMoving(player.isMoving())` per-frame; teardown stops footsteps, the host stops the ambient. **SFX on interactions** (the `playSound` effect upload) + **voice while speaking** (4c) were already done, so this completes the M9 set. Editor: a reusable `SoundField` (upload + volume + clear); a **Scene → Audio** section (ambient + `when`) and a **Project → Audio** section (default ambient, footstep, footsteps on/off). Demo: the **room** gets a darker ambient (a distinct procedural drone baked into `content/game.json`), so moving street↔room audibly swaps the bed; footsteps play while walking.
**Why:** M9 (audio authoring) — bind sounds to scene / character state, conditionally, no code.
**How:** audio stays a dynamic import in the scene (kept out of the editor preview's module graph); `audioMod` is captured once for the per-frame footstep call. Ambient is resolved at mount (its `when` re-evaluated reactively is a noted follow-up). Footsteps are a `setInterval` cadence (not a continuous loop — that'd machine-gun), gated by the autoplay-unlock gesture. Mute still rides Howler's global. Built-in procedural defaults (drone / step) mean audio works with zero authoring; uploads override.
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200. (Sound is audible — exercise in `/`: walk to hear steps, enter the room to hear the bed change.)
**Follow-ups:** per-NPC footsteps; reactive ambient `when` (re-apply on flag change); a global SFX-on-state binding table if needed (interactions already covered by `playSound`).

### 2026-06-16 — Editor draft → IndexedDB (was localStorage); save snapshot fix
**What:** The editor's working-doc **draft moved from localStorage to IndexedDB** (the long-noted follow-up). A `GameDoc` embeds uploaded art as data-URLs, which blows past localStorage's ~5 MB string quota once scenes / atlases pile up; IndexedDB's budget is disk-based (orders of magnitude larger). New shared `state/idb.ts` (one DB `point-and-click-pixin`, **v2**, stores `saves` + `draft`, guarded `createObjectStore` so existing saves survive; `idbGet/idbPut/idbDelete` + `estimateStorage`). `data/doc-draft.ts` rewritten to async IndexedDB load/save/clear with a cached `present` flag so `hasDocDraft()` stays sync for badges, **+ a one-time migration** of any existing localStorage draft. `state/storage.ts` refactored onto the shared helper. `data/game.ts` now resolves the draft via **top-level await** (`gameDoc = (await loadDocDraft()) ?? bakedGameDoc`; esnext target supports TLA). `Editor.tsx` `testInGame` / `discardDraft` await the write/clear before reloading. **Also fixed:** `saveGame` dropped `npcScene` / `npcNode` from its snapshot, so NPC location / routine state didn't actually survive a save — now included.
**Why:** user-flagged capacity ceiling — larger / more scenes would overflow localStorage. IndexedDB removes that ceiling for practical authoring.
**How:** TLA keeps the boot clean — the whole module graph awaits the async draft read, so the store singletons still get the resolved `gameDoc` with no boot/store-init refactor. The DB version bump is back-compatible (stores created only if absent). Migration reads the old `pnc-doc-draft` key once, writes it to IDB, removes it. **IndexedDB size (answer to the question):** not a fixed cap like localStorage — quota is **dynamic, disk-based**, shared by the origin (IDB + Cache API): Chromium up to ~60 % of disk per origin (best-effort, evictable under pressure unless `navigator.storage.persist()`), Firefox ~min(10 % disk, large) per group, Safari ~1 GB then prompts. `estimateStorage()` (→ `navigator.storage.estimate()`) reads the live `{usage, quota}` — typically hundreds of MB to GBs, so even dozens of scenes with embedded atlases fit comfortably. _(A future optimisation for very large projects: store assets as blobs / object-URLs instead of data-URLs in the doc — not needed now.)_
**Verified:** typecheck + lint + build green (TLA build, no error with the esnext target); dev smoke `/` + `/?edit` + `/src/main.tsx` + `/src/data/game.ts` all 200.
**Follow-ups:** none required. (Blob-backed asset storage is the next-level scale move, deferred.)

### 2026-06-16 — M8 step 8b (editor): Cutscenes tab + step-list editor — M8 complete
**What:** No-code cutscene authoring. A new **Cutscenes tab** (`SequenceList`) lists sequences (+ Cutscene / ✕; ids fixed at creation); **Edit** opens `SequenceEditor` — a **step-list editor** in a modal: **+ Step** (by kind), **↑/↓** reorder, **✕** remove, with per-kind fields — `wait` (ms), `move`/`face` (actor select + x/y fraction inputs), `anim` (actor + animation picker), `dialog` (dialog picker), `effects` (the `EffectList`), `camera` (focus actor *or* a point + zoom + ms). The **`startSequence`** effect field became a **picker** of the sequence ids (was a text input). Editor store gained `addSequence` / `removeSequence` / `addSeqStep` / `removeSeqStep` / `moveSeqStep` / `setSeqStep` (+ a `defaultStep` factory). **Completes M8.**
**Why:** M8 step 8b — the editor side of cutscenes (8a was the runtime). Mirrors the Dialogs library + modal-editor pattern, composing the existing `EffectList` / `EditorModal` / effect-option pickers (`actorIds` / `actionNames`).
**How:** `SeqStep` is a discriminated union, so `StepFields` switches on `kind` for the right inputs and `defaultStep(kind)` seeds a new step. The `startSequence` picker reads sequence ids straight from `editorStore` (EffectFields isn't threaded doc-wide), like `NpcList` does — fine for the dev-only editor. Points stay numeric fractions (preview-picking would need a scene context behind the modal — a follow-up). The editor is still lazy-loaded, so React Flow + this stay out of the player bundle (player `index` 627 kB; `Editor` chunk 253 kB, `?edit` only).
**Verified:** typecheck + lint + build green; dev smoke `/` + `/?edit` 200. (Authoring is visual — exercise in `/?edit` → Cutscenes.)
**Follow-ups:** pick `move`/`camera`/`face` points on the scene preview; a `SceneData.onEnter` editor (scene-entry cutscenes are authorable today only via a spawn-covering trigger or hand-edited JSON); cross-scene cutscenes.

### 2026-06-16 — M8 step 8a (runtime): cutscene / sequence runner + camera control
**What:** The **cutscene runtime** — ordered, non-interactive, skippable scripted sequences. Schema: `GameDoc.sequences` (a library); `Sequence { steps: SeqStep[] }` with `SeqStep` kinds **`wait` / `move` / `anim` / `face` / `dialog` / `effects` / `camera`**; a `startSequence` effect; and `SceneData.onEnter` (effects run once on mount → scene-entry cutscenes). Runtime: a per-scene runner in `mountScene` plays the steps over the actor registry + a new **camera override** (focus a point or follow an actor, with `zoom`, tweened over `ms`, smoothstep), reusing the dialogue runtime for `dialog` steps. Input is blocked while a cutscene is active (`sequenceStore`); routines freeze too. **Skippable** — a Skip button / **Esc** fast-forwards: the current await resolves and remaining steps apply only their instant parts (effects run, moves/cameras snap, anims/dialog/waits drop). New `state/sequence.ts` (`sequenceStore`), `ui/CutsceneOverlay.tsx` (letterbox bars + Skip) + `use-sequence.ts`. `Character.playOnce` gained an `onDone` (so `anim` steps await completion). `startSequence` added to the editor effect dropdown (a text id for now). Demo (`content/game.json`): an **intro** cutscene fired by a once-trigger over the street spawn — zoom on the player, walk to the door, face it, a spoken line, a gesture — then the camera releases.
**Why:** M8 (cutscenes) — the runtime first, per the project cadence. **Decisions (user):** include **camera control** now (the `camera` step) and **reuse dialogues** for cutscene speech (the `dialog` step).
**How:** the camera override lives in `updateCamera` (a `camCur`/`camFrom`/`camTo`/`camFollow` tween it reads each frame with `dt`); a `camera` step sets the target + awaits its `ms`, and the runner releases back to the player on end. `sleep`/`move` awaits hook `app.ticker` and resolve early on skip; `move`-skip snaps via `setPosition` (which clears the path). A cutscene plays in the mounted scene — an `effects` step's `goTo` ends it (teardown bails the loop + closes the overlay). Scene-entry effects are deferred a microtask so the first frame/camera is in place. `startSequence`/`startDialog` are no-ops in `applyEffect` (the scene starts them, like dialogue).
**Verified:** typecheck + lint + build green; `content/game.json` valid; dev smoke `/` + `/?edit` + `/src/main.tsx` all 200. (Playback is visual — new game → the intro plays on the street.)
**Follow-ups:** **8b (editor)** — a Sequences library + step-list editor (the `startSequence` field becomes a `<select>`; a `SceneData.onEnter` editor). Cross-scene cutscenes (a sequence that survives a `goTo`) + live-follow camera during a moving-actor step are nice-to-haves.

### 2026-06-16 — Routine: freeze an NPC's schedule while it's mid-dialogue
**What:** Talking to a routine-driven NPC now **pauses its routine** for the duration of the conversation, so a timed (`after`) or conditional (`when`) transition can't move it to another scene while the player is talking to it. `DialogueState` gained `partner` (the conversation partner's actor id, set on each node `present`, cleared to `null` on end); `createRoutineRunner` takes an `isBusy(npc)` predicate and `continue`s (no time accrual, no transitions) for a busy NPC; `createSceneHost` passes `(npc) => dialogueStore.getState().active && partner === npc`.
**Why:** user-requested polish on the M7-step-6 limitation noted earlier — the global routine runner kept ticking during dialogue, so a tightly-timed routine could yank the NPC away mid-conversation. (`onArrive` was already safe — a paused NPC never arrives.)
**How:** the predicate is injected from the engine (which already imports `dialogueStore`), so `systems/routine.ts` stays decoupled from `state/`. Freezing **skips elapsed accrual too**, so the talk time doesn't count toward the node's `after` timer — after the conversation the NPC needs the full linger again, not an instant jump. The NPC's walk is already paused by the dialogue (`Character.pause()` / `resume()`); this complements it at the schedule level.
**Verified:** typecheck + lint + build green. Ported sim — **4/4 PASS**: busy freezes a due `after` transition, no time accrues while busy, and the full timer is required after un-busying.
**Follow-ups:** none. (Same nice-to-haves as 6e: per-path preview colour, cross-scene `onEnter` engine effects.)

### 2026-06-16 — M7 step 6e: routine node paths by reference + `onArrive` edges — step 6 complete
**What:** Routine nodes now **reference named scene paths** instead of carrying geometry, and a routine edge can fire **on arrival**. Schema: `NpcPath` gains `id` + `name`; a placement's `paths` is the **named library**; `RoutineNode.path` (inline) → `RoutineNode.pathId` (a reference resolved against the placement's paths in the node's scene); `RoutineEdge.onArrive?` (fire when the node's `once` path finishes). Runtime: `startNpcPath` takes an `onDone` (fired when a `once` path reaches its end) → a new module singleton `routineArrival.notify(npcId)` → the runner records arrival per NPC (reset on node enter) and `nextRoutineNode` gained an `arrived` arg. The scene's path picker resolves `pathId` → the placement's named path (and wires `onDone` for routine NPCs). Editor: the placement path UI became a **named-paths list** (+ Path / name / mode / Draw-this-one / Clear / ✕; store actions `addNpcPath` / `removeNpcPath` / `setNpcPathName` / `setNpcPathMode` / `addNpcPathPoint` / `clearNpcPathPoints` now key on a path index, with `drawPathIndex` tracking which path is being drawn); the routine **node** got a **path `<select>`** (the NPC's named paths in that scene) and the **edge** got an **on-arrival** checkbox (+ `arrive` in the graph label). Demo (`content/game.json`): the **guard** loop — `patrol`(pingpong) →15 s→ `go-door`(walk `to-door`) →arrive→ `in-room`(room, stand) →6 s→ `go-back`(walk `to-patrol`) →arrive→ `patrol`, looping. **Completes M7 step 6.**
**Why:** the user's design call — keep path *geometry* on the scene canvas (where there's a preview to draw on) and the flow graph about *logic only* (select a path + gate it), with no duplication and no canvas-in-modal. `onArrive` makes "walk there, then continue" expressible without fragile per-leg timers or helper triggers.
**How:** the arrival singleton mirrors the existing `sceneHit` / `cameraOffset` pattern (the scene and the global runner don't import each other). For routine NPCs the scene fully delegates path choice to the active node (`pathId` → named path, or stand); non-routine NPCs keep `paths`-with-`when` / default `path`. Legacy `placement.path` stays supported at runtime (stranger still uses it) but the editor now authors `paths`; the guard was migrated to named paths. When the guard is "in room", its street body is just hidden at the door, so on return it reappears at the door and walks `to-patrol` back — reads as a continuous trip. Lazy-loaded editor keeps `@xyflow/react` out of the player bundle (index 623 kB; Editor its own 246 kB `?edit` chunk).
**Verified:** typecheck + lint (0 warnings) + build green; `content/game.json` valid. Ported Node sim of the full guard loop incl. `onArrive` + stale-arrival reset — **14/14 PASS**.
**Follow-ups:** none required for step 6. Nice-to-haves: per-path **colour** in the preview (the overlay draws all named paths the same); engine effects in `onEnter` across unmounted scenes; a node-id/path rename cascade.

### 2026-06-16 — M7 step 6d: guard routine demo + node-path-by-reference decision
**What:** (1) A **demo routine** in `content/game.json`: the **guard** now has a routine `patrol-street`(street) ⇄ `visit-room`(room) with `after: 6000` both ways, plus a guard **placement in room** so the room node has something to show. So the guard patrols the street, vanishes after ~6 s (moved to room), and is found standing in the room, then returns — proving cross-scene routine movement without touching the stranger's key→room example. (2) Recorded a **design decision** for routine node paths.
**Why:** M7 step 6d — a hands-on demo to exercise the 6b/6c routine end-to-end (chosen on the guard, the story-neutral NPC, to keep the stranger example intact). Authored straight into `content/game.json` (the published doc the game loads) per the user's request — they discard the editor draft so the baked demo shows.
**How:** A Node script injected `npcs.guard.routine` + the room placement and rewrote the JSON (2-space, matching Export). The runner seeds guard to `patrol-street` (= its home/street), so it starts patrolling; the timed edges flip it scene-to-scene. Guard uses its **street placement path** while in the street node and just stands in room (no room path) — fine for the demo.
**Decision (user) — node paths by REFERENCE, not drawn in the graph (→ step 6e):** a routine node will **select** a **named path** that's drawn per-placement on the **scene canvas**, and the flow graph supplies only the conditions (edge `when`/`after`) for when the NPC walks it. This replaces the deferred "draw a per-node path in the modal" idea — keeps path *geometry* on the canvas and the graph about *logic* only, with no duplication and no canvas-in-modal. Captured in memory + roadmap step 6e; `RoutineNode.path` will change from an inline `NpcPath` to a reference, `NpcPath` gains an id/name, and a placement will hold several named paths.
**Verified:** `content/game.json` re-parses as valid JSON; routine + room placement present. (Behaviour is visual — discard the draft, open `/`, watch the guard.)
**Follow-ups:** **6e** — implement node-path-by-reference (schema + placement multi-named-path editor + node path `<select>` + runtime resolve). Then M7 step 6 is complete.

### 2026-06-16 — M7 step 6c (editor): React Flow routine graph + lazy-loaded editor
**What:** The **routine editor** — a React Flow node-graph in the NPC modal (Characters → NPCs → Edit), under a new **routine** section. New dep `@xyflow/react` (12.11). `RoutineEditor.tsx`: **+ Routine** seeds a one-node routine (start at the NPC's first placement scene); the graph shows **nodes** (stations, labelled `id @ scene`; the ▶ start node outlined green) you drag to arrange, and **edges** (transitions, labelled `after`/`when`/`auto`) you draw by connecting handles. A detail panel under the canvas edits the selected **node** (scene picker + an `On enter` `EffectList`; Set start / Delete) or **edge** (`after` ms + a `when` `ConditionEditor`; Delete). The store's `NpcDef.routine` is the source of truth; React Flow mirrors it (resynced each commit; positions persist in `node.ui`), and drag-stop / connect / delete / detail edits commit back via `patchNpcDef`. Also **lazy-loaded the editor** (`main.tsx` → `lazy(() => import('./editor/Editor'))` + `Suspense`) so the dev-only editor + React Flow code-split out of the player bundle.
**Why:** M7 step 6c — the no-code routine authoring (the editor side of 6b). **React Flow + a rich node** were the agreed choices. Lazy-loading honours the "player build ships no editor" invariant — and React Flow made it matter (it's heavy).
**How:** Controlled-ish React Flow: `useNodesState`/`useEdgesState` give smooth dragging; a `useEffect([routine])` re-mirrors the store after every commit (positions survive via `ui`, and a drag only commits on stop, so it never fires mid-drag). Edges carry their routine index in `data` so deletes map back. `colorMode="dark"` + a fixed-height `.routine__canvas`. Reused `EffectList` / `ConditionEditor` / `SceneSelect`. **Bundle:** the editor became its own `Editor-*.js` chunk (~244 kB) loaded only under `?edit`; the player `index` chunk **dropped 686 → 623 kB** (the editor used to be statically bundled in). Per-node **path drawing** isn't in the modal (no scene canvas there) — the node falls back to the placement path (runtime already supports `node.path`); drawing UI is a follow-up.
**Verified:** typecheck + lint + build green; the editor splits into its own chunk; dev smoke `/` + `/?edit` + `/src/main.tsx` all 200. (Graph interaction is visual — exercise in `/?edit`.)
**Follow-ups:** **6d** — a demo routine in `content/game.json` (author + visually tune in the browser together, like the 6a demo). Per-node path drawing; engine effects in `onEnter` across scenes.

### 2026-06-16 — M7 step 6b (runtime): per-NPC routine state machine
**What:** The **runtime** for per-NPC routines — a cross-scene state machine that drives one NPC. Schema: `Routine { start, nodes, edges }` on `NpcDef.routine`; a `RoutineNode { id, scene, path?, onEnter?, ui? }` is a "station" (the NPC is in `scene` while active, optionally walking its own `path`, running `onEnter` state effects on entry); a `RoutineEdge { from, to, when?, after? }` is a transition, eligible when `when` passes AND `after` ms have elapsed in the node (both optional → instant). New `systems/routine.ts`: pure `routineNode` / `nextRoutineNode` + `createRoutineRunner(cast, store)` — a **global** engine (independent of the mounted scene) that **seeds** each routine NPC to its `start` node (syncing `npcScene` + running `onEnter`), then each tick advances any NPC whose active node has an eligible edge (chaining instant hops, capped). Active node per NPC lives in story state: `StoryState.npcNode` + a `enterRoutine(npc, node, scene)` store action (sets `npcNode` + synced `npcScene`). The mounted scene's path picker now prefers the **routine node's path** (when its active node is in this scene) over placement `paths`/`path`, recomputed reactively. The runner is created + ticked in `createSceneHost` (before the first mount, so the seed lands before the scene reads `npcScene`).
**Why:** M7 step 6's grand piece — a declarative, per-NPC routine replacing scattered moveNpc/flag wiring with one state machine. **Decision (user):** the editor uses **React Flow** (6c) and the node is **rich** (owns its in-scene `path` + timed transitions). So a simple per-node/per-edge timer (`after` ms) is **in step 6**; the full time-of-day scheduler stays **M12**.
**How:** Location stays expressed as `npcScene` (the routine runner keeps it synced to the active node's scene), so the scene's existing visibility logic is unchanged — only the path picker learned about routines. `onEnter` runs through the story store's `run` = **state effects only** (engine effects like `playAnim` in `onEnter` won't fire unless that scene is mounted — acceptable for the first cut; noted). A loaded save keeps its `npcNode` (the runner only reseeds when unset), so routines resume mid-playthrough. Capped instant-hop loop guards against a cycle of `when`-less / `after`-less edges hanging a frame.
**Verified:** typecheck + lint + build green. Ported Node sim of the runner + transition logic — **11/11 PASS**: seed→start + scene sync, condition transition (flag), timed transition (`after`), chained instant hops + `onEnter` effect, dangling-edge skip, loaded-save keeps node.
**Follow-ups:** **6c** — the React Flow node-graph editor in the NPC modal (`@xyflow/react`); **6d** — `editor_guide.md` + a demo routine. Engine effects in `onEnter` (cross-scene) + per-line VO remain nice-to-haves.

### 2026-06-16 — M7 step 6a-editor: multi-scene placement + home picker
**What:** Brought the editor up to the 6a runtime (which already allows an NPC in several scenes). (1) The scene **NPCs** placement guard was **global** (an NPC placeable in only one scene across the whole game) → now **per-scene**: `placedNpcIds` in `Editor.tsx` is computed from the *selected scene's* placements only, so the pickers (+ Place / the npc dropdown) just block a **duplicate placement within the same scene**; the same NPC can now be placed in multiple scenes. (2) Added a **home (start scene)** picker to the **NPC modal** (`NpcEditor`), shown only when the NPC is placed in **>1** scene — options are the scenes it's placed in (+ "— first placement —" = `home` undefined), writing `NpcDef.home` via `patchNpcDef`. Updated the `NpcList` doc comment + `editor_guide.md` (NPCs placement section + Characters cast/modal note).
**Why:** M7 step 6a's editor follow-up — the runtime supports cross-scene NPCs + `home`, but the editor still enforced one-placement-per-game and had no way to set `home`. Unblocks authoring the multi-scene placements the routine (the rest of step 6) builds on.
**How:** Runtime already keys visibility off `npcScene[npc] ?? home ?? placementScene`, so this is editor-only — no schema or runtime change. `home` defaults to the first placement scene (computed in `createSceneHost`'s `npcHome`), so the picker offers the placed scenes and an explicit "first placement" clear. Kept the picker hidden for single-scene NPCs (home is meaningless then) to avoid clutter.
**Verified:** typecheck + lint green. (Editor-only; behaviour is visual — exercise in `/?edit`.)
**Follow-ups:** The rest of **M7 step 6** — the per-NPC **routine** schema → runtime → **React Flow** node-graph editor (drives one NPC). Architecture to be proposed/agreed before building.

### 2026-06-16 — Docs: editor_guide log step in workflow + M7-step6/M12 scope lock
**What:** Documentation only (no code). (1) `workflow.md` step 4 is now **"Log (two records)"** — the dev-log entry **plus**, whenever a task adds/changes an editor feature, an `editor_guide.md` section on **how to use** the new feature; both are part of "done" (removed the narrower note from step 3). (2) `roadmap.md`: locked the **scope split** — M7 **step 6** is a **per-NPC** React Flow routine that drives **only that one NPC** and is **part of M7, not deferred to M12**; **M12** is the **global** graph that orchestrates **all** NPCs together. Added step-6 sub-checkboxes (6a runtime ✅ done, 6a-editor follow-up, routine schema/runtime, the React Flow editor) and corrected the imprecise "6a" line that said the routine editor was deferred (only the optional time-scheduler is).
**Why:** User feedback — make the editor-guide logging step explicit in the workflow, and pin down that step 6's node-graph is per-NPC (M12 = global orchestration), so the next session builds the right thing.
**How:** Edited `workflow.md` (steps 3→4) and `roadmap.md` (M7 step 6 + M12 sections). No source touched → no typecheck/lint needed.
**Follow-ups:** Resume M7 step 6 — start with the **6a-editor** follow-up (one-NPC-per-scene guard + home picker), then the per-NPC routine schema → runtime → React Flow editor.

### 2026-06-14 — M7 step 6a (runtime): cross-scene NPC location + moveNpc / despawnNpc
**What:** An NPC's scene is now **runtime state**. `StoryState.npcScene` (NpcId → SceneId; `''` = despawned) overrides where each NPC is; **`moveNpc { npc, scene }`** / **`despawnNpc { npc }`** effects (state effects, fired from dialogue / triggers / interactions) move it. A placement shows its NPC **only while the NPC's current scene === this scene** (`npcScene[npc] ?? NpcDef.home ?? the placement scene`), re-evaluated **reactively** — so `moveNpc` adds / removes it live. **Multi-scene placements** are allowed (an NPC placed in several scenes; the runtime location picks the active one); **`NpcDef.home`** is the start scene (default = its first placement). Also **conditional routes**: `NpcPath.when` + `NpcPlacement.paths` — gated **overrides** on top of the default `path` (the first override whose `when` passes wins, else the patrol `path`), **recomputed reactively** so a flag switches the NPC onto a new route and back. Demo: the `stranger` dialogue choice **"Wait for me inside."** sets a flag → the stranger switches to a **gated leave route to the door** and walks there; a `by: npc` door trigger then fires `moveNpc(stranger, room)`, so it **visibly walks off** rather than teleporting — and you find it waiting in the room.
**Why:** M7 step 6a (the **reactive foundation**, per the chosen scope) — cross-scene NPC behaviour driven by the existing flag / condition / effect vocabulary. The time-scheduler + node-graph routine editor are deferred to **M12**.
**How:** the scene's reactive-visibility list generalised from `{ display, when: Condition }` to **`{ display, show: (state) => boolean }`** — layers gate on `when`, NPCs on **location + `when`**. `createSceneHost` precomputes `npcHome` (`NpcDef.home` ?? first-placement scene) across all scenes and threads it to `mountScene`. `moveNpc` / `despawnNpc` are pure state (`applyEffect`); `checkTriggers` skips invisible (moved-away) NPC movers. `moveNpc` / `despawnNpc` are already in the editor effect dropdown. Conditional routes: the same store subscription re-picks each NPC's active path and restarts `startNpcPath` (which redirects via `setTarget`) when it changes. Keeping the patrol in `path` (with `paths` as overrides) means the editor's existing single-path UI still shows it. _(Fixes found in testing: (a) the demo's old `moveNpc`-on-choice teleported the NPC + the choice's lingering line blocked the door click → walk-off route + the choice now ends the dialogue; (b) **hole2 sat directly under the door**, so the door base was unreachable AND the leave route's first waypoint clamped onto the hole edge — which was inside the door trigger → the NPC vanished early; removed hole2 and moved the leave route + trigger into clear walkable; (c) the door's `stranger-enters` trigger is now **`on: 'rest'`** so it fires when the NPC **stops at the door** (not on crossing the area mid-walk → no early vanish), and the `to-room` hit-area was extended down into the walkable so the exit is reliably reachable; (d) `NpcOverlay` now draws the selected NPC's **conditional `paths`** too, so the leave route is visible in the preview; (e) the `to-room` door's visual lived on the **parallax `street.buildings` layer (0.7)** while its hit-area is on the gameplay plane — so as the camera scrolled, the drawn door **drifted from its hit-area** and clicks landed off-target (looked like the player "walked across the scene"). Verified the navmesh itself is fine (a ported grid sim → the door gives worst detour ratio **1.07**); the fix is to put the door's layer on the gameplay plane (**`street.buildings` parallax → 1**; sky/land keep theirs). **Lesson:** interactive hotspots must sit on a `parallax: 1` layer or their visual desyncs from the hit-area.)_ **Draft gotcha:** the editor's localStorage draft overrides `content/game.json`, so these baked fixes only show after discarding a stale draft.
**Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200; ported sims **PASS** — location gate (start / moveNpc / despawn / no-home) + conditional path (patrol → gated leave on a flag).
**Follow-ups:** **6a-editor** — relax the editor's one-NPC-per-*game* placement guard to one-per-*scene*, + a **home** picker in the NPC modal. (The node-graph routine + time schedule = M12.)

### 2026-06-14 — M7 step 5b: stealth editor (vision config + trigger on/exit + cone viz) — step 5 complete
**What:** Stealth is authorable in the editor (no JSON). The **NPC modal** gains a **Vision** section — range / angle / `once` / **`unless`** (`ConditionEditor`) / **on-seen effects** (`EffectList`), with **+ Vision** / **Remove**. The **trigger form** gains the **fire mode** (`enter` / `rest`) + an **On exit** `EffectList` (the main effects relabel "On enter" for triggers). The **Scene preview** draws each visioned NPC's **vision cone** — an aspect-corrected SVG wedge from the spawn toward the first patrol waypoint (else straight down) — so range / angle tune visually. (`setStance` was already in the effect dropdown.) Store: `setTriggerOn`, `setTriggerExitEffects`.
**Why:** M7 step 5b — the editor side of stealth; **completes M7 step 5**.
**How:** a local `VisionEditor` (in `NpcEditor`) edits `NpcDef.vision` via `patchNpcDef`. The cone is computed in design px then squished by **`aspect` (= width / height)** so the preview's `preserveAspectRatio="none"` stretch un-squishes it to true proportions; `vector-effect: non-scaling-stroke` keeps the outline even. Trigger `on` / `exitEffects` narrow via the `interactable.kind === 'trigger'` discriminant.
**Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** **M7 step 6 (NPC routine — cross-scene)** is the last M7 piece.

### 2026-06-14 — `setStance` effect — held crouch posture (5a polish)
**What:** A new **`setStance { action?, target? }`** engine effect holds an idle **posture** — a looping clip shown in place of the default idle until cleared (omit `action`) — so the player **stays crouched** at cover instead of bobbing back up. Walking still animates normally. The cover trigger now does `playAnim pickup` (crouch down) + **`setStance crouch`** (hold) on arrival, and **`setStance`** (clear, → stand up) on exit. Added a held **`crouch`** clip to the placeholder atlas; made `view.loopAction` **idempotent** (re-applying the same stance each frame no longer restarts it). `setStance` is in the editor effect dropdown (action + target pickers).
**Why:** User feedback — the cover crouch played its one-shot then popped back to the default idle, so it didn't read as "hiding". A persistent stance was noted as a 5a follow-up; pulling it in now.
**How:** `Character.stance` overrides the idle in `syncView` (`state==='idle' && stance` → `loopAction(stance)`, else `setPose`); `setStance` refreshes immediately when not held, else the post-one-shot frame applies it. `runEffects` dispatches it over the actor registry (default target the player); `applyEffect` no-ops it (engine effect). Cleared on `setPosition` (a fresh placement shouldn't keep a crouch).
**Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** a crouch-**walk** clip (sneak while moving) is a nicety; 5b editor still pending.

### 2026-06-14 — M7 step 5a: NPC stealth vision + crouch-at-cover (runtime)
**What:** NPCs can watch for the player. `NpcDef.vision = { range` (fraction of height)`, angle?` (cone °, follows the NPC's facing; omit → all-round)`, effects, unless?, once? }`. Each frame the scene tests the player against each watcher's **range + cone + line-of-sight** (obstacle holes occlude, via a new `Navigation.los`), **suppressed while `unless` passes**; the unseen→seen **edge** runs the effects (subject = the watcher), once if `once`. **Crouch at cover:** triggers gained **`on: 'enter' | 'rest'`** (default enter) — `'rest'` fires only when a mover **stops inside** (reaches a target there), not while passing through — and **`exitEffects`** (the leaving edge). The cover trigger is `on: 'rest'`: crouch (`playAnim pickup`) + `setFlag hidden` on arrival, `hidden=false` on exit; `vision.unless: { flag: hidden }` makes crouching evade detection. Helpers: `Navigation.los`, `movement.facingToAngle`, `Character.getFacing` / `isMoving`. Demo: a **Guard** pings E↔W on the right of the street with a 70° cone — walk into view → it alerts (points) + sets `spotted`; stop at the cover spot → you crouch + `hidden` so the cone passes over.
**Why:** M7 step 5 (stealth) — the original jam idea; chains the trigger + NPC-path + animation systems into the stealth beat. **Cone vs proximity:** both, via the optional `angle`.
**How:** vision is edge-detected like a trigger (a per-NPC `seen` flag); LOS reuses the navmesh `lineOfSight` (a hole between watcher + player blocks sight). The cone test normalises `atan2(playerVec) − facingToAngle(facing)` to [−π, π] against the half-angle. Triggers now track two sets: `inside` (the area, for the exit edge) + `active` (the fire condition — `inArea` for enter, `inArea && !isMoving()` for rest); the `rest` edge fires once the mover settles, so the crouch lands on arrival, not on a walk-through twitch.
**Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200; ported sims **PASS** — cone / LOS (in-cone / behind / too-far / half-angle / omni) + trigger edges (enter vs rest; rest skips a pass-through).
**Follow-ups:** **5b editor** — a vision section in the NPC modal (range / angle / effects / unless) + `exitEffects` in the trigger form + a **cone visualisation** in the preview for tuning (demo positions are rough until then). A persistent crouch pose while hidden is polish.

### 2026-06-14 — M7 step 4c: dialogue voice (gibberish blips + per-NPC clips) — step 4 complete
**What:** Dialogue lines now "speak" as they type. New `src/audio/voice.ts`: `speakBlip` plays a short blip per revealed non-space char (throttled ~70 ms so it reads as speech, not a buzz) — default a **procedural** square-wave note pitched by `NpcDef.voice.pitch`; an uploaded `voice.sound` replaces it with a custom blip. Wired through: `VoiceConfig { sound?, pitch? }` + `NpcDef.voice`; the `dialogueStore` carries the current speaker's voice (`deps.voiceOf`, mirroring `nameOf`); the `DialogueBox` blips on each reveal; the scene resolves `voiceOf(speaker, partner)`. Editor: a **voice** row in the NPC modal (pitch + blip upload + a **Test** button via `previewVoice`). Demo: the `stranger` speaks at pitch 0.8.
**Why:** M7 step 4c — the demo voice + uploadable per-NPC voice. **Completes M7 step 4** (4a actor registry + `wait`, 4b dialogue runtime + UI, 4c voice, 4d editor).
**How:** Blips are a side effect of `revealed` advancing (a small effect keyed on it), throttled inside `speakBlip`; the uploaded clip reuses `audio.ts` `playClip`; procedural is Web Audio (oscillator + a short gain envelope). Respects mute (`isMuted`); the `AudioContext` is lazy + `resume`d (dialogue starts from a click, so it's allowed). Per-line VO (per-node audio) + a player voice stay follow-ups — this is the per-NPC blip model.
**Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** M7 **step 5 (stealth)** + **step 6 (NPC routine)** remain; per-line VO is a nice-to-have.

### 2026-06-14 — M7 step 4d.3: per-NPC appearance + placement dialogue override
**What:** NPCs can have their own look. `NpcDef.view?: ViewDescriptor` (atlas + clips); the runtime renders `cast[npc].view ?? placeholder`. The player's `CharacterEditor` is **generalised to any view** (`{ view, onCreate, onChange, onRemove }`) and reused: the player wires its `createPlayer` / `updatePlayer` / `removePlayer`, and the NPC modal gains an **Appearance** section wired to `patchNpcDef`. Plus a **placement dialogue override** dropdown in `NpcList` (per-scene; falls back to the cast `NpcDef.dialog`).
**Why:** M7 step 4d.3 — finishes the NPC definition editor's appearance (pinned earlier into 4d) + surfaces the per-placement override the schema already had.
**How:** `CharacterEditor` became fully controlled (dropped its store import). The NPC `onChange` merges `{ ...npc.view, ...patch }` (guarded by `npc.view`, defined whenever the form shows); `onCreate` seeds `structuredClone(placeholderView)`. Runtime is a one-line swap (`def?.view ?? placeholderView`, with `def` read before the Character is built). `setNpcPlacementDialog` + a dialog dropdown in the placement form.
**Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** **voice = 4c** is the last piece of step 4; dialogue node-id rename (cascade refs) stays a nicety.

### 2026-06-14 — M7 step 4d.2: Dialogs library + node-tree editor (modal)
**What:** A new top-level **Dialogs** tab + a node-tree editor in the modal — author the 4b dialogue trees no-code. The library lists dialogs (add / remove; ids fixed at creation); **Edit** opens the node editor: pick the `start` node, and per node edit **speaker** (player / cast dropdown, or "— partner —"), **text**, **on-enter effects** (`EffectList`, with the animation / target pickers), a conditional **branch** router (`when → to`), reply **choices** (text + `when` + effects + `next`), and the **next** line (when there are no choices). Node references (start / next / branch.to / choice.next) are node-id dropdowns with a text preview; a stale ref stays selectable, flagged. New `DialogList` + `DialogEditor`; the editor store gains `addDialog` / `removeDialog` / `setDialogStart` / `addDialogNode` / `removeDialogNode` / `setDialogNode`.
**Why:** M7 step 4d's headline — the no-code dialogue authoring, so trees aren't hand-written in `game.json`.
**How:** Composes the existing `EffectList` / `ConditionEditor` / `EditorModal`. Each node is a collapsible `<details>` (overview when closed; expand to edit). `setDialogNode` replaces a whole node — the `NodeForm` builds the patch (`...node, ...p`), and empty effects / choices / branch collapse to `undefined` to keep the data clean. New nodes get auto ids (`node`, `node-2`, …); existing meaningful ids from JSON are preserved (rename = follow-up). The visual flowchart stays M12.
**Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** 4d.3 per-NPC appearance (generalise `CharacterEditor`); placement dialogue override in `NpcList`; node-id rename (cascade refs); voice = 4c.

### 2026-06-14 — M7 step 4d.1: NPC definition modal (dialogue / inspect authoring)
**What:** An editor **modal** + the NPC's interaction config — so the dialogue / inspect runtime is authorable without hand-editing `game.json`. Characters → NPCs → **Edit** opens a modal: assign a **dialogue** (dropdown of the `GameDoc.dialogs` library), set **dialogWhen** (the full `ConditionEditor`, gating the dialogue), and the **inspect** "look at" (text + audio). New `EditorModal` (reusable dev-only modal) + `NpcEditor`; the editor store gains `patchNpcDef(npcId, patch)`.
**Why:** M7 step 4d (editor), first chunk — complements the NPC dialog↔inspect runtime just built, and establishes the **modal pattern** the dialogue node editor (4d.2) + appearance (4d.3) reuse. (Voice waits for 4c.)
**How:** `EditorModal` is a fixed backdrop + roomy panel (close on ✕ / backdrop; clicks inside don't bubble). `NpcEditor` reads the cast NPC live from the store and writes via `patchNpcDef` (a generic merge, so dialog / dialogWhen / inspect — and later view / voice — share one action); empty inspect (no text + no audio) clears the field. Name + speed stay inline in the cast row; Edit opens the deeper modal.
**Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** 4d.2 the Dialogs library + node editor (modal); 4d.3 per-NPC appearance (generalise `CharacterEditor` to any view); placement dialogue override in `NpcList`; voice = 4c.

### 2026-06-14 — NPC dialog ↔ inspect switch (condition-gated)
**What:** An NPC can now be **looked at** as well as talked to. `NpcDef` gains `inspect?: { text?, audio? }` (a "look at" line, like the inspect interactable) + `dialogWhen?: Condition` (gates the dialogue). Clicking an NPC resolves **dynamically** against story state: dialogue if present and `dialogWhen` passes, else inspect (walk up + the player comments), else nothing (the click falls through to a walk). The cursor reflects the resolution **live** — 👄 talk vs 👁 look. The "mode" is just flags: any `setFlag` (trigger / dialogue / interaction) flips `dialogWhen`. Demo: the street `stranger` is **inspect-only until you hold the key** (`dialogWhen: hasItem key`) — then clicking talks (cursor 👄).
**Why:** User wanted NPCs that switch between talk and look, driven from anywhere. Chose the **condition / flag-gated** model — consistent with the one effect/condition vocabulary, no new effect or per-NPC state. (Per-NPC scoped state stays for step 6, the routine.)
**How:**
- `NpcDef.inspect` + `dialogWhen`; the scene resolves the NPC's interaction **dynamically** (`resolveNpc(interaction, state)`) at click + hover, instead of fixed at mount. An NPC is interactive if it has either a dialogue or an inspect; a gated-off click with no inspect doesn't `stopPropagation` → falls through to a walk.
- `sceneHit` (the cursor bridge) returns `talk` / `inspect` from the same resolution, so the icon tracks the gate live as flags change.
- Inspect reuses the protagonist `say()` + audio path (same as the inspect interactable); the player faces the NPC.
- Editor (choosing dialogue/inspect + the gate) stays **4d**; authored in `game.json` for now.
- **Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** 4c voice; 4d the NPC editor (dialogue / inspect / appearance / voice) in the modal.

### 2026-06-14 — Talk cursor (👄) over dialogue NPCs
**What:** A new `talk` `CursorKind` — the 👄 emoji (or an uploaded icon) shows over an NPC the player can talk to (one with a resolved dialogue). Editor: `talk` added to the cursor upload list (👄 fallback).
**Why:** User request — a discoverable affordance that an NPC is talkable. (4b had left the talk-cursor as a follow-up.)
**How:** New `src/engine/hotspots.ts` — a tiny bridge (`sceneHit.kindAt`, like `cameraOffset`) the mounted scene publishes so the DOM `GameCursor`, which can't see moving entities, can ask which clickable NPC is under the pointer. The scene's hit-tester inverts the camera (pointer → design space) and tests each clickable NPC's box (its view's local bounds × the depth scale, around the feet), returning that NPC's cursor kind; cleared on teardown. NPCs win over interactables (matching the click, which NPCs capture via `stopPropagation`). `CursorKind` gained `talk`; both EMOJI maps (runtime + editor) + the editor `KINDS` list updated.
**Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** an NPC **inspect** mode (look vs talk) is under discussion — it'll reuse this same hotspot/cursor path (👁 vs 👄) and the click resolution.

### 2026-06-14 — M7 step 4b: dialogue runtime + UI
**What:** Dialogues are real. **Schema:** a `GameDoc.dialogs` library (`Dialog { start, nodes }`; `DialogNode { speaker?, text?, effects?, choices?, next?, branch? }`; `DialogChoice { text, when?, effects?, next? }`; `DialogBranch { when?, to }`) + `NpcDef.dialog` (default) + `NpcPlacement.dialog` (per-scene override). **Runtime:** a `dialogueStore` (vanilla zustand) walks the tree; a `DialogueBox` DOM overlay types the line out + lists choices. Click an NPC (with a resolved dialogue) → the player walks beside it → it **pauses + faces the player** (and the player faces it) → the conversation runs → on end it **resumes its patrol**. Demo: the street `stranger` has a small branching dialog (first-meet vs repeat via a `met-stranger` flag, a 3-way choice loop, a `setFlag`).
**Why:** M7 step 4b — per-NPC dialogue is the buildable narrative piece; the global scenario stays flags + conditions (branch / choice `when` + effects set flags).
**How:**
- `dialogueStore.begin(deps)` takes scene context (the `Dialog`, `run`, `check`, `nameOf`, `subject`, `onEnd`). `present(node)` routes `branch` **first** — state-driven openings evaluated against the *incoming* state, so a node routes before its own effects (a subtle but important order: putting effects first let the demo's `root` set its own gate and skip the intro). Then it runs effects and shows text + `when`-filtered choices (or falls through a pure router / effects node). `advance()` / `choose()` walk `next`; `finish()` resumes the NPC via `onEnd`; a hops guard caps redirect loops.
- **Scene:** a thin `run(effects, subject)` wraps the shared `runEffects` and also handles `startDialog` (it needs the scene's dialogs + actors). `beginDialogue` pauses / faces the partner + wires `deps`. NPCs with a resolved dialogue get `eventMode='static'` + a `pointertap` (stopPropagation, walk beside via `TALK_GAP`, begin on arrival). `onTap` + the NPC handler no-op while a dialogue is active (input is captured); `destroy()` ends an active dialogue (e.g. a dialogue `goTo` swapped scenes).
- **UI:** `DialogueBox` — a typewriter (steady interval; render-phase reset on line change, **not** setState-in-effect) + choice buttons; the box captures clicks (advance / pick). Mounted in the App overlay; a `useDialogue` hook mirrors `useStory`.
- The engine now imports the `dialogueStore` singleton (the first `state/` import in the engine) — a small boundary smudge to revisit at M13; the store is vanilla (no React / DOM). `dialogs` threaded `GameCanvas → createSceneHost → mountScene`.
- **Verified:** format / typecheck / lint / build green; `content/game.json` valid; a ported logic sim of the demo (branch first-vs-repeat, choices, end) **passes**; dev smoke `/` + `/?edit` 200.
**Follow-ups:** 4c voice (gibberish + uploadable clips); 4d the Dialogs library + node editor in a modal (+ per-NPC appearance, pinned earlier). Talking to a *moving* NPC uses its click-time position (it can drift before arrival) — approach / re-target polish later.

### 2026-06-14 — Editor QoL: effect pickers as dropdowns (animation + target) + greet loop fix
**What:** The effect editor's free-text fields became **dropdowns**: `playAnim` **action** + `wait` **anim** pick from the cast's available action clips, and `playAnim` **target** picks from the player + NPC cast. New `src/editor/effect-options.ts` derives the lists — `actionNames(doc)` (clip-key bases, e.g. `walk.E` → `walk`, unioned across the placeholder + the player view; per-NPC views join in 4d) and `actorIds(doc)` (`'player'` + cast ids). Also fixed the demo: the street `greet` trigger's `wait` now sets `anim: "interact"` so the `stranger` visibly **loops** the gesture during the pause.
**Why:** User feedback — authors couldn't tell which animation names / targets were valid. The reported "gesture isn't looping" was **not a bug**: `playAnim` is a one-shot by design, and the demo's `wait` had no `anim`, so nothing looped. The dropdowns make valid values discoverable; the demo now demonstrates the loop.
**How:**
- One `OptionSelect` (a select like `ItemSelect` / `SceneSelect`) in `EffectList` serves all three pickers; a current value not among the options stays selectable, so custom / stale names + removed cast ids are never silently dropped. `wait.anim` keeps an empty "—" option (optional). Target maps `'player'` ↔ `undefined` (the default) to keep the data minimal.
- `effect-options.ts` is pure derives over the working `GameDoc`. Threaded `animations` + `targets` through `InteractableForm` → `EffectList` / `UsesList`; `EffectList` stays controlled (props, not store reads). 4d's dialogue-node effects reuse `EffectList`, so they inherit the pickers for free.
- **Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200.

### 2026-06-14 — Roadmap: per-NPC appearance pinned into step 4d
**What:** Pinned **per-NPC appearance** (atlas + clips, `NpcDef.view`) as an explicit task in **4d**, which was only loosely implied before ("appearance … layers in over steps 3–6"). 4d is now the NPC's **full-definition editor** (appearance + dialogue + voice) in the modal — appearance by **generalising the player's `CharacterEditor`** to any view (`{ view, onCreate, onChange, onRemove }`), runtime falling back to the placeholder. The cross-scene routine stays step 6.
**Why:** Spotted in the editor — an NPC can set only name + speed; only the player has a view editor (NPCs hardcode the placeholder in `scene.ts`). Folding appearance into 4d keeps the whole NPC definition authored in one modal.
**How:** Roadmap only — 4d expanded into appearance / dialogue / voice; the step-2b cast bullet de-vagued. Implementation lands with 4d.
**Follow-ups:** continue with **4b** (dialogue runtime + UI).

### 2026-06-14 — M7 step 4a: actor registry + `wait` effect
**What:** Lifted `runEffects` out of `mountScene` into a shared module (`src/engine/effects.ts`) over an **actor registry** (`Map<string, Character>` — `'player'` + each cast id), and added the **`wait`** engine effect (`{ kind: 'wait', ms, anim? }`). New `Character` controls: **`pause()` / `resume()`** (indefinite hold, preserves the walk path — for talk-pause), **`pauseFor(ms, anim?)`** (timed hold, optional looping `anim`), **`faceToward(x, y)`** (turn without moving). `CharacterView` gains **`loopAction(action, facing)`** (force-loop a clip; cube = no-op). Editor: `wait` added to the effect dropdown (ms + optional loop-anim). Demo: the street `greet` trigger now `playAnim` + `wait 1500` — the `stranger` reaches forward then lingers ~1.5 s before resuming its loop.
**Why:** M7 step 4a — the foundation 4b–4d (dialogue) stand on. The shared registry is what lets engine effects (`playAnim` / `wait` / pause / face) fire from triggers, clicks **and** (next) dialogue, all addressing the same live characters by id.
**How:**
- `runEffects(effects, actors, store, subject?)` — `playSound` / `playAnim` (target via the registry) / `wait` (on the **`subject`**, the actor the batch is "about"); everything still forwards to the store (engine kinds are no-ops). `mountScene` builds `actors` and a thin `run(effects, subject)` closure; `checkTriggers` passes the **enterer's id** as the subject. `wait` is **skipped for `'player'`** (player control is never frozen — user constraint).
- `Character` pause model rewritten: the single `paused` flag → three holds (`manualHold` / `holdUntil` clock-timed / `oneShotHold`) + `held()`; **"longest wins"** so a `wait` + a concurrent `playAnim` gesture compose (resume on the longer). `syncView` split into `positionView` (always — depth / Y-sort stay live while held) + the pose, so a held frame never restarts a loop clip.
- Schema: `wait` added to `Effect` (engine group); `applyEffect` no-ops it. Editor `EffectList` got the `wait` case (kept the exhaustive switches compiling).
- **Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` 200 + changed modules transform 200.
**Follow-ups:** 4b — `GameDoc.dialogs` + `dialogueStore` + `DialogueBox` (typewriter + choices); click-NPC → walk + `pause()` + `faceToward(player)` + `resume()`.

### 2026-06-14 — Roadmap: M7 step 4 (dialogue) broken into 4a–4d + decisions locked
**What:** Detailed M7 step 4 into **4a** (actor registry + `wait` effect), **4b** (dialogue runtime + UI), **4c** (voice), **4d** (editor). Decisions locked with the user: conditional **`branch`** router on nodes; **per-placement dialogue override**; voice = procedural **gibberish demo default + uploadable per-NPC clips** (real VO); the dialogue **library / node editor opens in a modal** (room to work, and the future flowchart). The global story scenario stays **flags + conditions** for now (visual graph = M12). Roadmap only.
**Why:** Lock the dialogue architecture before building. The **actor registry** (shared live-character control: the scene registers `player` + NPCs by id, `runEffects` lifts to a shared module over it) is the central refactor 4b–4d depend on — it's what lets engine effects (`playAnim` / `wait` / pause / face) fire from the dialogue, not just the scene.
**How:** Roadmap M7 step 4 restructured into the 4a–4d sub-steps.
**Follow-ups:** start **4a** (actor registry + lifted `runEffects` + `wait`).

### 2026-06-14 — Roadmap: NPC pause behaviours folded into step 4 (talk-pause + `wait` effect)
**What:** Filed two requested NPC-pause behaviours into M7 step 4. (1) Talking to an NPC pauses it (+ faces the player) and resumes its loop / pingpong on dialogue end. (2) A `wait` effect (`{ kind: 'wait', ms, anim? }`) lets a trigger make the *entering* NPC linger — optionally **looping an `anim`** (idle-variant / fidget) for the duration — then continue. Both reuse the step-3 pause primitive (`paused`); step 4 adds public `Character.pause()` / `resume()` + `pauseFor(ms)`. Roadmap only — no code yet.
**Why:** Lock the design before step 4. **Key constraint (user):** the `wait` effect **must not pause the player** — only NPC movers — so player control is never frozen.
**How:** Roadmap M7 step 4 (two bullets). Pause resolves "longest wins" so `wait` + `playAnim` compose without cutting each other short.
**Follow-ups:** implement with step 4 (dialogue).

### 2026-06-14 — M7 step 3 follow-up: trigger gestures pause-resume + NPC speed on the cast
**What:** Two refinements to step 3's NPC system. (1) A trigger-driven `playAnim` on a **walking** character now **pauses the walk, plays the one-shot, then resumes** — so an NPC stops to gesture mid-patrol and walks on (the step-1 "defer to idle" never fired on a loop). (2) Walk **speed** moved from the path to the **global cast** (`NpcDef.speed`, editable in Characters → NPCs). Demo: the `stranger` slowly loops a street patrol and pauses to wave each time it crosses the `greet` trigger (`by: npc`, target `stranger`).
**Why:** The user's intended flow — an NPC reaches a trigger, stops, plays, continues — and speed is a property of the character, not of a route.
**How:**
- `Character.playOnce` while walking sets a `paused` flag (freezes movement at an idle pose so the walk doesn't override the one-shot), plays it, and clears the flag on completion. Replaced the `pendingAction` "defer to idle" from step 1.
- `NpcDef.speed` (was `NpcPath.speed`); `mountScene` now takes the **cast** (`Record<NpcId, NpcDef>`, threaded `GameCanvas → createSceneHost`) and applies `setSpeedScale` per NPC. Editor: `setNpcDefSpeed` + a speed field in the cast.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.

### 2026-06-14 — M7 step 3: in-scene NPC paths + NPC-triggered events
**What:** A placement can carry a **patrol path** (`NpcPath { points, mode: once | loop | pingpong, speed? }`) — the NPC walks the drawn waypoints via the nav-mesh (each leg rounds holes), chained on arrival. Triggers now fire on **NPC** entry too (`by: npc | any`), tracked per character — so an NPC reaching a spot fires an event (the chaining). Editor: a **Path** control on each placement (draw waypoints + once / loop / pingpong) with a dashed path + waypoints in the preview. Demo: the street `stranger` loops a patrol; the `greet` trigger (`by: any`) makes the player react when either crosses it.
**Why:** M7 step 3 — NPCs that move + the trigger→NPC chaining the routine (step 6) builds on.
**How:**
- `startNpcPath` resolves the path to design px and drives the NPC `Character` via `setTarget(waypoint, onArrive)`, advancing the index per mode; `Character.setSpeedScale` applies the optional per-path speed.
- `checkTriggers` now iterates the **movers** a trigger's `by` allows (player and/or NPCs) and tracks `inside` as a **Set of character ids** for per-character enter edges (`once` still fires once total).
- Editor: a unified `draw === 'npcpath'` mode appends waypoints (alongside `'npc'` for the spawn); `addNpcPathPoint` / `clearNpcPath` / `setNpcPathMode` — no preview re-mount.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** the cross-scene routine + runtime NPC location (step 6) builds on these in-scene paths; per-NPC appearance + dialogue layer onto the cast (step 4).

### 2026-06-14 — M7 step 2b: NPCs reworked to a global cast + per-scene placement
**What:** NPCs are now **global characters** (`GameDoc.npcs: Record<id, NpcDef>` — id + name; appearance / dialogue / routine layer in later) **placed** into scenes (`SceneData.npcs: NpcPlacement[]` = `{ npc, spawn, when }`). A character is placed in **at most one scene** (editor-enforced — the pickers only offer un-placed NPCs). Editor: a **Characters → NPCs** cast section + the scene's **NPCs** section becomes placement (pick a cast NPC + click-to-place + when). Demo: a global `stranger` placed in the street.
**Why:** Step 2's per-scene NPC data didn't suit recurring characters or the per-character dialogue / voice / routine coming up (which belong to the character, not the scene).
**How:**
- Schema: `NpcDef` (cast) + `NpcPlacement` (replaces `NpcData`); `GameDoc.npcs` + `SceneData.npcs: NpcPlacement[]`.
- Engine: `mountScene` iterates placements, spawns a placeholder `Character` per placement (the cast def has no appearance yet); runtime id = `placement.npc` so `playAnim` target still resolves. No cast lookup needed yet.
- Editor: cast id is **fixed at creation** (like items — placements + effects reference it), name editable; removing a cast NPC **cascades** to drop its placements. A `placedNpcIds` set (across all scenes) drives the one-scene-per-NPC constraint on the place pickers.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** an NPC's **current scene as runtime state** + a `moveNpc` effect (move between scenes) lands with the routine (step 6); per-NPC appearance / dialogue over steps 3–4.

### 2026-06-14 — Roadmap: NPC model reworked (global cast + per-scene placement) + narrative tiers
**What:** Recorded the agreed NPC architecture in M7. NPCs become **global characters** (a cast defined once: id / name now, appearance / sounds / dialogue / routine later) **placed** into scenes (`{ npc, spawn, when }`, click-to-place), **unique** — one NPC is placed in at most one scene. An NPC's current scene is **runtime state**; a `moveNpc` / `despawnNpc` effect + its routine move it between scenes ("appears elsewhere" = a logical action, not a second placement). Narrative is **two-tier**: a global **story scenario** (orchestrates several NPCs + the action sequence) + per-NPC **dialogue** bubbles (a reusable library + inline one-offs). Added **Step 2b** (the global-cast refactor) and **Step 6** (cross-scene routine flowchart). Roadmap only — no code yet.
**Why:** Step 2's per-scene NPCs don't suit recurring characters or dialogue / voice (which belong to the character). Lock the model before step 3 so paths / dialogue build on placements, not per-scene data.
**How:** Roadmap M7 restructured (2b + 6 inserted; 3 / 4 reworded). The player is conceptually "character 0" (unify later). The routine flowchart is its own grand step on top of the in-scene paths (step 3).
**Follow-ups:** implement **Step 2b** (global `GameDoc.npcs` cast + `SceneData.npcs` placements + uniqueness), then step 3.

### 2026-06-14 — M7 step 2: NPC entities
**What:** `SceneData.npcs?: NpcData[]` — characters placed in a scene (id + spawn + optional `view` + `when` gate), spawned alongside the player and **Y-sorted + depth-scaled** in the same band. Static for now (movement is step 3). The `playAnim` effect can now **target an NPC by id**, so a trigger can make an NPC react (a taste of the chaining). Editor: an **NPCs** section (Scene tab) — add / remove / id / when / **Place** (click the preview for spawn) + orange spawn markers. Demo: a `stranger` the street's `greet` trigger waves at when the player approaches.
**Why:** M7 step 2 — the cast that dialogue / paths / stealth build on.
**How:**
- `mountScene` builds the nav-mesh **once** and shares it across the player + every NPC (the visibility graph is O(corners²) to build — don't repeat it per character). Each NPC is a `Character` (placeholder view by default), positioned at its spawn, added to `interactive`, updated each tick, destroyed on teardown. A `when` NPC joins the existing conditional-visibility list — the store subscription is now **unconditional** so entries added after it (NPCs) are still refreshed. `runEffects` resolves `playAnim` `target` → the player or an NPC by id.
- Editor: NPCs are **DOM markers** (no Pixi re-mount on edit), placed via a unified `draw === 'npc'` mode; they render as sprites only in the game.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** per-NPC art upload; `by: npc` trigger checks + NPC movement paths (step 3) → NPCs walk into triggers and chain events.

### 2026-06-14 — M7 step 1: trigger interactables + engine effects
**What:** A 5th interactable kind **`trigger`** — an **enter-driven** hit-area that runs its `effects` when a character's feet enter it (not on click). `by: player | npc | any`, `once` + enter-edge debounce, gated by `when`. New **engine effects** `playSound` + `playAnim` (a one-shot on the player; NPC targets land in step 2). Editor: **+ Trigger** + form (by / once / effects), violet hit-area. Demo: a street trigger that waves (`playAnim 'interact'`) on entering the right side.
**Why:** First M7 piece — a generic "run anything on enter" volume that later reacts to NPCs (chaining) and drives the stealth crouch.
**How:**
- `mountScene` collects trigger volumes (hit-areas → design px) and, each tick, fires the ones the player's feet just entered (tracking `inside` for the edge + `fired` for `once`), gated by `by` + `when`. `pickInteractable` skips triggers (never clicked) and its return type now **excludes** the trigger variant — which kept the click / cursor code type-safe without changes.
- **Engine effects vs state effects:** the scene's new `runEffects` handles `playSound` (audio) / `playAnim` (`character.playOnce`) locally and forwards the list to the story store (which treats the engine kinds as no-ops via `applyEffect`). Both clicks and triggers route through it.
- **Gesture timing:** a trigger fires *mid-walk* (the feet cross into the area before the click point), and a one-shot during a walk is cancelled by the walk pose — so `Character.playOnce` **defers** the gesture to the next idle frame (it plays on arrival). A new walk discards a queued gesture.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200. `sprite-view.playOnce` already no-ops on a missing clip.
**Follow-ups:** `by: npc`, `playAnim` on NPC targets, and `spawnNpc` land in **step 2 (NPC entities)**.

### 2026-06-14 — Planned M7 (NPCs, dialogue & stealth) — folded in triggers + NPC paths + stealth crouch
**What:** Expanded the roadmap's M7 into five chainable steps and added three user-requested mechanics: an **enter-driven `trigger`** interactable (reacts to player + NPCs), **drawn NPC movement paths**, and a **crouch-at-cover** stealth beat. Roadmap only — no code yet.
**Why:** Lock the M7 scope before building, so the trigger → NPC-path → stealth chaining is designed up front.
**How:** Step order **triggers → NPC entities → NPC paths → dialogue → stealth**. Triggers are step 1 because they extend the existing interactable model (a 5th hit-area variant, but feet-enter-driven) and are testable with the player alone. New Effects (`playSound` / `playAnim` / `spawnNpc`) introduce **engine effects** beside the existing state effects. Open decision for step 5: NPC detection model (simple proximity vs vision cone).
**Follow-ups:** start **M7 step 1 (triggers)** next.

### 2026-06-14 — Parallax backgrounds (per-layer scroll rate)
**What:** Background / foreground layers can scroll at their own rate via `LayerData.parallax?` (1 = with the world / default, <1 = farther & slower, 0 = locked to the viewport, >1 = nearer & faster). Applied in the camera loop; the editor exposes a per-layer **parallax** input (Layers list, background / foreground only). Demo: the street's sky / land / buildings are set to 0.3 / 0.5 / 0.7.
**Why:** Depth on scrolling scenes — a distant skyline barely moves while the near ground tracks the character. The last queued piece before M7.
**How:**
- In `mountScene` each non-`mid` layer with `parallax !== 1` is recorded with its base position; `updateCamera` (already per-frame) sets `layer.x = baseX + (1 − p) · (−pan) / scale` — shifting the layer back toward rest by `(1 − p)` of the camera pan (world-local design px, hence ÷ scale). `p = 1` → no shift; `p = 0` → fully counter-shifted (locked to the viewport).
- **Gameplay plane stays at 1:** parallax is restricted to background / foreground; the `mid` / `interactive` band carries the character + hit-areas + the cursor's world-conversion, which must not desync.
- The editor preview has no camera, so parallax shows only in the game; a slow layer must be wider than the scene to avoid revealing its edge (authoring note in the guide).
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** none. **All queued pre-M7 work is done** → next is **M7 (NPCs, dialogue & stealth)**.

### 2026-06-14 — Task B: scene-transition polish (loading spinner + custom wash / art / min hold)
**What:** Scene swaps gained a `GameDoc.transition` config — a **wash colour** (default black), an optional **centred art** image, and a **minimum hold** (ms). A **loading spinner** appears in the corner when a scene mount outlasts ~220 ms (quick swaps stay clean). Editor: a **Transition** section (Project tab) — colour / art upload / min-hold.
**Why:** The await-the-mount-under-cover invariant was already there (no blank frame); this adds feedback for slow mounts and lets a game style its transitions instead of a hard cut to black.
**How:**
- `createSceneHost`: the fade overlay is now a `Container` (colour-wash `Graphics` + optional cover-fit art `Sprite`), alpha-animated as before. The spinner is a rotating arc above it, raised by a `setTimeout(SPINNER_DELAY_MS)` that's cleared the moment `mountScene` resolves; `transition.minMs` then holds the wash for a floor duration. Re-confirmed invariant: **the fade-in never starts until the mount (and its assets) resolves.**
- Schema: `TransitionConfig { color?, image?, minMs? }`, threaded `GameCanvas → createSceneHost`. Editor `setTransition` (document-level, no preview re-mount).
- **Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** none essential. Next: **parallax backgrounds** (the last queued piece before M7).

### 2026-06-14 — Fix: pathfinding rewritten to a visibility graph (no more "walk across the scene")
**What:** Replaced the triangle-channel A\* + funnel with a **visibility-graph** path search. The earcut triangulation now only serves point-in-area tests (spawn / target clamp); the route is the shortest path through a graph over the obstacle corners (+ start / goal), edges being mutually visible (line-of-sight) pairs, A\* over Euclidean distance.
**Why:** Regression after the height-anchored design space: scenes now triangulate at a fixed wide aspect (e.g. 4224×1080), and aligned hole tops (collinear Y) made earcut emit degenerate triangles — which broke the triangle adjacency, so the channel A\* routed "the long way round" and the funnel faithfully followed → the character walked to the far side of the map and back. A randomized street check found 4.6% of paths with a >2.5× detour (worst 21–51×) and 3.6% leaving the walkable.
**How:**
- The **visibility graph** is robust to how earcut splits the polygon (the triangle dual is unreliable for thin / aligned geometry). Corners = the input polygon vertices (walkable + each hole). Corner↔corner visibility is precomputed once; start/goal edges are tested per query.
- **Line-of-sight** = no *proper* crossing of any walkable / hole outline edge **and** the segment midpoint is inside the walkable. The midpoint test is essential: a chord between two *opposite corners of one hole* shares an endpoint with every hole edge, so the strict segment-cross test alone never flags it (it would cut diagonally through the hole). Outline edges come from the **input polygons**, not the triangulation (collinear vertices leave phantom unmatched edges).
- **Verified (Node):** over 4–6k randomized street paths — **0 leave the walkable, 0 cut through a hole interior**; the worst detour is now 2.70× (a legitimate route around a hole). Directed cases (clear line, around-a-corner, weave-the-gaps) all optimal. format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** building the graph is O(corners²) (fine for hand-authored scenes; revisit only if one ever has hundreds of hole corners). Supersedes the earlier "funnel portal orientation" fix below.

### 2026-06-14 — Per-scene depth curve: piecewise scale stops + editor control
**What:** The per-scene depth scaling (character size by feet Y) is now a **piecewise-linear curve** of `{ yFrac, scale }` stops instead of a single near→far ramp. `DepthConfig.stops?` (≥2) defines it; scenes without it fall back to the `near/far` pair (a 2-stop ramp) — fully backward-compatible. New **Depth** section in the editor (Scene tab): a live curve graph + an editable stop list (add / remove / y / scale).
**Why:** A linear 2-point ramp can't express non-linear perspective (e.g. a compressed back wall). Stops give arbitrary control — the smooth version of "scale per Y-third" (hard thirds would pop the character at the boundaries). Composes with `characterScale` (per-scene baseline) and the resolution fit `S`.
**How:**
- `systems/depth.ts`: `DepthScale` now holds sorted px `stops`; `depthScaleAt` walks them (linear between, clamp outside). `data/scene-config.ts` `resolveDepthScale` builds + sorts the px stops from `stops`, or the near/far fallback.
- Editor: `DepthEditor.tsx` (curve `<svg>` + stop rows) writes `setDepthStops` (no preview re-mount — the graph is the live feedback; the spawn character updates on the next mount / Test in game).
- **Verified:** format / typecheck / lint / build green; a Node test confirms back-compat equals the old linear ramp, and piecewise interpolation + end-clamp + unsorted-input sorting; dev smoke `/` + `/?edit` 200.
**Follow-ups:** ghost characters at a few Y in the preview (richer feedback); demo scenes still use near/far (exercises the fallback). Next: **parallax backgrounds**; **Task B** (transition polish) still pending.

### 2026-06-14 — Editor: aspect-locked, re-fitting scene preview (areas no longer drift on resize)
**What:** The editor preview is now a **stage box of the scene's aspect**, centred in the pane; the Pixi canvas and the DOM overlays share that one box, so drawn areas (walkable / holes / hit-areas) stay put when the side panel is resized. `mountPreview` builds in design px under a `root` container scaled to fit the box and **re-fits on resize** (ResizeObserver on the canvas) — no re-mount. Scene **width** edits now re-mount the preview (commit on blur / Enter) so the box re-aspects.
**Why:** Bug: widening the panel changed the preview pane size, but the Pixi content was laid out once at mount and never re-fit — so the background drifted from the overlay grid, and an area drawn afterwards landed off-target in the game. (Also delivers the deferred aspect-correct preview: a wide scene shows its true shape instead of stretched-to-pane.)
**How:**
- **Editor:** a `.editor__stage` div sized in JS to `contain` the design aspect in `.editor__preview` (ResizeObserver on the pane); `<ScenePreview>` + overlays live inside it. Stage-size changes dispatch a `resize` so Pixi (`resizeTo: host`) re-fits the canvas. Width/characterScale use commit-on-release drafts; `setSceneWidth` now re-mounts.
- **Preview:** content built in design px under `root`; `root.scale = canvasHeight / designHeight` (uniform, undistorted), recomputed by a ResizeObserver on `app.canvas`. Layer drag is now scale-aware (`display.parent.toLocal`).
- **Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** depth-scale stops (next, A.2); game-camera dead-zone still open.

### 2026-06-14 — M6: camera — height-anchored design space (responsive scaling + per-scene character size)
**What:** Replaced the viewport-multiple "world" model with a **design space**: the document has a `referenceHeight` (px, default 1080) and each scene a `width` (design px) + `characterScale`. The game wraps the bands in a `world` Container scaled so the **design height always fills the viewport** (one uniform scale `S = viewportHeight / referenceHeight`), then pans horizontally to keep the character centred (clamped; pillar-boxed if the world is narrower). New `engine/camera.ts` shares `{x, y, scale}` so the **DOM cursor** inverts the transform to design space. Editor: **Scene width** + **Characters %** (Scene tab) and **reference height** (Project → Display). Street demo → `width 4224, characterScale 2.2`; room → `1920, 2.4`. Closes M6.
**Why:** The old model tied the world size to the viewport, so a scene's aspect — and the character's on-screen size — drifted with the device. Anchoring on the **locked axis (height)** keeps art + characters a constant fraction of the screen on phone and 4k alike (the conclusion Unity's ortho camera / Godot `keep_height` also reach); `characterScale` then lets a scene drawn from a different angle resize the cast without retuning the perspective gradient (`depth`).
**How:**
- **One design space, one scale.** Everything (layers, walkable, holes, spawn, characters, depth) resolves in design px (= `scene.width` × `referenceHeight`); the `world` Container's `scale = S` cascades to all of it, so nothing desyncs. `interactive.toLocal` is inside `world` → clicks already arrive in design coords. Shared `designSize()` in `data/scene-config.ts`.
- **Resize-safe for free.** `updateCamera` (ticker, every frame) reads the *current* `app.screen`, recomputes `S` + the pan, and writes them — so a window resize / rotation re-fits with **no re-mount and no teleport** (the character keeps its design position). Vertical never scrolls (design height maps exactly onto the viewport height).
- **Character size = `depthScaleAt(feetY) × scene.characterScale × S`** (Character holds the per-scene factor; `S` comes from the world scale). The editor preview multiplies by the same factors (× `box.height / referenceHeight`) so the % slider reads truthfully.
- **Camera clamp:** `place(content, viewport, target)` centres when the content fits (pillar-box), else clamps the pan to `[viewport − content, 0]` around the character.
- **Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200. (Browser check is the user's; the dev draft shadows `content/game.json`, so **Discard** to see the demo numbers.)
**Follow-ups:** aspect-correct editor preview (a wide scene still stretches to the pane — the `characterScale` height-fraction is already faithful, only the width shape isn't); dead-zone smoothing; a viewport-bounds indicator. **M6 complete.** Next: **Task B — transition polish** (await-mount invariant + loading icon + custom transition art), then **M7**.

### 2026-06-14 — Fix: nav-mesh funnel portal orientation (direction bug)
**What:** Fixed pathfinding so the character no longer walks **through** a hole or takes a huge detour when travelling in certain directions. The funnel's portal left/right was derived from the triangle winding, which was only correct for **one** travel direction — right→left channels got flipped orientation, so the funnel string-pulled across the obstacle. Now left/right is oriented by the **travel direction** (curr centroid → next centroid).
**Why:** User report — a hand-drawn hole: the character walked through it and detoured to the far side of the map and back.
**How:**
- For each channel edge, `left` = the shared vertex on the left of the (currC → nextC) direction (`area2 < 0`), `right` = the other. Robust whichever way the channel runs.
- **Side effect:** also removed the suboptimal routing — the aggressive Node test's path/straight ratios dropped from 1.3–2.3 to **1.0–1.04** (near-optimal); the previous orientation was both wrong (R→L) and long.
- **Verified by Node tests:** 6 aggressive cases (directional / edge / non-convex incl. the previously-failing **R→L**) all walkable; the original 12-check regression + the street-holes check still pass. Plus format / typecheck / lint / build green; dev smoke 200.
- **Note on the user's #1 (no pre-added holes):** the editor + game were running the **localStorage dev draft** (from earlier testing), which shadows `content/game.json`, so the street holes I added didn't show. **Discard the draft** to see them — or a freshly drawn hole now routes correctly.

### 2026-06-14 — M6 editor: draw obstacle holes
**What:** The editor can draw obstacle **holes** (Scene tab → Holes). New `editor/HoleOverlay.tsx` (dashed-red polygons over the preview, the selected one with vertices; draw mode = click to add points). The Editor's draw modes are unified into one `Draw` state (`walkable | hole | hitarea | null`); `editor-store` gains `addHole` / `setHole` / `removeHole`. Also: **two obstacle holes added to the street scene** in `content/game.json` so pathfinding is visibly testable.
**Why:** M6 — author the obstacles the nav-mesh routes around, and give the demo something to route around (its walkables were convex quads → straight paths).
**How:**
- **Holes are navigation-only** (invisible in-game; the nav-mesh cuts them out) → a DOM overlay + no `revision` bump, like walkable. Per-hole select + Draw / Clear / delete, mirroring the interactables list.
- **One draw mode at a time:** replaced the per-overlay booleans with a single `Draw` union, so walkable / hole / hit-area drawing are mutually exclusive by construction.
- **Street holes verified:** a Node check on the real street walkable + holes — a left→right path returns **4 waypoints** (routes around) and the hole centre is not `contains`ed.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; nav check passes.
**Follow-ups:** vertex dragging on the overlays; in-game obstacle visuals are the author's own layers; then the **camera** (the last M6 piece).

### 2026-06-14 — M6: nav-mesh pathfinding (A\* + funnel)
**What:** The character now walks a **nav-mesh path** instead of a straight line. New `systems/navmesh.ts`: triangulate the walkable polygon minus obstacle holes (earcut), A\* over the triangle adjacency graph, then the **funnel** (string-pulling) algorithm → a smooth shortest path of waypoints. Schema: `SceneData.holes?: Polygon[]`. `Character` rewritten to **follow waypoints** (`findPath` on `setTarget`, walk waypoint-to-waypoint, clamp via the mesh); `scene.ts` builds the navigation from the resolved walkable + holes. **New dependency: `earcut`** (3.0.2, ISC, ~2 kB) — the de-facto polygon triangulator; hand-rolling hole-aware triangulation is error-prone.
**Why:** M6 pathfinding — straight-line + clamp-and-slide cut corners / hugged walls; the nav-mesh routes around concave walls + holes with natural shortest paths.
**How:**
- **Nav-mesh, not grid** (the user's choice): exact geometry, smooth funnel paths, scales to large open areas; holes = polygons cut from the triangulation. Pure geometry (no Pixi) → unit-testable.
- **Verified by a Node test** (`--experimental-strip-types`, 12 checks): a straight path on a convex square, routing around an **L-shape**'s inner corner, **avoiding a central hole**, plus clamp / contains — which confirmed the funnel portal orientation.
- The demo's walkables are convex quads (so straight paths) — the win shows on concave areas + holes (editor hole-drawing is the next M6 editor piece).
- **Verified:** format / typecheck / lint / build green; nav test 12/12; dev smoke 200.
**Follow-ups:** editor **hole drawing** (M6 editor); the cursor's walk-check still uses the outer polygon (ignores holes); a priority-queue A\* if meshes grow large; then the **camera**.

### 2026-06-14 — M6: scene transitions (fade through black)
**What:** Scene swaps now **fade through black** instead of hard-cutting. `createSceneHost` adds a black overlay above every scene (a huge rect, `eventMode none`), animated on `app.ticker`: on a `goTo`, fade out → destroy old + mount new → fade in. The first scene fades in from black (a soft intro).
**Why:** M6 — the `goTo` swap was an instant cut with a possible blank frame during the async mount; the fade hides both.
**How:**
- **Fade = alpha-lerp on the ticker** (`FADE_MS` each way); `fadeTo(target)` returns a promise the async `show()` awaits, so the destroy + mount run at full black.
- The overlay sits at `zIndex 10000` on the sortable stage, so it stays on top across swaps (a scene `destroy` only tears down the bands, not the fade); `eventMode none` so it never blocks clicks.
- Only the game (`createSceneHost`) fades — the editor preview (`mountPreview`) is a still.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; `fadeTo` in the transform. The actual fade is the user's browser check (walk the door street ↔ room).
**Follow-ups:** M6 **pathfinding** (A\* over the walkable mesh) next, then the **camera** (+ the overlay-follows-world note in the roadmap).

### 2026-06-14 — M5 step 4: editor Characters tab (player view descriptor)
**What:** The protagonist is now **authorable**. `GameDoc.player?: ViewDescriptor` holds the player's atlas + clips; the game + editor preview use it (threaded into `mountScene` / `mountPreview` / `createSceneHost`, default = the placeholder). New `editor/CharacterEditor.tsx` in the **Characters tab**: create-from-placeholder / remove, upload an atlas (with a numbered frame-grid overlay), set the frame grid (W × H, columns) + anchor, and define clips (name + frame indices + fps + loop). `editor-store` gains `createPlayer` / `removePlayer` / `updatePlayer` (bump `revision` so the preview re-mounts the sprite). Closes M5.
**Why:** M5's editor step — make the character data, not code.
**How:**
- **Threaded, not global:** the player view is a param on the engine mount fns (`playerView: ViewDescriptor = placeholderView`); the game passes `gameDoc.player`, the preview passes the editor doc's `player` (undefined → default placeholder). Editing bumps `revision` → the preview re-mounts the new sprite.
- **Frame-index authoring:** the atlas preview overlays a numbered grid (rows from image-height / frame-height) so clip frame lists are easy to fill. Clips are keyed `state.facing` (5 base dirs, W-side mirrors) + one-shot names — matching the runtime resolver.
- **Input ergonomics:** clip name + frames commit on **blur** (so typing doesn't re-key the row); grid / anchor / fps + loop are live.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, CharacterEditor). Authoring + the in-game custom character is the user's browser check.
**Follow-ups:** a footprint (separate from anchor); a visual frame-picker (click frames on the atlas); per-trigger animation assignment (now by convention); NPC characters (M7). **M5 complete** → next **M6 (Movement & camera)**.

### 2026-06-14 — M5 step 3: one-shot animations + onComplete
**What:** Clicking a pickable / interact (or using an item) now walks the character there, plays a **one-shot** animation (pickup = a crouch, interact = a forward reach), and runs the **effects on the animation's completion** (so the item appears after the reach-down). New `CharacterView.playOnce(action, facing, onComplete)`; `createSpriteView` plays a non-looping clip, fires `onComplete`, then reverts to the pose. `Character.setTarget` gains an optional `action`; on arrival it plays the one-shot and defers `onArrive` until it finishes. `scene.ts` maps interactable kind → one-shot (pickable → pickup, interact + use-on-object → interact). The placeholder atlas gained pickup + interact rows.
**Why:** M5 step 3 — actions land with weight (the protagonist performs the pickup / use before the result), reusing the existing arrive-callback path.
**How:**
- **Pose lock:** during a one-shot, `applyPose` keeps the clip (only turns); the `AnimatedSprite.onComplete` fires the callback + reverts. A new walk (state `walk`) cancels the one-shot **without** firing it (an interrupted pickup = no pickup).
- **Graceful fallback:** no clip for an action → `onComplete` fires immediately (the cube view + descriptors without one-shots still run the effects).
- **Placeholder one-shots:** `drawBody` gained `crouch` (lowers the upper body, feet planted) + `reach` (right arm forward); two extra atlas rows (`pickup`, `interact`).
- **Verified:** format / typecheck / lint / build green; dev smoke 200. The crouch / reach + effects-after-animation timing is the user's browser check.
**Follow-ups:** per-item pickup variants + a **talk** one-shot for inspect / dialogue (M7); **M5.4** the editor Characters tab (upload atlas, define clips incl. one-shots, map triggers).

### 2026-06-14 — M5 step 2: 8-direction walk cycle
**What:** The character plays **directional** clips. `ViewDescriptor.clips` are keyed `state.facing` (e.g. `walk.E`, `idle.S`); `createSpriteView` resolves the clip from the character's `facing` and **mirrors the W-side** (W / SW / NW = E / SE / NE flipped via `sprite.scale.x`), so 8 facings need only ~5 base directions. The procedural placeholder atlas grew to **5 rows** (S / SE / E / NE / N) × 6 frames, with a head/nose marker pointing in the facing direction (N = the back of the head).
**Why:** M5 step 2 — facing → the right walk cycle; mirror-to-5 keeps the atlas small (the `asset_pipeline.md` plan).
**How:**
- **Mirror map:** `BASE_FACING` sends each facing to its base direction (W→E, SW→SE, NW→NE); `MIRRORED` flips `scale.x` for the W-side. Resolution falls back `state.facing → state → idle.facing → idle`, so a state-only descriptor (M5.1 style) still works.
- **Placeholder conveys direction via the head:** the body + walk cycle are shared across rows; only the head/nose differs (front / diagonals show a nose pointing the right way; N is the darker back of the head). Real per-direction art comes from the editor upload (M5.4).
- **Verified:** format / typecheck / lint / build green; dev smoke 200. The actual 8-dir cycle + W-side mirror is the user's browser check.
**Follow-ups:** **M5.3** one-shots (pickup / interact) + `onComplete`; **M5.4** the editor Characters tab (upload atlas, define clips, map state / facing, anchor + footprint).

### 2026-06-13 — M5 step 1: AnimatedSprite character + view descriptor + placeholder atlas
**What:** The character is now an **`AnimatedSprite`** driven by a **`ViewDescriptor`** (atlas + grid + `state → clip`), replacing the placeholder cube — a data change via the `CharacterView` interface, not a logic refactor. New: `data/schema.ts` `ViewDescriptor` + `AnimClip` types; `entities/placeholder-atlas.ts` (a procedural character spritesheet drawn in code → PNG data-URL + its descriptor, idle + walk clips); `entities/sprite-view.ts` `createSpriteView` (loads the atlas, slices frame sub-textures, builds clips, plays idle / walk per `MoveState`, mirrors for west facing). `scene.ts` mounts it in both the game + the editor preview.
**Why:** M5 step 1 — realise the view-descriptor model from `asset_pipeline.md`; swap the cube for a real animated sprite, testable now via a procedural placeholder (no real art needed).
**How:**
- **Placeholder = a baked atlas, same path as real art:** the figure is drawn on a 2D canvas → `toDataURL` → loaded like any uploaded atlas, so the editor's future atlas upload reuses the exact `createSpriteView` load path.
- **View ≠ depth:** the AnimatedSprite is a child of the view `container`; facing mirrors `sprite.scale.x` while `Character` depth-scales `container` — independent axes.
- **Frames:** sub-textures share one atlas source (`new Texture({ source, frame })`); clips set `animationSpeed = fps / 60` + `loop`. `AnimatedSprite` auto-updates on `Ticker.shared` (movement stays on `app.ticker`).
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, both modules). The actual animation (idle bob / walk cycle / facing mirror) is the user's **browser check** — if it doesn't animate, switch the AnimatedSprite to the app ticker (a `view.update` hook).
**Follow-ups:** **M5.2** real 8-direction frames (clip keys `walk.E` …, mirrored to ~5) wired to facing; **M5.3** one-shots (pickup / interact) + `onComplete`; **M5.4** the editor Characters tab (upload atlas, define clips, map state / facing, anchor + footprint).

### 2026-06-13 — Editor IA: top-level tabs (Scene / Items / Characters / Project)
**What:** The editor panel is split into top-level **tabs** instead of one long scroll — **Scene** (Scenes · Walkable · Layers · Interactables), **Items** (Items · Recipes), **Characters** (placeholder for M5), **Project** (Cursors · Document). A persistent **footer** holds **▶ Test in game** / Discard (always reachable). Sections still collapse (accordion) within a tab; the panel stays drag-resizable.
**Why:** The user flagged the single panel was getting crowded; the big cohesive blocks (scenes / items / characters) deserve separation, and M5's character & animation editor needs its own space ("a second level"). Pre-M5 IA so M5 drops into the Characters tab.
**How:**
- **Tabs = a `tab` state** + a content switch; `changeTab` resets the draw modes. Panel layout is now `tabs (fixed) / tab-content (flex:1, scroll) / footer (fixed)`; the preview + overlays + resizer are unchanged. Test / Discard moved into the persistent footer (testing is frequent); Cursors + Document live in **Project**.
- **Verified:** format / typecheck / lint / build green; dev smoke 200. Tab switching / footer feel is the user's browser check.
**Follow-ups:** **M5** fills the Characters tab (character list + animation editor, likely its own master-detail level). Test animations for M5 = a **procedural placeholder atlas** (code-drawn frames → `AnimatedSprite`), matching the geometric-placeholder philosophy.

### 2026-06-13 — M4 cursor polish #2: walk-only-on-walkable + default cursor
**What:** The `walk` cursor (👣) now shows **only over the walkable area**; anywhere else over the scene (sky, walls, outside any area) shows a new **default** `CursorKind` (↖️ emoji or an uploaded icon). So the game has a fully custom cursor — no native pointer anywhere over the scene. Schema: `CursorKind` gains `default`. `GameCursor` hit-tests the walkable polygon (`containsPoint`) after the hotspot check; `CursorEditor` lists `default` (upload an icon). Also: **dropped #5** (pickable walk-through) — the user re-tested and the current click-on-hit-area pickup is already correct. Guide updated.
**Why:** The user's last M4 cursor polish — `walk` was showing over non-walkable areas (e.g. the sky); the walk cue should appear only where you can walk, with a custom default elsewhere.
**How:**
- **Hover order:** hotspot (`pickInteractable`) → its kind; else inside the walkable polygon (`containsPoint`, fractions → px) → `walk`; else → `default`.
- Adding `default` to `CursorKind` forced both EMOJI maps (GameCursor + CursorEditor) to list it (↖️), enforced by TS.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; `containsPoint` in the transformed `GameCursor`. The over-sky-vs-floor feel is the user's browser check.
**Follow-ups:** none — **M4 is fully complete** (core + all additions; the full look/use/talk verb modes remain the deferred optional). Next: **M5 — Characters & animation**.

### 2026-06-13 — M4 #1: inspect interactable (protagonist text + voice)
**What:** A 4th interactable kind, **inspect** — a plain click makes the protagonist "speak": its `text` shows as the narration line + an optional uploaded `audio` voice clip plays. New `CursorKind 'inspect'` (👁 emoji / uploaded icon). Schema: an `inspect` variant (`{ id, hitArea, text?, audio?, when? }`). Runtime: `scene.ts` walks to it, then `say(text)` + plays the clip; `audio.ts` gains `playClip(src)` (Howler; format derived from the `data:audio/<x>` mime, Howls cached). Editor: a **+ Look** button, an inspect form (text + audio upload), a teal hit-area, and the inspect cursor in `CursorEditor` / `GameCursor`. Guide updated.
**Why:** The user's important M4 addition — a "look at / comment" object with the protagonist's voice, distinct from the silent `examine` text.
**How:**
- **Audio via dynamic import:** `scene.ts` does `import('../audio/audio').then((m) => m.playClip(...))` only when a clip fires. `audio.ts`'s only static importer is `Menu.tsx` (game-only), so the **editor preview never loads audio** (no stray ambient) — the dynamic import keeps the engine's static graph audio-free too.
- **inspect has no effects/uses/examine** — just text + audio (the user wanted "just dialog"). `effectsFor` / `effectsForUse` gained inspect cases; the form gates the other fields off; the `say(examine)` line is now guarded to non-inspect kinds (a first typecheck caught `hit.examine` on the inspect variant).
- **Cursor:** adding `inspect` to `CursorKind` forced both EMOJI maps to list it (👁) — enforced by TS.
- Dialogue here is a single line + a clip; the full branching dialogue runtime is still **M7**.
- **Verified:** format / typecheck / lint / build green; dev smoke 200. Authoring + in-game speech / voice is the user's browser check.
**Follow-ups:** **#5 pickable** deliberate-click pickup is the last M4 addition; branching dialogue + voice-while-speaking is M7.

### 2026-06-13 — M4 polish: accordion sections, resizable panel, cursor fix
**What:** Editor QoL + a cursor bug fix. (1) Editor sections are now **collapsible** (a `Section` wrapper over native `<details>`, default open). (2) The side panel is **drag-resizable** (a splitter between panel + preview; `panelWidth` state; flex layout). (3) **Cursor fix:** the native pointer still showed under the custom icon — `mountScene` set `app.stage.cursor = 'pointer'`, which Pixi writes onto `canvas.style.cursor`, overriding the CSS `cursor: none`. Set it to `'none'`; the custom icon is offset up-left of the pointer so it's not on the click point.
**Why:** The editor grew long (9 sections) → collapsing + widening help; and the user reported the native cursor showing under the icon.
**How:**
- **Accordion = `<details>`** (controlled `open` + `onToggle` → per-section `useState`, default open) — no deps, keyboard-accessible.
- **Resize:** flex layout (`panel | resizer | preview`); the splitter's mousedown tracks window mousemove → `panelWidth` (clamped 240–720). A `useEffect` on `panelWidth` dispatches a window `resize` so Pixi's ResizePlugin re-fits the preview to its container.
- **Cursor:** the real bug was Pixi writing the canvas cursor; `stage.cursor = 'none'` fixes it. Icon offset via `transform: translate(-82%, -82%)` (tunable).
- **Verified:** format / typecheck / lint / build green; dev smoke 200; `cursor="none"` in the transformed `scene.ts`. Collapse / drag / cursor feel is the user's browser check.
**Follow-ups (still M4):** **#1 inspect** interactable (protagonist text + audio + eye cursor) is next; then **#5 pickable** deliberate-click pickup.

### 2026-06-13 — M4: context cursor (icons + emoji fallback)
**What:** An in-game pointer that changes by what it's over — walk / pickable / interact / exit — using an uploaded icon per context, else an emoji fallback (👣 ✋ ⚙️ 🚪). New `ui/GameCursor.tsx` (DOM cursor following the mouse; hover hit-test via `pickInteractable`; native cursor hidden on the scene canvas) + `editor/CursorEditor.tsx` (upload / clear an icon per kind). Schema: `GameDoc.cursors?` (`CursorKind` → icon URL). `editor-store` gains `setCursorIcon`; the Editor gets a global **Cursors** section. Guide updated.
**Why:** The user asked for the optional cursor part of M4's verb/cursor item, kept **simple** (icons + emoji) — not the full look/use/talk verb modes.
**How:**
- **Hover logic in the DOM, not Pixi:** the game canvas is fullscreen, so `clientX/Y` map to scene px → `pickInteractable` (pure, no Pixi) finds the hotspot under the mouse on each `mousemove`. No scene changes, no per-move store writes.
- **Native cursor hidden on `.game-canvas canvas`**; the custom cursor shows only while the mousemove target is the canvas, so UI chrome keeps its normal pointer.
- **Position via a ref** (no re-render); only kind / visibility use state, and bail out when unchanged.
- **Icons = uploaded data-URLs** on `doc.cursors` (survive Export); emoji fallback per kind.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, both modules). Feel + hover are the user's browser check.
**Follow-ups:** a "use item" cursor (the selected item's icon); walkable-vs-blocked distinction; the full look/use/talk verb system stays the deferred optional. **M4 is complete.**

### 2026-06-13 — M4 step 3: examine ("look at") + inventory item icons
**What:** **Examine** — `examine?` text on interactables + items; a plain click on an object (no item selected), or a click on an inventory item, shows it as a transient **narration line** (auto-clears). **Item icons** — `ItemDef.icon` is now authorable + rendered in the inventory. Schema: `examine?` on the three interactable variants + `ItemDef`. Runtime: `StoryStore` gains a **store-only** `narration` + `say()`; `scene.ts` narrates examine on click; `Inventory` narrates item examine + renders the icon; `App` shows the narration line. Editor: `InteractableForm` gets a **look** field; `ItemCatalogue` gets an **examine** field + an **+ Icon** upload (data-URL) with thumbnail / clear; `editor-store` gains `setInteractableExamine` / `setItemExamine` / `setItemIcon`. Guide updated.
**Why:** M4's last core piece (examine) + the user's item-icon request. Chose **upload** over auto-cropping the scene art — simple, explicit, reuses the layer-upload pattern; auto-crop is fragile (hit-area includes background; builtin vs image differ).
**How:**
- **Narration is store-only, not `StoryState`** → the save snapshot (which cherry-picks StoryState fields) ignores it; `reset` / `load` clear it; a 4 s React timeout auto-clears the line.
- **Examine fires on a plain click** (no selected item) so it doesn't fight item-use; inventory examine fires on any slot click.
- **Icons = uploaded data-URLs** on the item (survive Export), rendered in the slot (falls back to the name label).
- **Verified:** format / typecheck / lint / build green; dev smoke 200. Authoring + in-game narration / icons are the user's browser check.
**Follow-ups:** examine on an `exit` is cut short (the `goTo` changes scene immediately); optional auto-crop icon; the optional **verb / cursor** system would make "look vs use vs talk" explicit. **M4 core is complete** (verb/cursor is the only optional left).

### 2026-06-13 — M4 step 2b: item catalogue + recipe table
**What:** Document-level data authoring. New `editor/ItemCatalogue.tsx` (add / remove items, edit name; id fixed) and `editor/RecipeTable.tsx` (add / remove `a + b → output` recipes, reusing `ItemSelect`). Editor gains **Items** + **Recipes** sections (global, before Playtest). `editor-store` gains a `patchDoc` helper + `addItem` / `removeItem` / `setItemName` / `addRecipe` / `removeRecipe` / `setRecipe`. `editor_guide.md` gains an "Items & Recipes" section (per the new docs rule).
**Why:** M4 step 2b — author the inventory items + combine recipes that the interactable logic (giveItem / uses / recipes) references, completing M4's logic data.
**How:**
- **Document-level (`patchDoc`)** — items/recipes live on the `GameDoc`, not a scene, and don't touch the Pixi preview → no `revision` bump. The sections render from `doc.items` / `doc.recipes` regardless of the selected scene (grouped with Playtest / Document at the panel bottom).
- **Item id is fixed at creation** (auto `item`, `item-2`…) — interactables / uses / effects / recipes reference it, so only the display name is editable (cascade-rename is a follow-up). Pickers show items by name, so the generic id rarely surfaces.
- **Recipes reuse `ItemSelect`** (a / b / output) from the effect & condition editors.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, both modules). Authoring + the in-game combine is the user's browser check.
**Follow-ups:** cascade-rename item ids; warn when deleting a referenced item; item **icons** (upload + render in the inventory). **M4 step 3 — examine** ("look at" text) is the last M4 piece.

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
