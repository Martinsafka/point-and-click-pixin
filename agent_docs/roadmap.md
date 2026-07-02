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

### ▶ NEXT UP — M14: Pixin Script, phase 1  _(writing conventions + interim pipeline)_

_Prioritized 2026-07-02 **ahead of all other remaining work** (M10/M11/M13 leftovers, V2,
V2.1): the author is writing the saga's episode-1 screenplay **now**, so the writing
conventions must exist first — everything written from here on should already be
compilable. Full specs live in **V2.1 → Pixin Script / pixin-lint**; this milestone is
their execution order, pulled forward._

- [ ] **v1 writing conventions (the "Pixin Script" spec)** — finalize the plain-text
      markup: the **CAST & PROPS registry** (item / NPC / scene / flag ids), dialog
      syntax (`*` choice, `?` condition, `!` effects, `->` next), **whole-scene logic
      blocks** (`PROP` / `TRIGGER` / `NPC` / `onEnter`, kind + gates + effects + uses —
      **no spatial data**), named **markers** for cutscene positions. Deliverable: a
      `pixin_script.md` spec with one fully-worked example scene, Google Docs-friendly
      (the parser will normalize typography). The story can be written in it
      immediately.
- [ ] **Interim conversion workflow (zero code)** — until the compiler exists, Claude +
      the `pixin-gamedoc` schema converts script chunks → `GameDoc` JSON on demand; the
      first converted scenes double as the spec's acceptance tests.
- [ ] **Then, in this order** (specs in V2.1): the deterministic **compiler +
      merge-by-id** (script owns logic fields, editor owns spatial fields) →
      **pixin-lint L1–L3** (references → narrative structure → progression / softlock
      solver) → the editor's **"needs placement"** queue → CI **`pnpm lint:game`**.
      Editor-hardening prereqs for episode-1 production remain `editor_analysis.md` §10.

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
- [x] Stealth detection → folded into **M7** (NPC vision). _(Done: M7 step 5 — NPC vision cone
      + crouch-at-cover.)_
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
- [x] An NPC's **current scene is runtime state** (its placement is only the *start*); a
      `moveNpc` / `despawnNpc` effect + its routine move it between scenes. _(Done in step 6a —
      `StoryState.npcScene` + the effects, commit 715457c.)_

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
- [x] **9c — sound bindings the library unlocks:** **per-NPC footsteps**
      (`NpcDef.footstep`, a channel per walker) + **per-animation sound** (`AnimClip.sound`,
      auto-played when a one-shot clip runs, e.g. `interact`). Editor: a footstep picker in
      the NPC modal + a per-clip sound picker in the character editor. Demo: the guard has
      footsteps; the placeholder's `interact` clip carries a blip. **→ M9 fully complete.**

### M10 — Atmosphere & lighting  (advanced rendering — stylised, not photoreal)

Stylised only (no normal-mapped 2D lighting / true volumetrics — impractical in a browser
and unneeded for flat vector; the Röki look is the target). **Locked decisions:** lighting
is **overlay + gradient textures + masks** (blend modes; a custom shader only if needed
later); the player light supports **both a cone and a sphere** (selectable); weather is a
**per-scene conditional preset** gated by `when` (no new runtime state). Everything is
flag-driven through the existing condition vocabulary.

**Cross-cutting foundations (apply to all of 10a–10d):**

- [x] **Compositing order** — a small atmosphere/lighting layer stack with a fixed order:
      rain/snow in the **foreground** (over characters); fog can **split** (a back layer
      behind characters + a front layer over them); the **lighting overlay** sits above the
      scene art (characters lit too); the **player light is topmost**. _(Done — `engine/atmosphere.ts`
      slot stack: emitters / lighting / weather / screenFx; fog placed by author z into `world`.)_
- [ ] **Performance + quality** — particle **caps**, cull off-screen, cap filter cost; a
      **quality / reduced-motion** setting (low / med / high → particle budget + which filters
      run). _Runtime particle **budget shipped** (weather + emitters cap to it). The
      **quality / reduced-motion toggle UI** moved to **V2** — M11 shipped only text-size +
      volume._
- **Darkness is visual-only** — dark scenes / dark areas never block hotspots or clicks at
  the render level; they only change what's *seen*. To make a dark room's hotspots
  unresponsive until the lights are on, gate them with the **existing `when`** vocabulary
  (`when: flag lights-on`) — the same switch flag that turns on the light. Already works
  today: `pickInteractable` (used by **both** the click handler and the cursor) skips a
  `when`-failed interactable, so it neither fires nor changes the cursor. No new "darkness
  blocks clicks" logic — one shared flag composes the visual + the interaction.

**10a — Particles / weather** _(a parametric system, not per-weather code)_

- [x] Runtime: a `ParticleContainer` weather layer driven by a `WeatherPreset` — **sliders**
      for count, colour + alpha, size, **shape** (round dot / streak), angle + speed, sway +
      freq, blend (add for snow). Procedural textures (round / streak), no uploads. Plus a
      per-preset **ambient sound** layered over the scene ambient (channel-based audio).
- [x] `GameDoc.weatherPresets` (pre-seeded **rain / snow / dust**, editable + custom) +
      `SceneData.weather` = a conditional list `{ preset, when }` (first match plays;
      reactive, so a story flag triggers / swaps weather).
- [x] Editor: a **new top-level `Atmosphere` tab** (preset list + slider editor) + a per-scene
      **Weather** section (conditional preset picker with `when`). **→ 10a complete.**
- [x] **Localized point emitters** — `SceneData.emitters[]` (`PointEmitter`): particles
      streaming from one **scene point** (smoke / embers / drips) — **world-space** (in a new
      `emitters` atmosphere slot, over the foreground), launched along `angle` ± `spread` at
      `speed`, accelerated by `gravity` (negative rises), `grow`n + faded over `life`, capped
      by the quality budget; gated by `when`. Editor: a Scene-tab **Emitters** section (+ /
      Place / sliders) + ⛲ preview markers (`createEmitterSystem`). Demo: chimney smoke on the
      street.
- Follow-up: a **live weather preview** in the editor — _resolved by the ME live world (weather
  + emitters render live as you tune)._

**10b — Lighting** _(one composited lighting layer over the scene)_

- [x] **Ambient/global** — `GameDoc.ambientLight` (colour + intensity) as the project
      default; `SceneData.ambientLight` overrides it per scene (1 = day, 0 = black). A
      scene-wide tint/darken overlay.
- [x] **Local lights** — `SceneData.lights[]` placed in the editor (position, radius,
      colour, intensity, falloff, optional **flicker** = animated intensity, e.g. candle /
      broken neon / fire), gated by `when` (a switch flag) — additive glow pools that punch
      through the darkness. **Like the player light, a local light has a shape (sphere /
      cone)** + **deform sliders** (rotation, width, height) so it can be an ellipse / a
      rotated / a directional cone — not just a circle. _(user request)_
- [x] **Dark scene + player light** — ambient 0 → black; the player carries a light
      (**cone** following facing / **sphere**), gated by `when: hasItem flashlight`; a mask
      following the player reveals around them.
- [x] **Dark areas** — `SceneData.darkAreas[]`: a polygon of darkness with a feathered
      **gradient** edge (a local dark zone in an otherwise lit scene). Visual only.
- [x] **Per-scene colour grade** (M10 10d) — `SceneData.colorGrade` (`ColorGrade`:
      brightness / contrast / saturation / hue) → a `ColorMatrixFilter` over the scene art
      (`world`), live-rebuilt via `applyLive`. Editor: a Scene-tab **Grade & FX** section.
- [x] Editor: place lights + draw dark-area polygons (preview); ambient + light
      sliders.

---

### ME — In-game (live) editor  _(PROPOSED — editor architecture; user reviewing, not started)_

Move from the **separated** editor (a static `mountPreview` beside the panel; edits go
through a draft + "Test in game" reload) to an **in-game** editor: a dev-only toggle shows
the panel **over the live running world**, so lighting / weather / NPCs / camera / state are
tuned **in context**, with no reload loop. Dev-only (stripped in prod, like today).

**Why:** the static preview can't show lighting / weather / motion, so visual + atmospheric
tuning is blind + slow. Live editing gives accurate feedback and a better overview — and
collapses the two Pixi worlds (game + preview) into **one** (a net simplification).

**UI shape (user intent):** not one fixed side panel — a **floating, multi-window** UI. In
dev mode a small **launcher bar** sits in the **top-left corner**; each entry is an editor
section (Scene · Lighting · Sounds · Atmosphere · …). Clicking one opens a **floating modal
window** for that section that is **draggable anywhere** on screen and **closes via a ✕ in
its top-right**. **Several windows can be open at once** (arrange them around the live scene;
close what you don't need). So the current tabs-in-a-panel become independent floating tool
windows over the running game.

**Hard constraints (must hold):** the **engine never imports the editor** — the editor only
**mutates the doc** + draws DOM overlays; the engine **reacts to doc changes** (the existing
store-subscription pattern). The **dev-only gate** (`import.meta.env.DEV` + lazy-load) keeps
the player build identical. Do it **incrementally behind the existing `?edit`** (coexist;
the separated path stays a fallback until parity), so every step is small + reversible.

**Risk:** low for the shipped game (additive, dev-gated, boundary-protected); medium-but-
dev-only for editor functionality during migration (doc/save wiring + camera-mapped
overlays are the sensitive bits).

- [x] **ME.0 — Live atmosphere in the *current* preview** — `mountPreview` got a ticker +
      `createAtmosphere` / `createLighting` / weather read from the editor doc; `ScenePreview`
      subscribes to the store and **rebuilds the atmosphere live** (hash-diffed) on edits, so
      the dev **sees lighting / weather** while authoring. Lighting's camera is parameterised
      (the preview passes its fit transform). _(Gated lights need their `when` met — ME.5
      will add flag-setting in the preview.)_
- [x] **ME.1 — The editor preview runs the *real* world** _(reframed — keep two documents)_
      — instead of merging stores (risky, invisible in isolation), the editor keeps its own
      working doc and the production `gameDoc` stays separate; the **preview gains an
      Edit ⇄ Live toggle**. **Live** mounts the real `createSceneHost` from `editorStore.doc`
      (its own story store parked at the selected scene, whole-scene `fit` camera, no gameplay
      input, muted) so NPCs/routines/lighting/weather render in context; **Edit** keeps the
      static `mountPreview` (placeholder + layer drag) for authoring. Sub-steps, each verified
      + committed in isolation:
  - [x] **1** — `mountScene` (+ `createSceneHost`) gain `SceneOptions` (`cameraMode` follow/fit,
        `gameplayInput`); defaults preserve the game.
  - [x] **2a** — `mountScene` returns a `PreviewScene` with `refreshAtmosphere` (rebuild
        weather + lighting, no re-mount).
  - [x] **2b** — `createSceneHost` exposes `refreshAtmosphere`, delegating to the current scene.
  - [x] **2c** — `ScenePreview` gains the Edit ⇄ Live toggle; Live mounts `createSceneHost`
        over the working doc (`{ cameraMode:'fit', gameplayInput:false, muteAudio:true }`) and
        subscribes to the editor store for the live atmosphere refresh. _(Persistence /
        Test / Discard / draft are untouched — both docs stay as they were.)_
- [x] **ME.2 — In-game floating editor (coexists with `?edit`)** — a dev-only **launcher
      bar** (top-left) over the **live `createSceneHost` world**; each entry opens a
      **floating, draggable modal window** (✕ top-right) hosting that section's existing
      forms. **Multiple windows at once.** Edits mutate the unified doc; the game reacts
      where it already does.
  - [x] **a** — floating-window chrome + launcher (`FloatingWindow` / `FloatingEditor`):
        draggable windows (title-bar drag, ✕, click-to-raise, several open) and a launcher
        bar over the preview.
  - [x] **b** — **parity:** the launcher now mirrors **all 8 tabs** one-to-one (Scene / Items /
        Characters / Dialogs / Cutscenes / Sounds / Atmosphere / Project). Each tab's content
        is extracted into one `renderTab(tab)` used by **both** the fixed panel and the windows
        (single source — removed the earlier per-section duplication). The **Scene** window
        drives the same `draw` modes, so its tools place/draw on the (ME.4) overlays from a
        floating window too.
  - [x] **c** — retire the fixed `editor__panel`. _(Done in **ME.6.3** — the panel/tabs/footer
        were deleted; the editor is now the fullscreen world + launcher only.)_
- [x] **ME.3 — Live-update the tunable systems** — the preview applies **hot** params in place
      and **re-mounts** only on structural change; **nothing stays silently stale**. One host
      hook **`applyLive({ scene, atmo, cast })`** (replacing `refreshAtmosphere` +
      `setCharacterScale`): the editor's single `ScenePreview` subscription hands it the latest
      doc pieces and the host **diffs + re-applies only what changed**, so adding a hot param is
      one place. **Hot (live):** atmosphere (ambient / lights / dark areas / weather / player
      light) + **character size** + **NPC walk speed**. **Re-mount (revision bump):** geometry /
      structure — scene width, reference height, **depth**, add/remove/move layer, player
      sprite, add/remove scene, and **NPC `view` / `routine` / `home`** (selective
      `patchNpcDef` bump). **Overlay-only** (walkable / holes / hit-areas / interactables /
      vision cone) updates via the React DOM overlay. _(Optional: depth → commit-on-blur if the
      re-mount churn annoys.)_
- [x] **ME.4 — Placement/drawing overlays mapped via the world rect** — all overlays
      (walkable / holes / hit-areas / NPC spawn+path / lights / dark areas) now live inside a
      `SceneViewport` wrapper sized to the scene's on-screen **world rect** (the same `fit`
      transform the camera publishes as `cameraOffset`: one scale + centring), so their
      fractional coords stay aligned when the canvas isn't the scene's aspect (letterbox →
      ME.6). The editor preview is always a whole-scene `fit` view, so the rect is computed
      deterministically from the pane size + design (decoupled from engine frame timing; the
      in-game cursor still reads the live `cameraOffset`). Gameplay clicks are already
      suppressed in the live view (ME.1 `gameplayInput:false`). _Today the box is kept at the
      scene's aspect, so the rect equals the box and nothing moves — the mapping is now just
      explicit + camera-driven, which de-risks the ME.6 fullscreen switch (no overlay rewrite
      then). Single wrapper = lower risk than per-overlay coordinate rewrites._
- [x] **ME.5 — Live-context authoring utilities** — a launcher-only **World** window drives the
      live preview's world to the state you want to author against: **jump scene** (`goTo`),
      **set/clear flags** (known flags scanned from the doc + add an arbitrary one),
      **give/take items**, and **reset**. It writes to the live scene-host's story store
      (published via `preview-bridge` when the preview is in **Live** mode) and the world reacts
      where it already does — gated layers / NPCs / lights appear, scene swaps run — so e.g. a
      `hasItem flashlight` light shows by giving the item. _(Pause/resume the ticker landed as
      the editor's **⏸ Freeze** toggle; remaining follow-up: reset the player's on-screen
      position — World **Reset** re-seeds store state, not per-frame motion.)_
- [x] **ME.6 — One Pixi world (retire the static preview)** — done incrementally (user chose
      reversible-first).
  - [x] **1 — parity: layer-drag in the live world** — `mountScene` gained `onLayerMove`
        (image layers draggable, `none` = xy / `width` = y), with the drag kept in sync with a
        parallax layer's rest base so the `fit` camera's per-frame pin doesn't snap it back.
        Live mode now does everything the static Edit preview did.
  - [x] **2 — fullscreen + Live default + reversible panel** — the preview **fills the pane**
        (the world letterboxes; overlays ride `SceneViewport`); `mountPreview` now letterboxes
        too (min + centre). The preview **defaults to Live**. The fixed panel is **hideable**
        via a toolbar toggle (top-right), and **Test / Discard** moved to that toolbar so
        they're reachable panel-less. Nothing removed yet → fully reversible.
  - [x] **3 — delete** `mountPreview` + the Edit/static path + the fixed `editor__panel`
        (validated) → **one Pixi world**. `ScenePreview` always mounts the live
        `createSceneHost`; `Editor` is the fullscreen world + launcher + a top-right Test /
        Discard toolbar; removed the panel/tabs/footer/resizer + their CSS. Dev-only gate +
        lazy-load kept (the player build still never loads the editor).

Each step: typecheck + lint + build + dev smoke + visual check; the separated `?edit` keeps
working until ME.6, so the migration is reversible at every point.

---

**10c — Fog & clouds**

- [x] Animated noise-based "rolling" fog + cloud layers, **density sliders** — `SceneData.fog`
      (`FogConfig`: colour, **back** + **front** opacity, scale, speed). `engine/fog.ts` scrolls
      a **tileable soft-noise `TilingSprite`** (layered integer-freq sines → seamless clumps),
      a back layer behind characters (`fogBack`) + a faster/larger front layer over them
      (`fogFront`) for depth — world-space, scrolls with the scene. Live-rebuilt via `applyLive`
      (`sc.fog` in the atmosphere hash). Editor: a Scene-tab **Fog** section (enable + colour +
      back/front/scale/speed sliders). Demo: light fog on the street. _(Authored per-scene in
      the Scene tab rather than the global Atmosphere tab — consistent with per-scene weather /
      lighting.)_

**10d — Polish**

- [x] **Vignette** — `SceneData.vignette` (`Vignette`: intensity / size / colour): a radial
      darkened frame (screen-space, in `screenFx`).
- [x] **Lightning + thunder** — `SceneData.lightning` (`LightningConfig`): a screen-space flash
      on a random `minGap..maxGap` interval, gated by `when`, with an optional **thunder**
      `SoundId` a beat after the flash (muted in the editor). Editor: both in the Scene-tab
      **Grade & FX** section. _(→ 10d complete; M10 done bar the optional perf/quality UI, which
      lands with the M11 settings screen.)_

### M11 — UI theming, settings & game screens

- [x] **Settings (simplified)** — an in-game **Settings** menu view: **text size** (a
      `--ui-scale` CSS var the game text multiplies by, incl. dialogue) + **master volume**
      (Howler global gain). Per-device, localStorage (`state/settings.ts`), applied on boot.
      _(Richer settings → V2: music/SFX split, reduced-motion / quality, fullscreen.)_
- [x] **Font picker** — `GameDoc.font` (a CSS font stack) chosen in the **Project** tab; applied
      to the game shell + title via a `--game-font` var. _(No general UI-text editing: the
      inventory uses item names, dialogue uses NPC names — nothing else needs it.)_
- [x] **Game screens** — a set of editable full-screen screens. **4a** runtime + flow
      (`GameDoc.screens`; App phase machine loading→title→playing→gameOver|end→credits→final;
      `gameOver`/`endGame` effects); **4b** editor — a Project **Screens** section (image uploads
      + colour / size / align text + per-title-button text/image mode). _(Final logo + real
      loading-% are release/follow-up.)_
  - **Loading** — shown before anything (incl. the title): logo + background.
  - **Title** — logo + background (over the New game / Continue buttons).
  - **Game over** / **End** — a text screen (editable size / colour / alignment), reached by
    an effect; offers retry / title.
  - **Credits** — scrolling-text screen listing contributors (formatted text: size / align /
    colour + scroll animation).
  - **Final** — a fixed, **non-editable** "made with this editor" logo (a hardcoded image
    dropped in at release), then returns to the title.
  - Editor: a **Screens** project section to author them (images + text blocks).
- [ ] **Localization (i18n)** → **V2** (see below).

### M12 — Story / logic graph  (global orchestration)

**Scope:** the **game-wide** event graph that drives overall game logic and **orchestrates
all NPCs together** — distinct from M7 step 6, which is the **per-NPC** routine (one NPC
only). M12 sits above the per-NPC routines and coordinates them via the shared flag /
condition / effect vocabulary.

Broken into (chosen with the user; **start with M12a**):

- [x] **M12a — Global rules engine** ⭐ — `GameDoc.rules`: game-wide reactive
      rules `{ id?, when: Condition, then: Effect[], once? }`, evaluated **globally on every
      story-state change** (a store subscription, fixpoint with a hop cap vs loops — like the
      routine runner). The cross-cutting "game-wide event graph" — orchestrate logic / NPCs
      without attaching it to a single object (e.g. `hasItem k1 & k2 & k3` → `setFlag gate-open`
      → `moveNpc guard away`). Runtime runner (`systems/rules.ts`) lives globally (alongside the
      routine runner in `createSceneHost`, subscribed to the story store). Editor: a Project
      **Rules** section (`RulesEditor.tsx`) reusing `ConditionEditor` + `EffectList`. **Scope:**
      `then` = **state** effects (setFlag / give / take / goTo / moveNpc / despawn / gameOver /
      endGame, via `store.run`); engine effects (startSequence / playSound / playAnim) inert in
      the evaluator → **follow-up**. Demo: have `crank` + `gem` → `setFlag machine-ready`.
- [x] **M12b — Logic overview graph** — a React Flow (`@xyflow/react`), **auto-generated,
      read-only** view of the flag web: flag nodes wired to the logic **elements** that set
      them (green arrow) and read them (amber dashed) — rules / interactables / triggers /
      exits / dialogues / cutscenes / NPC vision+routine / scene gates. Derived by scanning the
      doc (`editor/logic-scan.ts` → `editor/LogicGraph.tsx`). Lives with **Rules** in the new
      **Game logic** tab. _(Flags-only today; item/scene nodes + auto-layout are follow-ups.)_
- [x] **M12c — Time scheduler** — `GameDoc.clock` (`ClockConfig`: day length + start time) drives
      a **time-of-day** (`StoryState.clockMinutes`, persisted) advancing over real time; routine
      edges gate on a **time window** (`RoutineEdge.fromTime`/`toTime`, wrapping past midnight). The
      runtime clock writes the store only on a minute boundary (not per-frame). Editor: a **Clock**
      section in the Game logic tab (above Rules) + from/to time on a routine edge + a live **time
      scrubber** in the World window. Demo: the guard only visits the room 08:00–18:00.
      _(Follow-ups: a general `timeOfDay` condition + an in-game HUD clock.)_ **→ M12 complete.**

### M12.5 — V1 polish (pre-1.0 quick wins + a few character/scene features)

A focused, user-requested batch slotted **before M13 packaging**: the cheap "mechanic already
exists, just wire it" wins first, then a few new-but-contained character/scene features. (The
heavier ideas — global animation library, full UI theming, map/journal/checkpoints — went to
V2.) Each still follows schema-first → runtime → editor.

- [x] **1b — Conditional examine** — `ItemDef.examineWhen?: { when?, text }[]` (first match wins
      over `examine`); `systems/examine.ts` `resolveExamine`; the inventory shows the
      state-dependent line. Editor: per-item conditional-examine list (ItemCatalogue). _(Items-only
      for now; world-object / inspect conditional examine is a follow-up.)_
- [x] **5 — Inventory item dialogs / effects** — `ItemDef.use?: { when?, effects?, dialog? }[]`;
      clicking an item runs the first matching `use` (effects + optional `startDialog`) instead of
      selecting. Routed through the mounted scene via the `engine/item-action.ts` bridge so
      `startDialog` + engine effects fire from the DOM inventory. Editor: per-item on-click actions.
- [x] **14 — Skip dialogue** — a Skip ⏭ button on the dialogue box → `dialogueStore.end()` (beyond
      the per-line typewriter complete-on-click).
- [x] **18 — Player-approach detection** — `VisionConfig.approach?`: on detection the NPC **walks to
      the player** before running its `effects` (which now include `say`), so it spots you, comes
      over, and speaks. Editor: an **approach** checkbox in the NPC vision. Demo: the street guard.
- [x] **6 — NPC monologues (speech bubbles)** — `engine/bubble.ts` world-space typewriter bubbles
      that follow a character + a reusable **`say` effect**; `NpcDef.monologues[]`
      (`{ text, after?, every?, when? }`) drives ambient lines (a flag swaps which is active).
      Editor: a **Monologues** list in the NPC modal + `say` in the effect picker. Demo: the
      stranger mutters (line changes after you meet him). **→ M12.5 complete.**
- [x] **7 — Spawn points** — `SceneData.spawnPoints[]` (`{ at, target }`, target = `player` / a
      cast NPC id / `all`); the runtime seeds each character at its point (specific id wins over
      `all`), overriding the scene / placement spawn. Editor: a Scene-tab **Spawn points** section
      (place like a light — fixed ◎ marker, **who** picker). Demo: the player starts on the right of
      the street. _(#7. Follow-up: drag-to-move; override only applies to the initial position.)_
- [x] **8 — Animated scene layers (+ conditional swap)** — a new `animated` `LayerData` kind (atlas
      grid → a looping `AnimatedSprite`), placed / `when`-gated / draggable like an image, so a flag
      swaps a **static or animated** asset. Editor: **+ Animated** upload + frame-grid inputs in the
      Layers panel. Demo: a blinking lamp glow on the street. _(#8 / #9 / #11.)_
- [x] **3 — Conditional character appearance** — `GameDoc.playerViews?` + `NpcDef.views?`
      (`{ when?, view }[]`); the first matching variant renders instead of the base view, **swapped
      live** (`Character.setView` re-parents a fresh sprite; the scene rebuilds only on an
      index change). Editor: `AppearanceList` (ConditionEditor + `CharacterEditor` per variant) on the
      player + NPC. Demo: the player swaps to a bright figure on the `night` flag. _(The "just eyes"
      ambiance stays a content technique — dark area + an eyes sprite.)_

### M13 — Open-source packaging & launch

**Editor v1 is complete** (M0–M12.5). M13 turns the project into an installable, documented,
open-source template with a playable demo. Broken into a–e (chosen with the user; do **in order**
— each feeds the next).

**M13a — Documentation pass** ✅

- [x] **Editor-guide coverage audit** — audited dev_log + editor_guide; filled the gaps found
      (a **Dialogs** authoring section, **Items** conditional-examine + on-click actions, a
      complete **Effects** reference table, a **Keyboard & mouse** note).
- [x] **Asset-prep section** in editor_guide (a new **Preparing assets** section building on
      `asset_pipeline.md`): design space + the **animation** atlas grid (frame size / columns /
      fps / clip naming `walk.E` / `idle.S` / anchor = feet), images (SVG/PNG/JPG, fit), sounds
      (formats, loopable), animated layers.
- [x] **README** — overview of every editor feature + links to `editor_guide.md`, the docs, and the
      **PixiJS** Claude Code skills.
- [x] Open-source hygiene: **LICENSE (MIT)** + CONTRIBUTING + CODE_OF_CONDUCT + `package.json`
      license/description. **→ M13a complete.**

**M13b — Claude Code skills (AI authoring assist)** ⭐ ✅

Repo-committed skills in `.claude/skills/` so anyone cloning gets AI help driving the editor /
editing `game.json`:

- [x] **`pixin-gamedoc`** — the `GameDoc` schema mental model (top-level shape, the condition /
      effect / flag vocabulary, coordinate conventions, the main sub-shapes) → an AI edits
      `game.json` directly; points to `src/data/schema.ts` as the source of truth.
- [x] **`pixin-editor`** — an editor map (launcher/tabs table + "I want to… → panel + steps") from a
      described mechanic; points to `editor_guide.md`.
- [x] **`pixin-recipes`** — 10 ready recipes (locked door, fetch quest, stealth beat, branching
      dialogue, cutscene, conditional weather, monologue, global rule, flag-gated asset swap,
      game-over): each = editor steps **+** a `game.json` snippet. **→ M13b complete.**

**M13c — Complete demo game (A→Z, real assets)**

- [ ] A short, finished game built **in the editor** with **real, properly-licensed assets** (CC0 /
      original — licensing to be vetted). Doubles as the validation pass for the docs / skills /
      asset pipeline, and becomes the scaffolder's **demo** template + the repo's dev default.
- **Design + build plan locked → [`demo-roadmap.md`](demo-roadmap.md).** _Magický polibek_ (A Magic
  Kiss): a fairy-tale comedy — a penniless tramp earns beer through a favour chain (rats → cat →
  fish → charm → grate) to get the guard drunk, reaches the princess, and (after the kiss fails)
  wakes her with an **onion-kiss** — a Shrek/Fiona twist. 3 scenes (tavern / scrolling street /
  tower), **4 NPCs** (tavernkeeper / fish vendor / a mobile morning **onion seller** / guard).
  Showcases **routines + time-of-day + lighting**: the onion seller is mornings-only, the guard is
  drinkable at dinner only (+ a sober-up rule). **Prereq:** a small engine **`timeOfDay` condition**
  (resolves the M12c follow-up). Greybox first, then an art pass; phases Prereq + P0–P10.

**M13d — Package & scaffolder**

- [ ] **`npx create-…`** scaffolder — installs a ready-to-edit project; prompts (or `--template`)
      **clean** (blank) vs **demo** (the M13c game). _(Decision: the demo is the **repo's dev
      default** but is **not forced** on new projects — the developer chooses.)_
- [ ] Split into pnpm-workspace packages: `engine` / `ui` / `editor` (dev-only) / `content`; an
      **embedding API** `mountGame(gameDoc, canvas)` so the engine runs without the editor.
- [ ] **`GameDoc` schema as the public API** — published types + a **JSON Schema** export (validation
      + autocomplete when hand-editing `game.json`; the skills reference it) + a **`pixin validate`**
      CLI.
- [ ] **Versioning** — semver + `GameDoc.version` + a migration framework (generalise `migrateSounds`)
      so older games keep loading after an update.
- [ ] **CI** (GitHub Actions) — the green bar (typecheck / lint / build) on PRs + npm publish on tags.

**M13e — Demo website (GitHub Pages)**

- [ ] A static page hosting the **playable** demo game (M13c) — a showcase of what the editor can
      build; CI auto-deploys it.
- [ ] _Deferred: a live **"try the editor"** build — the editor is DEV-only (stripped from prod), so
      exposing it publicly needs a separate build. (User chose: not now → later / V2.)_

### V2 — post-1.0 nice-to-haves

- [ ] **Directional, light-driven shadows** (M10 follow-up; **contact "blob" shadows ship in
      M13c Prereq 2**). Cast **one** skewed, darkened silhouette of the sprite away from the
      **dominant light** at the entity's position — a blend of the ambient/"sun" direction **+**
      nearby placed lights, each weighted by **intensity × falloff/distance**, resolved to a single
      direction; length / opacity from the light's strength. So the shadow **swings** as the player
      passes a candle / the torch (reads as "that light casts it"), and the sun + scene lights unify
      into one believable shadow — avoiding the visual noise + cost of one-shadow-per-light (full
      2D shadow-mapping). Could tie shadow length to **time-of-day** (short midday, long at dusk).
- [ ] **Localization (i18n)** — UI texts + dialogue in multiple languages (deferred from M11;
      do once there's demand — needs a string/locale layer over dialogue + any UI text).
- [ ] **Richer settings** — music / SFX volume split (categorise sound channels), a
      reduced-motion / quality toggle (drives `atmosphereQuality` + the particle budget), and
      a fullscreen toggle. (M11 shipped just text-size + master volume.)
- [ ] **Global animation library** — a shared library of views / clips with **character / NPC /
      asset** sections (today views are per-entity). Refactors the per-entity `view` toward
      reusable named animations; pairs with M12.5's animated layers. _(#10.)_
- [ ] **UI theming** — let the author design the UI **chrome**: inventory / dialogue / loading bar
      + icon — border + background colour, opacity, border width, the dialogue **skip** icon — or
      upload an SVG/PNG per UI element. (M11 shipped only font + the full-screen screens.) _(#19.)_
- [ ] **Live screen editing in the editor** — show **all game screens** (loading / title / game-over /
      end / credits / final) in the editor and edit them **live, like a scene** (WYSIWYG over the
      rendered screen), instead of today's forms-only Project → Screens section. Builds on M11 screens
      + the ME live-editor model.
- [ ] **Real-time collaborative editing (CRDT)** — multiple authors in one document at once
      (option **C** of the 2026-07-02 versioning discussion, `editor_analysis.md` §8): back the
      editor store with a CRDT (e.g. **Yjs**) + a sync layer / hosted editor, presence cursors,
      per-entity conflict-free merging. **Prereq: solution A ships first** — the git-native split
      format (per-scene/dialog files + content-hashed assets, editor **Publish** endpoint) and
      `GameDoc` `docId`/`version` metadata — so the CRDT has a canonical document model to sync.
      Only worth it once the editor is hosted / used by teams; until then git covers collaboration.
- [ ] **Checkpoints** — auto / explicit save points. _(#13.)_
- [ ] **Highlight usable objects** — an optional outline / pulse on pickable / interactable
      hotspots (discoverability; the context cursor already hints them). _(#15.)_
- [ ] **Map + fast travel** — a scene-map UI with travel between visited / known scenes. _(#16.)_
- [ ] **Journal / notes** — an in-game notes screen the story can append to. _(#17.)_
- [ ] **Cutscene preview** — play / scrub a sequence in the editor without running the game. _(#20.)_
- [ ] **Auto-fit scene width to a backdrop** — a Scene-tab button that sets `scene.width` from a
      chosen background layer's aspect at the reference height (`width = referenceHeight × imgW ÷
      imgH`), so a wide render scrolls **and** fills the viewport height with no manual maths.
      _(Formula already documented in `editor_guide.md` → Scenes → width.)_

- [ ] **Full persistent world simulation** (NPC routines + movement). _Shipped now: **B-lite**
      — routine progression is persistent off-scene (an `onArrive` edge completes by the path's
      estimated walk time when its scene isn't mounted; the mounted scene seeds an NPC mid-walk
      at its global progress). What B-lite does **not** do: simulate exact off-scene **2D
      positions** (it tracks 1D path progress; off-scene NPCs aren't rendered, so position
      doesn't matter — nothing reads it today)._ **Full B** would decouple `Character` sim from
      its view and run a global headless simulation of **all** NPCs across **all** scenes
      (per-scene nav off-screen; the mounted scene renders agents at their simulated positions;
      dynamic view add/remove as NPCs cross scene boundaries). Cost: medium-large refactor (the
      `Character` sim/view split is the risky part — it's used by the player, stealth, dialogue
      freeze, cutscenes, depth/Y-sort). **Only worth it when a feature actually reads off-scene
      positions** — a minimap, NPCs perceiving each other across scenes, or precise mid-path
      entry without the 1D approximation.

### V2.1 — Saga production pipeline  _(episodic-series enablers — planned 2026-07-02)_

Context: the author plans an **8-episode saga** (min 2–3 h gameplay each; ≈20–30 scenes,
300–600 dialogue nodes, 80–150 flags per episode — **one `GameDoc` per episode**). Scenes
are built in **Unreal Engine** and rendered to layers (~an afternoon per scene incl.
cutouts). Design vocabulary that **already works today** (write it into the script, no
engine work needed): NPC schedules as deduction (clock + routines + `timeOfDay` +
`by: npc` triggers — stakeouts, tailing, overheard monologues, alibi timetables),
deadlines (`timeOfDay` + rules), **evidence-as-items with deduction-as-recipes** +
present-evidence dialogue gates (`hasItem` on choices), scene **state variants** via
layer `when` gates (flooded / burned / repaired; past / present), light & weather puzzles
(darkAreas + playerLight + gated lights / weather / lightning / UV-reveal layers),
close-up investigation scenes (a second camera on the same set = a cheap scene).
**Prereq for episode-1 production:** the hardening list in `editor_analysis.md` §10
(autosave, undo, Problems panel / reference integrity, solution-A split format).

**Logic vocabulary**

- [ ] **Numeric counters** — a `counter` condition (`>=` / `<=` / `==`) + `addCounter` /
      `setCounter` effects, persisted in story state / saves. Money, reputation, per-NPC
      trust, "found 5 of 8 clues" — the highest-design-impact vocabulary addition; today
      faked by flag explosions (`trust-1`, `trust-2`, …).
- [ ] **Layer blend mode** — `LayerData.blend?: 'add'` (weather / emitters already have
      one). Unlocks **baked per-light render passes** composited over the backdrop and
      gated by `when` — lamp on/off states that look physically lit (bounce, shadows),
      with editor lights reserved for dynamics (flicker, the player light).
- [ ] **Conditional holes / walkable** — a `when` gate on `holes` entries (a flooded
      alley closes a path); today faked with gated exits.
- [ ] **`resetFlags` batch effect** _(optional)_ — cyclic-day loops (Majora-lite: the
      day repeats, the player breaks the loop with knowledge) without enumerating
      `setFlag false` per flag.

**Pixin Script — screenplay-to-GameDoc compiler**  _(the writing side of the pipeline;
the author writes the game's **logic layer** as plain text — the worst clicking in the
editor — while art + atmosphere stay editor/UE work. **Phase 1 — the conventions + the
interim workflow — is pulled forward to ▶ NEXT UP / M14** at the top of this file.)_

- [ ] **The markup format** — a plain-text, Ink/Fountain-inspired language: a **CAST &
      PROPS registry** up front (declares item / NPC / scene / flag ids — the contract),
      dialogs (`*` choices, `?` condition, `!` effects, `->` next), and **whole scenes'
      logic**: interactables (kind + id + effects / uses / `when` / exit targets),
      triggers' effects, NPC placement wiring (dialog, `when`), scene `onEnter` —
      everything **except spatial data** (no coordinates, no polygons, no layers).
      Cutscene steps reference named **markers** placed in the editor. The parser
      normalizes typography (smart quotes, dashes), so the script can live in **Google
      Docs** — whose revision history / comments / live co-writing become the narrative
      layer's versioning + collaboration for free (git / solution A keeps versioning the
      editor-owned spatial JSON; the compiler stamps both revisions into `GameDoc`
      metadata). The registry doubles as the natural string table if i18n happens.
- [ ] **Compiler + merge-by-id** — emits `GameDoc` fragments and merges them into the
      doc (solution-A split files): **the script owns logic fields, the editor owns
      spatial fields** (hitArea, positions, layers, lights, atmosphere), merged per
      entity by id — so re-compiling the script never destroys drawn polygons, and
      redrawing a hit area never touches the logic.
- [ ] **“Needs placement” queue in the editor** — entities declared by the script but
      not yet placed arrive with placeholder hit areas / spawns + a to-do list (“5
      hotspots to draw in `hospoda`”); the editor becomes the *spatial
      materialization* step, not the logic-entry step.
- [ ] Interim workflow (zero code, usable now): agree the conventions and write episode
      1 in them; Claude + the `pixin-gamedoc` schema converts script chunks to JSON on
      demand until the deterministic compiler exists.

**pixin-lint — the game-logic linter (L1–L3)**  _(one analysis core, three consumers:
the editor’s Problems panel, the script compiler, CI)_

- [ ] **L1 — references** — dangling / empty ids (items, dialogs, scenes, sounds,
      `picked:` flags), flags written-never-read / read-never-written — the
      `findReferences` core from `editor_analysis.md` §2.2 / §7.1.
- [ ] **L2 — narrative structure** — dialogs with no path to an end, unreachable nodes,
      choices with empty text, cutscene steps referencing missing actors / markers.
- [ ] **L3 — progression / softlock checker** — the “dead man walking” guard. Canonical
      test case: the 48 h jam bug (the player crosses a one-way exit **without a key
      item** → the game becomes unwinnable). Three passes, cheapest first:
      **(a) fuzzing bots** — headless random / heuristic playthroughs over the pure
      evaluator (`checkCondition` / `applyEffect` already run without Pixi) — finds
      practical softlocks, unreached content, min-actions pacing;
      **(b) static dependency graph** — walk backwards from `endGame`: an auto-derived
      **puzzle dependency chart** (Ron Gilbert’s tool, generated instead of hand-drawn),
      plus the named check *“requirement obtainable only before a one-way transition
      that doesn’t gate on it”* with an **auto-suggested fix** (gate the exit with
      `when: hasItem …`);
      **(c) state-space solver** — BFS over abstract story states (flags / inventory /
      scene / counters), exploiting the genre’s monotonicity (flags mostly false→true,
      items accumulate), verifying **“from every reachable state the end stays
      reachable”**, and emitting the **shortest repro trace** for any violation
      (“hospoda → ulice → věž without `vidlicka` → stuck”). Non-monotonic spots
      (`takeItem`, `setFlag false`, recipe consumption) are exactly where softlocks
      live and get modeled precisely. Known limits: spatial / stealth / timing are
      abstracted; deadline rules (timeOfDay + consequences) need special handling.
- [ ] **CI integration** — `pnpm lint:game` over the split format: every commit is a
      machine-verified **completable** game before it reaches main.

**Episodic / saga features**

- [ ] **Cross-episode state carry-over** — export the final flags / inventory at an
      episode's end → seed the next episode's `initialFlags` (or a shared meta-save).
      The **"series remembers"** mechanic: episode-2 choices change episode-5 renders,
      routines and dialogue. Needs `GameDoc` `docId`/`version` metadata (analysis §8).
- [ ] **Recap screen ("previously on…")** — episode-start lines gated by carried-over
      flags; the key retention tool between episodes (Telltale lesson: completion decays
      across a season — recap + cliffhangers + reliable cadence fight it).
- [ ] **Save slots + autosave checkpoints** — required at 2–3 h per episode (extends V2
      **Checkpoints** _(#13)_; today one manual slot, `slot0`).
- [ ] **Per-line dialogue voiceover** — `DialogNode.audio?` (a library `SoundId`) beyond
      the current per-NPC procedural voice blips.
- [ ] **Shared cast across episodes** — import a character (view / clips / voice) from
      another `GameDoc`, so the recurring cast isn't copy-pasted per episode (pairs with
      the V2 **Global animation library** _(#10)_).
- [ ] **Inventory UI at scale** — 50+ items (scrolling / grouping; the 48 h jam game
      already carries 34).
- [ ] **i18n decision before episode-1 content** — if the saga ever ships in more than
      one language, the string layer (V2 **Localization**) must exist **before**
      thousands of dialogue nodes are written; retrofitting is painful. Decide first,
      then schedule.

**UE render-pass pipeline (the "professional pipeline")**

- [ ] **UE → Pixin scene importer** — Movie Render Queue EXR with **Cryptomatte
      object-ID + depth passes**: per-object cutout PNGs from isolated / holdout renders
      (full pixels behind occluders — strictly better than hand-cutting the final
      composite in Photoshop), auto `xFrac`/`yFrac`/`anchorYFrac` from mask bounds +
      base depth, bands assigned by depth thresholds, **walkable + holes from a floor
      mask** (marching squares + simplify) — emitted as an importable scene fragment.
      Constraint to plan for now: tag objects in UE and lock the camera after render.
- [ ] **Depth curve computed from the 3D camera** — project a reference-height capsule
      at several floor positions and measure pixel heights → exact `DepthConfig` stops
      instead of hand-tuned near/far (characters sit in the render's perspective
      mathematically).
- [ ] **Depth-aware fog** — the depth pass as a fog-density mask: quasi-volumetric fog
      over a static render (thickens with scene distance) — data hand-painted 2.5D
      games never had.
- [ ] **Detective vision / senses mode** — per-object masks drive an outline / tint
      highlight of specific props (a "focus" mode revealing clues; supersedes the plain
      V2 **Highlight usable objects** _(#15)_).
- [ ] **Time-of-day + per-light variants as the standard technique** — same camera, sun
      moved / lights toggled → variant layers over the existing `timeFadeAt` +
      `colorGradeByTime` + `when` gates (+ the new layer `blend: 'add'`). Document the
      workflow in `asset_pipeline.md`. UE scenes are **standing sets** — an episode-5
      winter re-render of an episode-1 location is continuity for free (props moved
      between episodes = re-render, same camera).
- [ ] **Parallax from depth slices** — render fore / mid / background holdouts so the
      parallax factors match true camera distances (scroll reads as 3D because it is).
- [ ] _(later, V2.2+)_ **Normal-pass directional 2D lighting** — editor lights shade the
      backdrop via a rendered normal map (a Pixi filter), beyond additive glows.

### V2.2 — Distribution platform  _(offline play + paywall — planned 2026-07-02)_

Principle (user's call, and architecturally right): **commerce lives outside the game and
the editor.** The platform is a separate web app that authenticates, sells, and then just
fetches the episode's doc + assets and calls the existing `mountGame(doc, container)`
embedding API — the engine knows nothing about auth. **Repo boundary (explicit):** the
platform is **never part of this repo** — this repo is the engine + editor only; the
platform lives in its own **private repo**, and this roadmap tracks only the engine-side
hooks it needs (`assetBase`, `loadState`/`onSave`, PWA template). The engine stays
**MIT** while the games' content (docs, art, audio, script) is **proprietary** ("all
rights reserved", licensed to players via the platform ToS) — the standard dual model
(engine open, games not). One cheap future-proofing rule for the platform's data model:
give games/episodes/entitlements a **`publisher` dimension from day one** — it costs
nothing while there is one publisher, and it is the difference between "add a table" and
"rewrite the platform" if V3 (below) ever happens.

**Offline play**

- [ ] **PWA first** — service worker precaching the bundle + `game.json` + baked assets,
      a manifest, `navigator.storage.persist()`; installable from the browser, runs
      offline after first (authenticated) load, works desktop + mobile. Ship as part of
      the `create-pixin` template. Known caveat: iOS Safari storage limits (fine at
      ~50 MB/episode, but verify). A bare zip + `index.html` is a non-option (`file://`
      blocks modules/fetch).
- [ ] **Tauri desktop wrapper later** (real download, installers, and the **Steam
      channel** — episodes as DLC) — deferred until something demands it: signing
      (macOS notarization, Windows SmartScreen), per-OS builds and an updater are real
      overhead PWA avoids.

**The platform (registration → payment → access)**

- [ ] **Auth + payments + entitlements** — accounts (email/OAuth), a purchases DB
      (user ↔ owned episodes / active subscription). Models: per-episode purchase,
      season pass, subscription; **episode 1 free** (the pilot funnel). Payments: for a
      CZ solo seller strongly consider a **Merchant of Record** (Paddle / Lemon
      Squeezy) — handles EU digital-goods VAT + invoicing for a few extra %; Stripe =
      you are the merchant and own the VAT OSS admin.
- [ ] **Entitlement-gated delivery** — episodes on a CDN behind **signed URLs** or an
      auth cookie on a path prefix (cleaner for long play sessions than per-asset URL
      expiry). Engine-side this needs almost nothing: `assetUrl` already passes
      absolute URLs through (`src/data/asset-url.ts`), so the platform can rewrite doc
      refs to signed absolute URLs — or add a tiny runtime option
      `mountGame(doc, el, { assetBase })`.
- [ ] **Cloud saves per account** — the natural carrier for V2.1's **cross-episode
      carry-over**: episode N's end state is stored server-side and injected as episode
      N+1's `initialFlags` on boot, on any device. Also the home of the **season menu**
      (episode library), the recap screen's data, and choice stats ("43 % of players
      spared the guard").
- [ ] **Engine hooks (small)** — `mountGame` options: `assetBase`, and
      `loadState` / `onSave` callbacks so the platform persists story state server-side
      instead of the hardcoded IDB `slot0` (single-player local play keeps the IDB
      default).
- [ ] **Access policy (decide + document)** — purchased episode = **yours forever**
      (offline, no revalidation); subscription = access while active, **soft**
      revalidation only when online (never lock out an offline player). Honest DRM
      stance: once content plays offline it is on the device and extractable — the
      paywall protects the honest path (convenience, cloud saves, updates), not against
      determined extraction. GOG/itch model; do **not** invest in DRM.

### V3 — Far future: open publishing platform  _(a marketplace for Pixin games — "far
far away nice-to-have", recorded 2026-07-02; do NOT start before the saga ships)_

The idea: open the V2.2 platform to **third-party developers** building games on the
(free, MIT) Pixin editor — they publish a game, set a price (or free), the platform does
hosting + payments + player accounts + cloud saves, for a revenue share. Precedents:
itch.io (open, generic), GX.games (engine-tied web arcade for GameMaker), Playdate
Catalog (curated, one-SDK store), Roblox/UEFN (creation tool + distribution coupled —
the strongest version of the pattern). Why it is strategically coherent here rather than
a pivot:

- **The saga is the anchor tenant.** V2.2 gets built for first-party content anyway
  (accounts, payments, entitlements, delivery, cloud saves); opening it to others is
  incremental, and the saga solves the marketplace's classic cold-start on the content
  side — first-party titles sell the platform (the console-maker playbook).
- **GameDoc-as-data makes third-party hosting near-zero-risk.** A published Pixin game
  is a declarative document, not arbitrary code — no sandbox-escape surface, players
  can't be attacked by a hosted game. This is the load-bearing advantage over generic
  web-game stores and it falls straight out of the engine's core design. (Holds only
  while the doc stays code-free — a future "custom JS hooks" feature would break it;
  weigh that trade-off then.)
- **pixin-lint becomes the store's QA gate.** Submission runs L1–L3 automatically — a
  **"machine-verified completable"** badge no other storefront can offer (V2.1 tooling
  reused as marketplace infrastructure).
- **It is the sustainability model for the OSS engine** — give away the tool, monetize
  distribution (Unity/Roblox economics, scaled down): the take rate funds engine
  development without ever closing the engine.

The genuinely hard parts (why this is far-away, not next): **payouts** (marketplace
payments = Stripe Connect / marketplace-MoR territory: KYC, per-seller VAT, tax forms —
regulated and operationally heavy), **moderation** (content policy, uploaded-asset IP
infringement, ratings), **discovery** (storefront, reviews), engine **version pinning**
per published game (`GameDoc.version` + migrations — V2.1/solution A prereqs), and the
support burden of a two-sided market. Prereqs before even prototyping: saga shipped and
earning on V2.2, versioned `GameDoc`, pixin-lint in CI, and the `publisher` dimension
already in the platform's data model (see V2.2).

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
