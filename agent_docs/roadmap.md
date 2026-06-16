# Roadmap — data-driven point-and-click engine + visual editor

## Goal

A reusable, data-driven point-and-click engine plus a visual no-code editor,
open-sourced as npm package(s). Near term: ship a 2–3 scene game-jam slice.
Long term: author full games (dozens of scenes) with no code.

## Principles (don't break these)

- **Schema-first / data-driven.** Every system reads/writes ONE typed,
  serializable `GameDoc`. No hardcoded content. The schema is the public API
  (eventual npm surface) — keep it minimal, extend via discriminated-union
  `kind`s (backward-compatible), and version it.
- **One condition/effect vocabulary** powers ALL gating: exits, interactions,
  dialog, NPCs, recipes.
- **View is separate from logic.** A character is abstract state + a swappable
  view; swapping the placeholder for an animated sprite is a data change.
- **Clean boundaries = future packages:** `engine` (runtime, no React/DOM) ·
  `ui` (React overlay) · `editor` (dev-only) · `content` (data + assets).
- **Editor is dev-only.** The player build ships baked data + assets, no editor.
- **Game runs without the LLM** (persuasion NPC stays an optional, stubbed bonus).
- **Each feature is schema-first → runtime → editor.** Extend `GameDoc`, build the
  runtime that plays it, then add the editor controls — so the editor never forces
  a refactor.

## Sequencing

Data foundation → finish gameplay (the jam slice) → runtime framing (save / title)
→ the editor → feature systems (characters & animation, movement & camera, NPCs,
cutscenes, audio, atmosphere, theming) → packaging.

## Working cadence

- After finishing a milestone (or a meaningful chunk of one), the agent **proposes
  the next milestone/phase** and **ticks the checkboxes** below.
- Each task still follows `workflow.md`: analyze → architecture → execute → log →
  commit-message → point to next.

---

### M0 — Data-driven foundation  (backbone for everything)

- [x] `GameDoc` / `SceneData` schema — typed, serializable (scenes, layers,
      walkable, interactables, items, flags, start scene).
- [x] Condition/Effect vocabulary + evaluator (hasItem / flag / visited / all /
      any / not ; setFlag / giveItem / takeItem / goTo / startDialog).
- [x] Zustand story store: flags, inventory, currentScene, visited — single
      source of discrete state, survives scene changes.
- [x] Load a `GameDoc`; re-express the current street scene as `SceneData`
      (engine consumes data; geometric layers via a builder registry).

### M1 — Playable jam slice  (original backlog, built data-driven → shippable)

- [x] Scene transitions + persistence — exits gated by Condition; inventory/flags
      survive scene 2.
- [x] Interaction: click object → effect (React overlay + Zustand). _(Dialog
      runtime is M7; `startDialog` is a marker for now.)_
- [x] Inventory: add + combine (data-driven recipes) + "use item on object".
- [x] UI: simple menu.
- [x] Audio: ambient loop + ≥1 SFX (Howler, triggered by state).
- [ ] Stealth detection → folded into **M7** (NPC vision).
- [x] Author the 2–3 scene vertical slice → JAM BUILD DONE. _(2 scenes, full
      mechanics, placeholder art; stealth optional.)_

> Feature milestones below each have a **runtime** part (the engine does it) and an
> **editor** part (author it visually). Build runtime first. Order is a suggestion —
> later milestones can be reprioritised.

### M2 — Runtime polish & framing  (completes the game frontend; no editor)

- [x] **ESC** opens / closes the menu.
- [x] **Save / load** — one slot in IndexedDB (serialise the story state);
      surfaced as Save (in-game) + Continue (title screen).
- [x] **Title / start screen** — New game / Continue (DOM for now). In-game menu
      becomes Save + **Exit to title** (confirmed: unsaved progress is lost). The
      visual SVG composition of the title is the editor's job (M11).

### M3 — Editor core (dev-only)

- [x] Edit mode (`?edit`, DEV-only) — React editor shell beside the live preview.
- [x] Scene panel: list / add / delete / select + live preview; editable working doc.
- [x] Layers: upload SVG → place in band, reorder, set role. _(Walkable drawing ✓ ·
      save/load `GameDoc` as JSON ✓ · edit→play test loop ✓ · layer upload ✓ ·
      drag-to-position ✓ · `width`-fit strips ✓ — **M3 core complete**.)_

### M4 — Editor: interactables, items, recipes, exits

- [x] Place pickable / interact / exit objects; draw hit areas. _(+ id & the
      essential field: pickable→item, exit→target scene. Click-to-select +
      vertex editing are follow-ups.)_
- [x] Forms for Condition + Effect + `uses` (per-interactable logic; recursive
      condition editor with all/any/not).
- [x] Item catalogue + recipe table.
- [x] **Examine** — "look at" text for items / objects (+ inventory item icons).
- [x] _(optional)_ **Context cursor** — icon-per-hotspot pointer (walk / pickable /
      interact / exit) + emoji fallback; runtime + editor. _(Full look/use/talk verb
      modes stay deferred — single-click model kept; examine is on a plain click.)_

M4 additions (raised after the core was done):

- [x] **Inspect** interactable (4th kind) — a plain click makes the protagonist
      "speak" (text + audio); its own cursor (eye emoji / uploaded icon).
- [x] Editor QoL: collapsible **accordion** sections.
- [x] Editor QoL: **resizable** side panel (drag to widen).
- [x] Cursor polish: hide the native cursor; offset the icon off the pointer.
- [x] ~~Pickable walk-through protection~~ — the current click-on-hit-area pickup is
      already correct (verified); dropped, no change.
- [x] Cursor polish #2: `walk` cursor only over the walkable area; a custom
      **default** cursor (emoji / icon) everywhere else — the game has no native
      cursor at all.

### M5 — Characters & animation

- Runtime:
  - [x] **View descriptor** (`asset_pipeline.md`): `state → animation` (atlas + grid
        + clips + anchor). Idle / walk done; 8-dir keys + named one-shots (pickup,
        interact, talk) land in M5.2 / M5.3.
  - [x] **AnimatedSprite** view from a baked PNG atlas; placeholder cube → an animated
        figure (a data change via the view, not a refactor). Procedural placeholder
        atlas (drawn in code) for testing before real art.
  - [x] **8-dir facing → the right walk cycle** — clips keyed `state.facing`, W-side
        mirrored to ~5 base directions; placeholder atlas has the 5 direction rows.
  - [x] **One-shot triggers + `onComplete`**: a click plays a one-shot on the
        character (pickable → pickup, interact / use → interact) and runs the
        effects on the animation's completion. Per-item pickup variants + a `talk`
        one-shot (inspect / dialogue) are follow-ups (M5.4 / M7).
- Editor:
  - [x] Upload frames / sprite atlas; define clips (frames + fps + loop); map
        (state, facing) via clip names (e.g. `walk.E`); set anchor. _(Footprint +
        a visual frame-picker are follow-ups.)_
  - [x] Assign triggers — by naming convention: `pickup` / `interact` clips play on
        a pickup / use (the scene maps kind → action). A per-trigger editor UI is a
        follow-up.
- _Testing:_ a **procedural placeholder atlas** (code-drawn frames → `AnimatedSprite`)
  so the system is testable before real art; the editor's **Characters tab** (added
  pre-M5) hosts the upload + animation tools.

### M6 — Movement & camera

- Runtime:
  - [x] **Pathfinding** — shortest path through a **visibility graph** over the
        obstacle corners (walkable polygon minus holes); earcut triangulation is kept
        only for point-in-area tests. Replaces straight-line + clamp-and-slide so the
        character routes around concave walls + holes. _(Was A\* + funnel over the
        triangle dual; that mis-routed on degenerate triangulations — see dev_log.)_
  - [x] **Camera** — a `world` container scaled so each scene's **design height fills
        the viewport** (one uniform scale), panned horizontally to follow the
        character (clamped; pillar-boxed when narrower). `GameDoc.referenceHeight` +
        `SceneData.width` define the design space in px; `SceneData.characterScale`
        sizes the cast per scene. Resize-safe (re-fits each frame, no re-mount); the
        DOM cursor inverts the transform. _(Aspect-correct editor preview + dead-zone
        smoothing are follow-ups.)_
  - [x] **Scene transitions** — fade out / in on `goTo` (the host fades through
        black around the destroy + async mount; the first scene fades in).
- Editor:
  - [x] Draw obstacle **holes** (Scene tab → Holes; nav-mesh routes around them).
        _(Scene bounds for the camera come with the M6 camera.)_

### M7 — NPCs, dialogue & stealth

Built so the pieces **chain**: a trigger fires events, an NPC walks a drawn route into
one, and a trigger at cover plays a crouch — the stealth beat. Ordered into testable steps.

**Step 1 — Triggers** ✅ _(extends interactables; testable with the player alone)_

- [x] `InteractableData` 5th variant **`trigger`** — an **enter-driven** hit-area (fires
      when a character's feet enter, not on click). `by: player | npc | any`, `once` +
      enter-edge debounce, gated by `when`, runs Effects.
- [x] Engine: per-frame feet-in-area test (player now; NPCs join the loop in step 2).
- [x] **Expanded Effects** — `playSound`, `playAnim` (one-shot on a character). Introduces
      **engine effects** (touch the scene / characters) beside the existing state effects.
      _(`spawnNpc` / `despawnNpc` move to step 2 with NPC entities.)_
- [x] Editor: **+ Trigger** + form (effects / when / by / once); violet hit-area.

**Step 2 — NPC entities** ✅

- [x] `NpcData` — a character (M5 view; default placeholder) with spawn + `when`
      (arrival / departure); multiple characters share the `interactive` band (reuse
      `Character`, the shared nav-mesh, depth + Y-sort). `playAnim` can target an NPC.
- [x] Editor: NPC list (add / remove / id / when / spawn placement; orange markers).
      _(Per-NPC art upload is a follow-up — NPCs use the placeholder for now.)_

**Step 2b — Global NPC cast + per-scene placement** ✅ _(refactor of step 2)_

NPCs become **global characters** placed into scenes, not per-scene data — the standard
adventure model: define a character once, place it where it appears.

- [x] `GameDoc.npcs` — the global **cast**: `NpcDef { id, name, speed }` now (`view` /
      `dialog` / voice land with their steps). Lives in the Characters tab beside the
      player ("character 0"). **Per-NPC appearance + dialogue + voice are authored in 4d**
      (the NPC-definition modal); the cross-scene **routine is step 6**.
- [x] `SceneData.npcs` becomes **placements**: `{ npc, spawn, when }` referencing the cast
      (click-to-place stays). **Unique** — one NPC is placed in at most one scene
      (editor-enforced; cast id fixed at creation, removal cascades to placements).
- [ ] An NPC's **current scene is runtime state** (its placement is only the *start*); a
      `moveNpc` / `despawnNpc` effect + its routine move it between scenes — **lands with
      the routine (step 6)**.

**Step 3 — NPC movement paths (in-scene)** ✅ _(idea: draw a route; chains with triggers)_

- [x] A placement's **path** — a **drawn route** of waypoints, `once | loop | pingpong`
      (+ speed); the NPC walks it via the nav-mesh. Triggers now fire on **NPC** entry too
      (`by: npc | any`, per-character edge) → an NPC reaches a spot and fires an event.
- [x] Editor: **draw the NPC's path** (dashed polyline + waypoints; once / loop / pingpong).

**Step 4 — Dialogue & narrative**

Per-NPC **dialogue trees** are the buildable piece; the **global story scenario**
(orchestrating several NPCs + the action sequence) is expressed via **flags + conditions**
for now — dialogue effects set flags; conditions gate dialogs / choices / NPC presence.
The visual story graph is M12; the NPC routine is step 6.

First, a shared **actor registry** (the scene registers `player` + live NPCs by id;
`runEffects` lifts to a shared module over it) so engine effects (`playAnim` / `wait` /
pause / face) fire from triggers, clicks **and** dialogue.

- [x] **4a — Actor registry + `wait` effect.** Shared actor registry + lifted `runEffects`;
      `Character.pause()` / `resume()` / `pauseFor(ms)` / `faceToward()`. The **`wait`**
      effect (`{ kind: 'wait', ms, anim? }`) lingers the *entering* NPC (optionally looping
      `anim`), **never the player**; "longest wins" so `wait` + `playAnim` compose.
- [x] **4b — Dialogue runtime + UI.** `GameDoc.dialogs` (reusable **library**) +
      `NpcDef.dialog` (default) + `NpcPlacement.dialog` (**per-scene override**). `Dialog
      { start, nodes }`; `DialogNode { speaker?, text?, effects?, choices?, next?, branch? }`
      — `branch` is a **conditional router** (state-driven openings). A `dialogueStore`
      runtime; `startDialog` made real; `DialogueBox` UI (**typewriter** + choices). Click
      an NPC → walk + talk → it **pauses + faces the player**, resumes its loop / pingpong.
- [x] **4c — Voice.** Procedural **gibberish** blips while a line reveals (the demo
      default) **+ uploadable per-NPC voice clips** that replace it. _(Per-NPC blip model;
      per-line VO is a follow-up.)_
- [x] **4d — Editor.** The NPC's **full-definition editor**, opened in a **modal** (room to
      work — and the future flowchart). Three parts:
  - **Appearance** — per-NPC atlas + clips (`NpcDef.view: ViewDescriptor`), by **generalising
    the player's `CharacterEditor`** to any view (`{ view, onCreate, onChange, onRemove }`);
    runtime falls back to the placeholder when absent. _(Today only the player has a view
    editor — NPCs hardcode the placeholder in `scene.ts`.)_
  - **Dialogue** — a **Dialogs library** + node-tree editor; assign dialogs (cast default +
    placement override).
  - **Voice** — the gibberish toggle + per-NPC clip upload (4c).

**Step 5 — Stealth** _(idea: crouch at cover; NPC vision)_

- [x] **NPC vision / detection** — `NpcDef.vision { range, angle?, effects, unless?, once? }`:
      per-frame range + cone (follows facing; omit `angle` for all-round) + line-of-sight
      (`Navigation.los`; holes occlude); the unseen→seen edge runs Effects. _(Cone **and**
      proximity, via the optional `angle`.)_
- [x] **Crouch at cover** — a `trigger` (`on: 'rest'`, fires on arrival) plays a crouch +
      `setStance crouch` (held posture) + sets `hidden`; `exitEffects` stand up + clear it on
      leave; `vision.unless: { flag: hidden }` lowers detection. (Foreground occluders also hide.)
- [x] Editor: vision settings (NPC modal) + trigger `on` / `exitEffects` + a **vision-cone**
      overlay in the preview.

**Step 6 — NPC routine (cross-scene behaviour)** _(the grand piece; builds on step 3)_

**Scope (locked):** step 6 is a **per-NPC** routine that controls **only that one NPC** —
its own schedule / reactions, moving it between scenes and along its in-scene paths over
time + story state. This is a **React Flow node-graph editor scoped to a single NPC**, and
is **part of M7 — NOT deferred to M12.** (The **global** story graph that orchestrates
**all** NPCs together is **M12**; see that section.) The 2026-06-14 "M7 6a" dev-log line
that said the routine editor is deferred to M12 was imprecise — only the optional **time
scheduler** nuance is deferred; the per-NPC routine graph belongs here.

- [x] **6a (runtime foundation)** — NPC location is runtime state (`StoryState.npcScene`);
      `moveNpc` / `despawnNpc` effects; `NpcDef.home`; conditional routes (`NpcPath.when`,
      `NpcPlacement.paths`), all reactive. _(commit 715457c)_
- [x] **6a-editor (follow-up)** — relax the editor's one-NPC-per-**game** placement guard to
      one-per-**scene** + a **home** picker in the NPC modal.
- [x] **6b (runtime)** — a per-NPC **routine** state machine (`NpcDef.routine`): nodes are
      cross-scene "stations" (scene + own in-scene path + `onEnter`), edges are transitions
      gated by `when` and/or `after` ms. A **global** runner (`systems/routine.ts`) seeds +
      advances it; active node lives in story state (`npcNode`). _(Decision: rich node +
      simple timed edges are in step 6; the full time-of-day scheduler stays M12.)_
- [x] **6c (editor)** — a **React Flow** node-graph routine editor (`@xyflow/react`) inside
      the NPC modal, beside Appearance / Dialogue / Voice. **Drives one NPC only.**
      _(+ lazy-loaded the editor so React Flow code-splits out of the player bundle.)_
- [x] **6d** — a demo routine in `content/game.json` (the **guard** patrols street ⇄ visits
      room on a 6 s timer; stranger's key→room example left intact).
      _(`editor_guide.md` routine section added with 6c.)_
- [x] **6e — node paths by reference (not drawn in the graph).** A routine node **selects**
      a **named scene path** (drawn per placement on the scene canvas) from a dropdown; the
      flow graph supplies only the **conditions** for when the NPC walks it — incl. a new
      **`onArrive`** edge (fires when the node's `once` path finishes). Schema: `NpcPath` got
      id/name, a placement holds several named paths, `RoutineNode.pathId` is a reference,
      `RoutineEdge.onArrive`. Demo: the **guard** patrols → (15 s) walks to the door → room →
      (6 s) → walks back → patrols, looping. **→ M7 step 6 (and M7) complete.**

### M8 — Cutscenes / scripted sequences

- Runtime:
  - [x] **8a** — a sequence runner — an ordered list of timed steps (`wait` / `move` /
        `anim` / `face` / `dialog` / `effects` / `camera`) over the actor registry + a
        camera override; non-interactive, **skippable** (Esc / button). Started by a
        `startSequence` effect (+ `SceneData.onEnter` for scene-entry). _(Decisions: camera
        control + dialogue-reuse are in.)_ Demo: an **intro** cutscene on the street.
- Editor:
  - [x] **8b** — a **Cutscenes tab** + a step-list editor (add by kind / reorder / remove;
        per-kind fields incl. camera focus+zoom); the `startSequence` field is a **picker**.
        **→ M8 complete.** _(Follow-ups: pick points on the preview; a `SceneData.onEnter`
        editor — scene-entry cutscenes today use a spawn trigger.)_

### M9 — Audio authoring

- Runtime:
  - [x] Bind sounds to entity / scene / interaction state, conditionally —
        **footsteps while moving** (procedural default, per-frame cadence), **ambient per
        scene** (`SceneData.ambient` + `when`; doc default; seamless swap), SFX on
        interactions (the `playSound` effect), voice while speaking (M7 4c).
- Editor:
  - [x] Attach sounds + conditions: **Scene → Audio** (ambient + `when`) + **Project →
        Audio** (default ambient / footstep / on-off), via a reusable `SoundField`.
- [x] **9b — global Sounds library (reference, not inline).** `GameDoc.sounds` (upload a
      clip once, name it); every sound field references a `SoundId` (reference-only +
      auto-migration of existing inline data-URLs): `SoundConfig`, `playSound`, voice,
      inspect audio. Editor: a **Sounds tab** + a `SoundSelect` picker everywhere.
- [ ] **9c — sound bindings the library unlocks:** **per-NPC footsteps**
      (`NpcDef.footstep?: SoundId`) + **per-animation sound** (`AnimClip.sound?: SoundId`,
      auto-played when the clip plays, e.g. `interact`). Both trivial once 9b lands.

### M10 — Atmosphere & lighting  (advanced rendering — stylised, not photoreal)

- [ ] **Lighting** — ambient / global light + local lights (lamp glows), light
      pools, simple character / prop shadows. Stylised chiaroscuro via Pixi blend
      modes + custom shaders / filters (NOT per-sprite normal maps).
- [ ] **Fog & clouds** — animated noise-based "rolling" fog + cloud layers with
      density sliders. A convincing *fake* (scrolling/warped noise), not true
      volumetrics.
- [ ] Editor: place lights per scene; atmosphere sliders.
- Reality check: full dynamic / normal-mapped 2D lighting and true volumetric fog
  are impractical in a browser and unneeded for flat vector — the stylised look is
  the target and is what the Röki direction wants anyway.

### M11 — UI theming & settings  (+ the title-screen composer)

- [ ] Editable UI texts (menu / dialogue labels); system-font picker.
- [ ] SVG skins / frames for UI elements; logo on the title screen; title-screen
      visual composer (reuses the scene editor, visual-only).
- [ ] **Settings screen** — volume sliders (music / SFX split), maybe fullscreen.
- [ ] **Localization (i18n)** — UI texts + dialogue in multiple languages.

### M12 — Story / logic graph  (global orchestration)

**Scope:** the **game-wide** event graph that drives overall game logic and **orchestrates
all NPCs together** — distinct from M7 step 6, which is the **per-NPC** routine (one NPC
only). M12 sits above the per-NPC routines and coordinates them via the shared flag /
condition / effect vocabulary.

- [ ] React Flow (@xyflow/react) view/editor over the flag/condition graph, or an
      auto-generated visualization. Keep primary logic local to objects.
- [ ] Optional **time scheduler** nuance for routines (the part of step 6 deferred here).

### M13 — Open-source packaging

- [ ] Split into pnpm-workspace packages: `@scope/engine`, `@scope/editor`,
      example game.
- [ ] Publish the `GameDoc` schema as the stable public API (types + JSON schema).
- [ ] README, MIT license, `create-<name>` scaffolder, tutorial for non-tech authors.
- [ ] CI + versioning + npm publish.

## Notes

- Already well-positioned: `engine/ systems/ entities/ data/` are React-free,
  `ui/` is React, scenes are data — M13's package boundary mostly exists already.
  `content/` (top-level) now holds the published `game.json` (the data boundary);
  the game loads it over the in-code demo when present.
- Don't split into real npm packages early — keep the internal boundary now, do the
  actual split at M13.
- Atmosphere (M10) was always anticipated: `architecture.md` plans fog/lights/
  chiaroscuro as a GPU-filter layer over the scene, not baked into assets.
- Characters & animation (M5) realise the view-descriptor model already specced in
  `asset_pipeline.md` (frame-by-frame, baked atlases, 8-dir walk mirrored to ~5).
- Pathfinding & scene transitions (M6) were both flagged as follow-ups during M1
  (clamp-and-slide is a stopgap; the goTo swap currently hard-cuts).
- Larger-than-viewport scenes are **M6**: viewport-fractions → world-space + a
  camera (follow + dead-zone) + per-layer **parallax**. The `width`-fit strip model
  (M3) is the unit that prepares it — no world-space fields added early (YAGNI).
