---
name: pixin-gamedoc
description: "The GameDoc schema for this Pixin point-and-click engine — use when reading or editing content/game.json directly (the whole game is one serializable document). Covers the top-level shape, the condition/effect vocabulary, coordinate conventions, and the main sub-shapes (scenes, layers, interactables, items, NPCs, dialogs, cutscenes, rules, clock, atmosphere, sounds, screens). Triggers on: pixin, game.json, GameDoc, schema, point-and-click adventure, scene, interactable, condition, effect, flag, NPC, dialogue, recipe, edit the game json, add a scene/item/door/flag."
license: MIT
---

# GameDoc — the Pixin game schema

A Pixin game is **one serializable document** (`GameDoc`), saved to `content/game.json`. The
engine, the editor, and your content all read this one typed schema. Editing `game.json` directly
is fully supported — it's the same data the editor produces.

**Canonical source of truth:** `src/data/schema.ts`. **Always read it** before editing — it has
every field, optionality, and `kind` union, with comments. This skill is the mental model + the
gotchas, not a copy (the file wins if they disagree). For the no-code UI mapping see
**`pixin-editor`**; for ready patterns see **`pixin-recipes`**.

## Mental model

- **Everything is data.** No hardcoded content. Extend via discriminated-union `kind`s.
- **One logic vocabulary** gates *everything*: a `Condition` (`when`) decides if a thing is
  active; an `Effect[]` is what happens. Exits, interactions, dialogue, NPC presence, weather,
  lights, rules — all use the same `Condition`/`Effect`.
- **Flags are just strings**, created on first use. `initialFlags` seeds them; any `setFlag`
  effect creates/sets one; any `flag` condition reads one. No declaration step.
- **Ids are references by name.** Items, scenes, npcs, dialogs, sounds, sequences are keyed by
  string id; other places reference those ids. Keep them stable.
- **Coordinates are fractions (0..1)** of the scene's design space — `walkable`, hit-areas,
  spawns, light/emitter/spawn-point positions, cutscene points. Resolution-independent.
  `GameDoc.referenceHeight` (default 1080) is the design height; a scene's `width` (design px)
  past the viewport aspect makes the camera scroll.

## Top-level `GameDoc`

Required: `start` (scene id), `scenes`, `items`, `initialFlags`.
Optional: `recipes`, `rules` (global), `clock`, `npcs` (cast), `dialogs`, `sequences`,
`sounds`, `weatherPresets`, `screens`, `cursors`, `font`, `player` / `playerViews`,
`ambientLight` / `playerLight`, `referenceHeight`, `transition`, `ambient` / `footstep` /
`footstepsOff` / `pickupSound` / `transitionSound`.

## The vocabulary

**Condition** (`{ kind, … }`): `hasItem {item}` · `flag {flag, value?}` · `visited {scene}` ·
`all {of: Condition[]}` · `any {of: Condition[]}` · `not {of: Condition}`. A missing `when` = always.

**Effect** (`{ kind, … }`):

- _State_ (saved): `setFlag {flag, value?}` · `giveItem {item}` · `takeItem {item}` ·
  `goTo {scene}` · `moveNpc {npc, scene}` · `despawnNpc {npc}` · `gameOver` · `endGame`.
- _Engine_ (act on the live scene): `startDialog {dialog}` · `startSequence {sequence}` ·
  `playSound {sound}` · `playAnim {action, target?}` · `say {text, target?, ms?}` ·
  `wait {ms, anim?}` · `setStance {action?, target?}`.

## Main sub-shapes (see schema.ts for full fields)

- **SceneData** — `id, name, layers[], walkable (fraction polygon), holes?, interactables[],
  depth, spawn {xFrac,yFrac}` + optional `width, characterScale, ambient, weather[], ambientLight,
  lights[], emitters[], fog, colorGrade, vignette, lightning, darkAreas[], onEnter (Effect[]),
  npcs[] (placements), spawnPoints[]`.
- **LayerData** — `kind: 'image' | 'builtin' | 'animated'` in a `band` (`background|mid|foreground`),
  with `when?`, `parallax?`, fit/position; `animated` adds `frameWidth/Height/columns/frames/fps`.
- **InteractableData** — `kind: 'pickable' | 'interact' | 'exit' | 'inspect' | 'trigger'`, each with
  `id, hitArea (fraction polygon), when?` + kind fields (`item`, `to`, `effects`, `uses[]`,
  `text/audio`, trigger `on/exitEffects/by/once`).
- **ItemDef** — `id, name, icon?, examine?, examineWhen?[{when?,text}], use?[{when?,effects?,dialog?}]`.
- **NpcDef** (cast, under `GameDoc.npcs`) — `id, name?, speed?, dialog?, dialogWhen?, inspect?,
  view? / views?, voice?, footstep?, vision? {range,angle?,effects,unless?,once?,approach?},
  monologues?[{text,after?,every?,when?,sound?}], home?, routine?`.
- **NpcPlacement** (under `SceneData.npcs`) — `npc, spawn, when?, path? / paths?[NpcPath], dialog?`.
- **Dialog** — `{start, nodes: Record<id, DialogNode>}`; **DialogNode** `{speaker?, text?, effects?,
  choices?[{text,when?,effects?,next?}], next?, branch?[{when?,to}]}`.
- **Sequence** (cutscene) — `{steps: SeqStep[]}` (`wait/move/anim/face/dialog/effects/camera`).
- **GameRule** (global) — `{id?, when, then: Effect[], once?}`. **ClockConfig** — `{dayLengthSec,
  startMinutes?}`; routine edges gate on `fromTime/toTime` (minutes).
- **SoundAsset** — `{id, name, src}` (a data-URL); every sound field references a `SoundId`.

## Editing safely

- Read `src/data/schema.ts` first; match field names + `kind`s exactly.
- Reference existing ids; don't invent item/scene/sound ids that aren't defined.
- Keep it JSON-serializable (no functions); uploads are **data-URLs** stored inline.
- Validate by running `pnpm typecheck` (the doc is typed via `data/game.ts`) and loading the game
  (`pnpm dev`). Built-in sounds (`sfx-ambient/pickup/transition/footstep/rain`) exist in every doc.
