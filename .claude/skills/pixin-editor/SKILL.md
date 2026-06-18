---
name: pixin-editor
description: "Map a desired point-and-click game mechanic to the exact Pixin editor panel + steps. Use when a developer describes what they want to build ('a locked door', 'an NPC that patrols', 'rain in this scene', 'a dialogue with choices') and needs to know where in the no-code editor to do it. Triggers on: pixin editor, how do I make, where do I, which panel, add a door/scene/npc/item/dialogue/cutscene/weather/light, point-and-click editor, no-code, ?edit."
license: MIT
---

# Pixin editor — where to build what

The **no-code visual editor** runs over the live game at **`/?edit`** (dev-only — `pnpm dev`
then add `?edit`). A top-left **launcher bar** opens floating tool windows; edits update the
running world instantly. Work loop: **edit → ▶ Test in game → Export to `content/game.json` →
commit**.

This skill routes a described mechanic to the right place. For full control details read
**`agent_docs/editor_guide.md`** (every panel + control). To edit `content/game.json` directly
instead, use **`pixin-gamedoc`**; for ready end-to-end patterns use **`pixin-recipes`**.

## The launcher / tabs

| Tab            | What lives there                                                                       |
| -------------- | -------------------------------------------------------------------------------------- |
| **Scene**      | Scenes list · Walkable · Depth · Holes · Layers · Interactables · NPCs (placement + paths) · Spawn points · Audio · Weather · Lighting · Emitters · Fog · Grade & FX — **per selected scene** |
| **Items**      | Item catalogue (+ examine / conditional examine / on-click actions) · Recipes (global) |
| **Characters** | Player view + appearance variants · NPC **cast** (the modal: dialogue, voice, footsteps, vision, appearance, monologues, **routine**) |
| **Dialogs**    | The dialogue library + node-tree editor                                                |
| **Cutscenes**  | The cutscene (sequence) library + step editor                                          |
| **Sounds**     | The global sound library (upload once, reference everywhere)                            |
| **Atmosphere** | Weather **presets** (reused by scenes)                                                  |
| **Game logic** | **Clock** · **Rules** (global reactive logic) · **Logic graph** (read-only flag web)   |
| **Project**    | Display (reference height, font) · Cursors · Audio (defaults) · Lighting (defaults) · Transition · Screens (title/loading/game-over/end/credits) · Document (save / load / **Export**) |

## "I want to…" → where

- **A new room** → Scene → **+ Scene**; upload a backdrop in **Layers**; draw **Walkable**.
- **Connect two rooms / a door** → Scene → **Interactables** → **+ exit** (set `to` scene), draw
  its hit-area; gate with **when** (e.g. `hasItem key`) for a locked door.
- **A pick-up item** → Items → **+ Item**; then Scene → Interactables → **+ pickable** (set `item`).
- **Combine items** → Items → **Recipes** → `a + b → output`.
- **Use an item on an object** → Interactables → the object's **uses** (item → effects).
- **A look-at comment** → Interactables → **+ inspect** (text), or an item's **examine**.
- **Something that fires when you walk into a spot** → Interactables → **+ trigger** (`on` enter /
  rest, `by` player/npc, `exitEffects`).
- **An NPC** → Characters → **+ NPC** (the cast); then Scene → **NPCs → + Place NPC**; draw a
  **path**; in the NPC modal add **vision**, **monologues**, a cross-scene **routine**.
- **A conversation** → Dialogs → **+ Dialog** (nodes / choices / branch); assign it in the NPC
  modal (**dialog** + optional **dialogWhen**).
- **A scripted scene** → Cutscenes → **+ Cutscene** (steps); fire it with a `startSequence` effect.
- **Weather / fog / lights / colour grade** → the Scene tab's **Weather / Fog / Lighting / Grade &
  FX** sections (define reusable weather in **Atmosphere**).
- **Game-wide logic** (e.g. "has all keys → open the gate") → **Game logic → Rules**.
- **Time of day** → Game logic → **Clock**; gate routine edges on a time window.
- **Title / game-over / credits screens, fonts** → **Project** (Screens / Display).
- **Sounds / music** → upload in **Sounds**, then reference from any sound field.

## Notes for an AI assistant

- Prefer telling the developer the **panel + steps** (this skill / the editor guide). If they ask
  you to *make it for them*, edit `content/game.json` directly (**`pixin-gamedoc`** +
  **`pixin-recipes`**), then have them **▶ Test in game**.
- Almost everything optional is gated by a **`when`** condition and triggers an **`Effect[]`** —
  the same vocabulary everywhere.
- Verify changes with `pnpm typecheck` + `pnpm dev`.
