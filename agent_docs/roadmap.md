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
- **Clean boundaries = future packages:** `engine` (runtime, no React/DOM) ·
  `ui` (React overlay) · `editor` (dev-only) · `content` (data + assets).
- **Editor is dev-only.** The player build ships baked data + assets, no editor.
- **Game runs without the LLM** (persuasion NPC stays an optional, stubbed bonus).
- **Each feature is schema-first → runtime → editor.** Extend `GameDoc`, build the
  runtime that plays it, then add the editor controls — so the editor never forces
  a refactor.

## Sequencing

Data foundation → finish gameplay (the jam slice) → runtime framing (save / title)
→ the editor → feature systems (NPCs, audio, atmosphere, theming) → packaging.

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
      runtime is M5; `startDialog` is a marker for now.)_
- [x] Inventory: add + combine (data-driven recipes) + "use item on object".
- [x] UI: simple menu.
- [x] Audio: ambient loop + ≥1 SFX (Howler, triggered by state).
- [ ] Stealth detection → folded into **M5** (NPC vision).
- [x] Author the 2–3 scene vertical slice → JAM BUILD DONE. _(2 scenes, full
      mechanics, placeholder art; stealth optional.)_

> Feature milestones below each have a **runtime** part (the engine does it) and an
> **editor** part (author it visually). Build runtime first.

### M2 — Runtime polish & framing  (completes the game frontend; no editor)

- [x] **ESC** opens / closes the menu.
- [x] **Save / load** — one slot in IndexedDB (serialise the story state);
      surfaced as Save (in-game) + Continue (title screen).
- [x] **Title / start screen** — New game / Continue (DOM for now). In-game menu
      becomes Save + **Exit to title** (confirmed: unsaved progress is lost). The
      visual SVG composition of the title is the editor's job (M8).

### M3 — Editor core (dev-only)

- [ ] Edit mode (`?edit`, DEV-only) — React editor shell beside the live preview.
- [ ] Scene panel: list / add / delete / select (preview via the existing engine).
- [ ] Layers: upload SVG → place in band, reorder, set role; draw the walkable
      polygon; save `GameDoc` to JSON (dev endpoint or download/upload).

### M4 — Editor: interactables, items, recipes, exits

- [ ] Place pickable / interact / door objects; draw hit areas.
- [ ] Forms for Condition + Effect + `uses`; item catalogue + recipe table.

### M5 — NPCs, dialogue & stealth

- Runtime:
  - [ ] NPC entities — placement, arrival / departure conditions, item handover.
  - [ ] Dialogue runtime — branching tree with **typewriter text reveal**. _(item 7)_
  - [ ] **NPC vision / detection** — line-of-sight (distance + cone, optional
        occlusion); on "sees the player" run Effects = the stealth beat. _(item 8)_
  - [ ] **Voice** — short unintelligible gibberish (Sims-style) while a character
        speaks; real VO swaps in later. _(item 6, voice)_
- Editor:
  - [ ] Place NPCs; dialogue-tree editor; vision settings; attach voice.

### M6 — Audio authoring  (item 6)

- Runtime:
  - [ ] Bind sounds to entity / scene / interaction state, conditionally —
        **footsteps while moving**, ambient per scene, SFX on interactions.
- Editor:
  - [ ] Attach sounds + their conditions to objects / characters / scenes.

### M7 — Atmosphere & lighting  (advanced rendering — stylised, not photoreal)

- [ ] **Lighting** _(item 4)_ — ambient / global light + local lights (lamp glows),
      light pools, simple character / prop shadows. Stylised chiaroscuro via Pixi
      blend modes + custom shaders / filters (NOT per-sprite normal maps).
- [ ] **Fog & clouds** _(item 5)_ — animated noise-based "rolling" fog + cloud
      layers with density sliders. A convincing *fake* (scrolling/warped noise),
      not true volumetrics.
- [ ] Editor: place lights per scene; atmosphere sliders.
- Reality check: full dynamic / normal-mapped 2D lighting and true volumetric fog
  are impractical in a browser and unneeded for flat vector — the stylised look is
  the target and is what the Röki direction wants anyway.

### M8 — UI theming  (item 9 + the title-screen composer)

- [ ] Editable UI texts (menu / dialogue labels); system-font picker.
- [ ] SVG skins / frames for UI elements; logo on the title screen.
- [ ] Title-screen visual composer (reuses the scene editor, visual-only).

### M9 — Story / logic graph  (optional)

- [ ] React Flow (@xyflow/react) view/editor over the flag/condition graph, or an
      auto-generated visualization. Keep primary logic local to objects.

### M10 — Open-source packaging

- [ ] Split into pnpm-workspace packages: `@scope/engine`, `@scope/editor`,
      example game.
- [ ] Publish the `GameDoc` schema as the stable public API (types + JSON schema).
- [ ] README, MIT license, `create-<name>` scaffolder, tutorial for non-tech authors.
- [ ] CI + versioning + npm publish.

## Notes

- Already well-positioned: `engine/ systems/ entities/ data/` are React-free,
  `ui/` is React, scenes are data — M10's package boundary mostly exists already.
- Don't split into real npm packages early — keep the internal boundary now, do the
  actual split at M10.
- Atmosphere (M7) was always anticipated: `architecture.md` plans fog/lights/
  chiaroscuro as a GPU-filter layer over the scene, not baked into assets.
