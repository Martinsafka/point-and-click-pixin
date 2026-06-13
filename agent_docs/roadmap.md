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

## Sequencing

Data foundation → finish gameplay (the jam slice) → layer the editor on top →
package it. Build gameplay schema-first so the editor needs no refactor. The
editor authors data for runtime systems, so those systems exist first.

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
      runtime is M4; `startDialog` is a marker for now.)_
- [x] Inventory: add + combine (data-driven recipes) + "use item on object".
- [ ] UI: simple menu.
- [ ] Audio: ambient loop + ≥1 SFX (Howler, triggered by state).
- [ ] Stealth detection — only if it's a core beat.
- [ ] Author the 2–3 scene vertical slice → JAM BUILD DONE.

### M2 — Minimal editor (dev-only)  (start with what's painful by hand)

- [ ] Edit mode (`?edit`, DEV-only) — React editor shell beside the live preview.
- [ ] Scene panel: list / add / delete / select (preview via the existing engine).
- [ ] Layers: upload SVG → place in band, reorder, set role; persist SVG to
      public/assets, layer to the doc.
- [ ] Draw the walkable polygon on the preview.
- [ ] Save `GameDoc` back to JSON (dev endpoint or download/upload).

### M3 — Editor: interactables & exits

- [ ] Place pickable / interact / door objects visually.
- [ ] Forms for Condition + Effect (e.g. door needs key → goTo scene).

### M4 — Editor: NPCs & dialog

- [ ] Place NPCs; arrival / departure conditions.
- [ ] Dialog-tree editor (line → player options → effects); give item, unlock flags.
- [ ] Optional hook: the persuasion-gate NPC plugs the LLM in here, behind the stub.

### M5 — Story / logic graph  (optional)

- [ ] React Flow (@xyflow/react) view/editor over the flag/condition graph, or an
      auto-generated visualization. Keep primary logic local to objects.

### M6 — Open-source packaging

- [ ] Split into pnpm-workspace packages: `@scope/engine`, `@scope/editor`,
      example game.
- [ ] Publish the `GameDoc` schema as the stable public API (types + JSON schema).
- [ ] README, MIT license, `create-<name>` scaffolder, tutorial for non-tech authors.
- [ ] CI + versioning + npm publish.

## Notes

- Already well-positioned: `engine/ systems/ entities/ data/` are React-free,
  `ui/` is React, scenes are data — M6's package boundary mostly exists already.
- Don't split into real npm packages early — keep the internal boundary now, do the
  actual split at M6 to avoid premature monorepo infra during the jam.
