---
name: pixin-recipes
description: "Ready-made point-and-click mechanic recipes for the Pixin engine — each maps a common pattern to the editor steps AND a content/game.json snippet. Use to implement a locked door, fetch quest, stealth beat, branching dialogue, cutscene, conditional weather, NPC monologue, a global rule, a flag-gated asset swap, or a game-over. Triggers on: pixin recipe, locked door, key, fetch quest, stealth, guard vision, dialogue choices, cutscene, weather, rain, monologue, rule, gate, swap asset, game over, how to build X in pixin."
license: MIT
---

# Pixin mechanic recipes

Each recipe = the **editor steps** + a minimal **`content/game.json`** snippet (each snippet is a
valid JSON fragment showing the key fields; merge it into the right place in the document).
Coordinates are **fractions 0..1**; `hitArea` is a flat polygon `[x0,y0,x1,y1,…]`. Confirm field
names against `src/data/schema.ts` (**`pixin-gamedoc`**); the editor mapping is in
**`pixin-editor`**. Flags are plain strings, created on first use.

---

## 1 · Locked door (a key gates an exit)

**Editor:** Items → **+ Item** `key`. Scene → Interactables → **+ exit** to the target scene, draw
its hit-area, set **when** = `hasItem key`. (Optionally a `pickable` for the key elsewhere.)

A `SceneData.interactables` entry:

```json
{ "kind": "exit", "id": "door", "to": "room", "hitArea": [0.4,0.5, 0.6,0.5, 0.6,0.9, 0.4,0.9],
  "when": { "kind": "hasItem", "item": "key" } }
```

## 2 · Fetch quest (collect parts → reward)

**Editor:** define the parts as items + pickables. Game logic → **Rules** → a rule that, when all
parts are held, sets a flag (and gives a reward / opens a gate).

`GameDoc.rules`:

```json
{ "rules": [
  { "id": "assembled", "once": true,
    "when": { "kind": "all", "of": [
      { "kind": "hasItem", "item": "gear" }, { "kind": "hasItem", "item": "handle" } ] },
    "then": [ { "kind": "setFlag", "flag": "machine-ready" }, { "kind": "giveItem", "item": "crank" } ] } ] }
```

## 3 · Stealth beat (guard vision + crouch at cover)

**Editor:** Characters → the guard NPC modal → **+ Vision** (range/angle, effects on seen, optional
**approach**), `unless` = `flag hidden`. Scene → Interactables → **+ trigger** at the cover spot,
`on` = **rest**, effects crouch + set `hidden`, **exitEffects** stand + clear it.

The NPC's `vision` (under `GameDoc.npcs.guard`):

```json
{ "vision": { "range": 0.42, "angle": 70, "approach": true,
  "unless": { "kind": "flag", "flag": "hidden" },
  "effects": [ { "kind": "say", "text": "Hey - stop!", "target": "guard" },
               { "kind": "setFlag", "flag": "spotted" } ] } }
```

A cover `trigger` in `SceneData.interactables`:

```json
{ "kind": "trigger", "id": "cover", "on": "rest", "by": "player",
  "hitArea": [0.2,0.7, 0.3,0.7, 0.3,0.9, 0.2,0.9],
  "effects":     [ { "kind": "setStance", "action": "crouch" }, { "kind": "setFlag", "flag": "hidden" } ],
  "exitEffects": [ { "kind": "setStance" }, { "kind": "setFlag", "flag": "hidden", "value": false } ] }
```

## 4 · Branching dialogue (a choice sets a flag)

**Editor:** Dialogs → **+ Dialog**; add nodes with **text** + **Choices** (each reply → effects /
next). Assign it in the NPC modal (**dialog**).

`GameDoc.dialogs`:

```json
{ "dialogs": { "stranger": { "start": "s", "nodes": {
  "s": { "speaker": "stranger", "text": "You're new here.",
    "choices": [
      { "text": "Who are you?", "effects": [ { "kind": "setFlag", "flag": "met-stranger" } ], "next": "who" },
      { "text": "(leave)" } ] },
  "who": { "text": "Nobody you need to know." } } } } }
```

## 5 · Intro cutscene

**Editor:** Cutscenes → **+ Cutscene** (steps: camera / move / dialog / wait / effects). Fire it
from a scene-entry **trigger** or any effect via `startSequence`. Add the cutscene to
`GameDoc.sequences`, then run `{ "kind": "startSequence", "sequence": "intro" }` from any effect.

```json
{ "sequences": { "intro": { "steps": [
  { "kind": "camera", "to": { "xFrac": 0.5, "yFrac": 0.4 }, "zoom": 1.3, "ms": 1200 },
  { "kind": "wait", "ms": 600 },
  { "kind": "dialog", "dialog": "stranger" },
  { "kind": "effects", "effects": [ { "kind": "setFlag", "flag": "saw-intro" } ] } ] } } }
```

## 6 · Conditional weather (rain while a flag is on)

**Editor:** Atmosphere → tune a **preset** (`rain` / `snow` / `dust` are pre-seeded). Scene →
**Weather** → add the preset with a **when**. Reactive — flip the flag to start/stop it.

`SceneData.weather`:

```json
{ "weather": [ { "preset": "rain", "when": { "kind": "flag", "flag": "storm" } } ] }
```

## 7 · NPC monologue (ambient line + sound)

**Editor:** NPC modal → **Monologues** → add lines (`after` / `every` ms, optional `when`, a
**sound** from the library). Eligible lines cycle.

The NPC's `monologues` (under `GameDoc.npcs.<id>`):

```json
{ "monologues": [
  { "text": "Rough part of town, this.", "after": 2500, "every": 7000, "sound": "sfx-pickup" },
  { "text": "You're still here?", "when": { "kind": "flag", "flag": "met-stranger" } } ] }
```

## 8 · Global rule (derived state → move an NPC)

**Editor:** Game logic → **Rules**. Runs game-wide on every state change.

`GameDoc.rules`:

```json
{ "rules": [
  { "id": "gate-open", "once": true,
    "when": { "kind": "flag", "flag": "all-keys" },
    "then": [ { "kind": "setFlag", "flag": "gate-open" },
              { "kind": "moveNpc", "npc": "guard", "scene": "barracks" } ] } ] }
```

## 9 · Flag-gated asset swap

**Editor:** Scene → **Layers** → two layers (image or animated) gated by opposite flags — the
runtime shows whichever `when` passes (e.g. a sign that changes to "cancelled").

`SceneData.layers`:

```json
{ "layers": [
  { "kind": "image", "band": "foreground", "src": "data:...normal.svg",
    "when": { "kind": "flag", "flag": "cancelled", "value": false } },
  { "kind": "image", "band": "foreground", "src": "data:...cancelled.svg",
    "when": { "kind": "flag", "flag": "cancelled" } } ] }
```

## 10 · Game over / ending

**Editor:** Project → **Screens** → enable Game over / End. Trigger from any effect list: a trap
trigger or a dialogue choice runs `{ "kind": "gameOver" }` (→ Game over screen, Retry / Title) or
`{ "kind": "endGame" }` (→ End → credits → final → title).

```json
{ "effects": [ { "kind": "gameOver" } ] }
```

---

**After any edit:** `pnpm typecheck` (the doc is typed) + `pnpm dev` to play, or **▶ Test in game**
in the editor. Uploaded art/audio are **data-URLs** stored inline; built-in sounds
(`sfx-ambient`, `sfx-pickup`, `sfx-transition`, `sfx-footstep`, `sfx-rain`) exist in every doc.
