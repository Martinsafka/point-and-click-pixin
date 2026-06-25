# Magický polibek (A Magic Kiss) — the Pixin demo

A short, finished point-and-click **comedy** built entirely in the Pixin engine — the demo /
default project. You play **Claude**, a penniless tramp out for the king's reward (half the
kingdom) for waking the sleeping princess. The twist: true-love's kiss does nothing — only an
**onion-kiss** jolts her awake, in tears. 🧅

The whole game is data: **`game.json`** is a serialized `GameDoc` (schema in `src/data/schema.ts`) —
scenes, items, NPCs, dialogue, cutscenes, rules, the clock, atmosphere, and screens. Art lives in
`public/assets/` (pixel art generated with **PixelLab**). Run it: `pnpm dev`.

## The world

- **Hospoda** (tavern) — Claude, the Tavernkeeper, a wanted poster, the cellar, an old fork.
- **Ulice** (street, scrolls sideways) — a stray cat + a grate in the alley; the market (Fish
  vendor + a morning-only Onion seller); a fountain square with a snoozing drunk.
- **Věž** (tower) — the Guard at the door; inside, the sleeping Princess.

## How to play

- **Click** to walk; click an **object / NPC** to examine / use / talk. Click an inventory item to
  **select** it (the onion you **eat**), then click a world object to **use** the item on it.
- A **clock** drives the time of day: the **Onion seller** sells only in the **morning**; the
  **Guard** drinks only at **dinner** (and sobers up afterwards). Walk around to pass time.

## Walkthrough (spoilers)

1. **Tavern** — read the poster; take the fork (→ **hook**); strike the Tavernkeeper's rats-for-beer deal.
2. **Alley** — use the **hook** on the **grate** → **charm**.
3. **Market** — give the **charm** to the Fish vendor → **fish**.
4. **Alley** — give the **fish** to the **cat** → it follows you.
5. **Tavern** — use the **cat** on the **cellar** → rats gone → the keeper pours **beer**.
6. **Tower** (at **dinner**) — give the Guard **beer** ×3 → he passes out → the door opens.
7. **Inside** — kiss the Princess → nothing. Fetch an **onion** (market, **morning**), **eat** it,
   come back at dinner, kiss again → the **onion-kiss** wakes her → the warm, ridiculous ending.

## Credits

Director: **sabe** · everything else: **sabe** · in the lead role: **Claude**. Built in the Pixin
editor; pixel art by **PixelLab**.

---

## How the engine picks its document

In priority order (`src/data/game.ts`):

1. **Editor draft** — in dev only, the working doc the editor saves via **▶ Test in game**.
2. **`content/game.json`** — this file (this demo). Bundled into the production build.
3. **Built-in demo** — the street + room scenes in `src/scenes/`, used when no `game.json` exists.

## Publishing edits

Open `…/?edit` (dev), edit, then **Export** → drop the downloaded `game.json` here and commit it.
(This demo's `game.json` was authored programmatically, but editing it in the editor and
re-exporting works exactly the same — it's the same schema.)
