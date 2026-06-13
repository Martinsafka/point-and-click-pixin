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
- [ ] Item catalogue + recipe table.
- [ ] **Examine** — "look at" text for items / objects.
- [ ] _(optional)_ **Verb / cursor system** — look / use / talk verbs + a hover
      cursor over hotspots (vs the current single-click); runtime mode + editor.

### M5 — Characters & animation

- Runtime:
  - [ ] **View descriptor** (`asset_pipeline.md`): per character, `state → animation`
        — idle, walk (8-dir, mirror to ~5), plus named one-shots (pickup, interact,
        talk); frames + per-frame timing, loop, anchor + footprint.
  - [ ] **AnimatedSprite** view from baked PNG atlases; swap the placeholder cube →
        a real animated character (a data change via the view, not a refactor).
  - [ ] **8-dir facing → the right walk cycle** (depth-scale + Y-sort already feed
        off the feet point).
  - [ ] **One-shot triggers + `onComplete`**: an interactable / effect plays a
        one-shot on the character — pickup (variant chosen by the picked
        item/object), interact, talk-while-speaking — resolving the action on the
        animation's completion.
- Editor:
  - [ ] Upload frames / sprite atlas; define animations (frames + timing + loop);
        map (state, facing) → animation; set anchor + footprint.
  - [ ] Assign triggers: which animation plays for walk / each pickup / interact /
        talk.

### M6 — Movement & camera

- Runtime:
  - [ ] **Pathfinding** — A\* over a walk-mesh (the walkable polygon, optionally
        with holes/obstacles); replaces straight-line + clamp-and-slide so the
        character routes around obstacles.
  - [ ] **Camera** — for scenes larger than the viewport: a world transform that
        follows the character (bounds + dead-zone); depth / Y-sort / input already
        work in world space.
  - [ ] **Scene transitions** — fade out/in on `goTo` (covers the async mount; no
        hard cut / blank frame).
- Editor:
  - [ ] Refine the walk-mesh / draw obstacles; set scene bounds (for the camera).

### M7 — NPCs, dialogue & stealth

- Runtime:
  - [ ] NPC entities — a character (M5 view descriptor) with at least an idle
        animation; placement, arrival / departure conditions, item handover.
  - [ ] Dialogue runtime — branching tree with **typewriter text reveal**.
  - [ ] **NPC vision / detection** — line-of-sight (distance + cone, optional
        occlusion); on "sees the player" run Effects = the stealth beat.
  - [ ] **Voice** — short unintelligible gibberish (Sims-style) while a character
        speaks; real VO swaps in later.
- Editor:
  - [ ] Place NPCs; set visual (upload idle anim + the M5 animation set);
        dialogue-tree editor; vision settings; attach voice.

### M8 — Cutscenes / scripted sequences

- Runtime:
  - [ ] A sequence runner — an ordered list of timed steps over the Effect
        vocabulary + character moves/animations + dialogue lines + waits;
        non-interactive, skippable.
- Editor:
  - [ ] Author sequences (step list); trigger them from interactions / scene-entry
        / conditions.

### M9 — Audio authoring

- Runtime:
  - [ ] Bind sounds to entity / scene / interaction state, conditionally —
        **footsteps while moving**, ambient per scene, SFX on interactions, voice
        while speaking.
- Editor:
  - [ ] Attach sounds + their conditions to objects / characters / scenes.

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

### M12 — Story / logic graph  (optional)

- [ ] React Flow (@xyflow/react) view/editor over the flag/condition graph, or an
      auto-generated visualization. Keep primary logic local to objects.

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
