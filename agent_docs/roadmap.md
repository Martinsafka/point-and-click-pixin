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

- [ ] **1b — Conditional examine** — an item's / object's "look at" text can vary by state: the
      `examine` text gains a conditional form (`{ when?, text }[]`, first match wins), so a flag
      changes what the player learns on inspect. Reuses `ConditionEditor`. _(Base examine already
      ships — this adds the modifier.)_
- [ ] **5 — Inventory item dialogs / effects** — clicking (or using) an inventory item can run
      Effects / `startDialog` (today only interactables can). `ItemDef` gains optional `effects?`
      / `dialog?` (gated by `when`); the click routes through the shared runEffects + dialogue
      runtime (both already exist). Enables item-driven conversations, flag-setting, conditional
      reveals. _(#5.)_
- [ ] **14 — Skip dialogue** — a skip control that ends the current conversation (beyond the
      per-line typewriter fast-forward, which already works). Mirrors the cutscene skip. _(#14.)_
- [ ] **18 — Player-approach detection** — extend NPC `vision`: on detection the NPC can **walk to
      the player** (a new `approach` step) before running its effects (`startDialog` / `setFlag` /
      `playAnim`, multiple events — already supported). Builds on the existing vision→effects edge;
      the walk-to-player is the new part. _(#18.)_
- [ ] **6 — NPC monologues (speech bubbles)** — a world-space bubble over an NPC that follows it,
      with the dialogue typewriter. `NpcDef.monologues[]` — each `{ text, after?, when? }`: an NPC
      can have several, shown after a delay, and a flag swaps which is active. Reuses the
      typewriter; new is the NPC-tracking world-space bubble. _(#6.)_
- [ ] **7 — Spawn points** — a new fixed-shape **spawn-point** area (a small circle, repositionable
      like a light, not drawable/reshapable). Each is assigned a target — a specific NPC, the
      player, or `all`. `SceneData.spawnPoints[]`; the runtime seeds a character at its spawn
      point. Generalises today's single `SceneData.spawn` + per-placement spawns. _(#7.)_
- [ ] **8 — Animated scene layers (+ conditional swap)** — a new **animated** layer kind (a looping
      atlas as a scene layer — animated backgrounds / props), reusing the `AnimatedSprite` view.
      With the layers' existing `when`, a flag swaps a **static or animated** asset (covers the
      "swap asset by flag, incl. animated" idea). _(#8 / #9 / #11.)_
- [ ] **3 — Conditional character appearance** — a character's view (player **and** NPC) can have
      **variants gated by `when`**, swapped at runtime (e.g. the player steps into darkness → a
      different atlas / clips). Today a character's view is **fixed at mount** (`createSpriteView`
      runs once), so this is a new capability: add `views?: { when?, view }[]` on `GameDoc.player`
      / `NpcDef`, re-resolved reactively. Makes "different assets after a flag" real for characters.
      _(#3 — the "just eyes in the dark" **ambiance** for NPCs/scene is separately a content
      technique today: a dark area + an eyes sprite/light, no engine work.)_

### M13 — Open-source packaging

- [ ] Split into pnpm-workspace packages: `@scope/engine`, `@scope/editor`,
      example game.
- [ ] Publish the `GameDoc` schema as the stable public API (types + JSON schema).
- [ ] README, MIT license, `create-<name>` scaffolder, tutorial for non-tech authors.
- [ ] CI + versioning + npm publish.

### V2 — post-1.0 nice-to-haves

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
- [ ] **Checkpoints** — auto / explicit save points. _(#13.)_
- [ ] **Highlight usable objects** — an optional outline / pulse on pickable / interactable
      hotspots (discoverability; the context cursor already hints them). _(#15.)_
- [ ] **Map + fast travel** — a scene-map UI with travel between visited / known scenes. _(#16.)_
- [ ] **Journal / notes** — an in-game notes screen the story can append to. _(#17.)_
- [ ] **Cutscene preview** — play / scrub a sequence in the editor without running the game. _(#20.)_

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
