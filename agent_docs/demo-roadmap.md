# Demo game roadmap — _Magický polibek_ (A Magic Kiss)

The M13c demo: a short, finished, **A→Z** point-and-click adventure built **in the Pixin editor**
to showcase the engine + validate the docs / skills / asset pipeline. Becomes the scaffolder's
"demo" template and the repo's dev default.

This file is the **build plan**. We greybox the whole game with placeholders first (so it's
playable end-to-end early), then swap in real art — "art is a swappable layer". The **user makes
assets**; **mechanics are built together** in the editor / `content/game.json`.

---

## Test skills and PixelLab

This build doubles as a **live test** of (a) the Pixin authoring skills (`pixin-gamedoc` /
`pixin-editor` / `pixin-recipes`) and (b) **PixelLab via its MCP** for the pixel art — the agent
(Claude Code) assembles the **whole game itself**: mechanics authored straight into
`content/game.json` (verified by `pnpm typecheck` + the game loading), assets **generated through
the PixelLab MCP**.

- **Goal:** a **complete, working** demo, fast — everything we agreed must function. The pixel art
  does **not** need to be polished (the user reviews / tweaks it afterwards; art is a swappable
  layer, so it never blocks the mechanics).
- **Agent prereq — install the PixelLab MCP.** The user's subscription is active; the MCP just
  needs adding. MCP tools load at **session start**, so add it, then **start a fresh Claude Code
  session** — new tools don't appear mid-conversation. Nothing is lost across a restart (everything
  is on disk + the dev log); resume from this file (**both engine prereqs are ✅, next is P0**).
- **In the new session:** verify with **`/mcp`**, then tell the agent to continue the demo — it
  re-checks that the PixelLab tools are visible, reads `demo-roadmap.md` + `demo-assets.md`, and
  starts **P0 → …** generating assets via PixelLab.
- **Fallback:** if PixelLab is unavailable / insufficient, the agent greyboxes with simple
  hand-authored SVG / geometric placeholders so the demo still works end-to-end (swap art in later).

---

## Concept (locked)

**Pitch.** A fairy-tale comedy. You play a **nameless, penniless tramp** who's drunk away
everything and now wants the king's reward — **half the kingdom** — for waking the sleeping
princess. A Shrek/Fiona twist ending.

**Goal.** Wake the princess. The wall in your way: a **guard** won't let a tramp into the tower.
Solution: get him **drunk** (beer is just the guard's lullaby — _not_ the theme or the title).
Catch: you're broke, so you must **earn the beer** through a chain of favours.

**The twist (ending).** She isn't under a sleeping curse — true-love's kiss does nothing. What
wakes her is an **onion-kiss**: the hero eats an onion and his pungent kiss jolts her awake in
tears. A Shrek/Fiona finish — funny, but with a beat of warmth (she's charmed he went through all
that, not by his looks). The "magic" of the title is an onion.

**Tone.** Light, funny, pohádkové. No death / lose state — a puzzle comedy with one good ending.

## Scenes (3)

1. **Tavern** (start) — the hero at a tankard. A **wanted poster** (the king's proclamation = the
   goal), the **Tavernkeeper**, a **cellar** (interactable), an old **fork / wire** in a corner.
2. **Street** — **wide, scrolls sideways** (`SceneData.width` > viewport). Four zones, left→right:
   tavern door (exit) · **dirty alley** (the cat + a **grate**) · **market** (the fish vendor +,
   mornings only, the roaming onion seller) · **town square with a fountain** (an ambient "bush"
   NPC + the road to the tower).
3. **Tower** — the **Guard** at the door; inside, the **sleeping princess**.

## Cast & interactables

- **4 cast NPCs:** **Tavernkeeper** (tavern) · **Fish vendor** (market — static, trades the fish
  anytime) · **Onion seller** (market — **mobile, mornings only**, shouts "Cibule! Kupte si
  cibuli!") · **Guard** (tower — talk / drink only at **dinner**).
- **Interactables (not NPCs):** poster, cellar, fork→hook source, grate, **cat** (sits in the
  alley), **princess** (a sleeping sprite → `startDialog` + a kiss cutscene).
- **Ambient "bushes" (optional):** 1–2 idle townsfolk (a snoozing drunk on a bench, a beggar) —
  pure life: idle + monologues, no quest role.

## The dependency chain (game logic)

The Tavernkeeper gives beer only after you **clear the rats from his cellar** → you need a **cat**
→ the stray cat wants **fish** → the Vendor trades fish for her lost **charm** → the charm is in
the alley **grate**, fished out with a **hook** (the tavern fork).

Player's forward path (3 interdependent favours):

1. **Tavern** — read the poster (`read-poster`); take the **fork → `hook`**; talk to the
   Tavernkeeper → the rats-for-beer deal (`keeper-deal`).
2. **Alley** — use `hook` on the **grate** → **`charm`**.
3. **Market** — give `charm` to the **Fish vendor** → **`fish`**.
4. **Alley** — give `fish` to the **cat** → **`cat`**.
5. **Tavern** — use `cat` on the **cellar** → rats gone (`rats-cleared`) → Tavernkeeper unlocks
   **beer** (`beer-unlocked`; from now a `beer` is always available to take — "one at a time, lad").
6. **Tower** — give the **Guard** a `beer` ×3 (separate trips) → he passes out (`guard-asleep`) →
   the tower door opens.
7. **Inside (the wake puzzle)** — click the princess → one-option dialogue "**try a kiss**" → kiss
   cutscene → **nothing** (she mumbles). A run of **failed attempts** (shake / slap / yell —
   each a funny sleep-mutter, one of which hints "needs something stronger"). The fix: fetch an
   **`onion`** (market) → **eat it** (`ate-onion`) → "try a kiss" now plays the **onion-kiss** →
   she wakes in tears (`princess-awake`) → the funny-warm ending dialogue → `endGame`.

### Items & flags

- **Items:** `hook`, `charm`, `fish`, `cat`, `beer`, `onion`.
- **Flags:** `read-poster`, `keeper-deal`, `rats-cleared`, `beer-unlocked`, `beer1` / `beer2` /
  `beer3`, `guard-asleep`, `tried-kiss`, `ate-onion`, `princess-awake`.
- **Guard beer-ladder.** The engine has flags, not counters, so "3 beers" is a **dialogue `branch`
  router** over `beer1/2/3`: a choice "Offer a beer" (`when hasItem beer`) `takeItem`s the beer and
  advances the ladder; the 3rd sets `guard-asleep` + opens the door. _(3 keeps it tidy; 5 is fine
  — open question.)_

### Time of day (the clock showcase)

A **game clock** (Game logic → Clock) drives time-of-day; it makes the world feel alive and gates
the late game. **Needs the engine `timeOfDay` condition** (see the Prereq phase) — it gates `when`
anywhere (dialogue, NPC presence, exits, rules).

- **Onion seller** — placed in the market with `when: timeOfDay <morning>` + a patrol **path** + a
  **monologue** ("Cibule! Kupte si cibuli!"); appears only in the morning, vanishes when it passes.
  Buy an `onion` from him.
- **Guard** — the "Offer a beer" choice is `when: timeOfDay <dinner>` (only then can you drink him).
  The tower door is gated on `guard-asleep`. A **rule** sobers him up:
  `when all[ not timeOfDay <dinner>, guard-asleep ] → guard-asleep = false + reset beer1/2/3` — so
  once dinner ends he's back on duty and must be re-drunk next dinner.
- **The loop** — drink the guard at dinner → get in → kiss + attempts fail (no onion) → wait for
  **morning** → buy the onion → wait for **dinner** → re-drink the guard → get in → onion-kiss →
  win. _(The Tavernkeeper asks for nothing once `rats-cleared` — he just pours + quips "…someone
  left a fishing float here, eh?".)_
- **Lighting change** — per-time **gated lights / ambient** (bright morning vs golden / dusky
  dinner) swapped by `timeOfDay` — a visible change, not a continuous day/night cycle.
- _Passing time:_ the clock advances in real time (short `dayLengthSec`); walking around suffices.
  Optional: a "doze by the fire" interactable to skip to the next morning / dinner.

### Mechanic → recipe map (`pixin-recipes`)

- Tower door / beer-gate → **#1 locked door** (`when` on the exit).
- The favour chain → **#2 fetch quest** + **#8 global rule** (e.g. `cat + cellar → rats-cleared`,
  and the guard sober-up rule).
- Tavernkeeper / vendor / guard / princess talks → **#4 branching dialogue**.
- Kiss + ending → **#5 cutscene** + **#10 ending screen**.
- Onion seller / "bush" townsfolk → **#7 monologues** (+ a patrol path).
- **Time-gated dialogue / presence / door** → the new **`timeOfDay` condition** + the **clock**;
  routine time windows already exist for cross-scene NPCs.

---

## Build phases (the roadmap)

> Each phase is committable + testable on its own. Build with **greybox** (geometric / placeholder)
> art; the **real-asset pass** (Phase 8) swaps it in. Assets can be made in parallel — each phase
> lists what it needs.

- [x] **Prereq (engine, FIRST) — the `timeOfDay` condition.** ✅ _(variant A — time on
      **anything**.)_ The clock wrote `clockMinutes` but nothing except a routine edge could read
      it; now `when` gates on time everywhere (dialogue, NPC presence, exits, lights, rules).
      Resolves the M12c "general timeOfDay condition" follow-up. _(Shipped: `Condition` kind
      `timeOfDay {from?,to?}`; `inTimeWindow` moved into `conditions.ts`; `ConditionEditor` HH:MM
      inputs; 13-check Node test green.)_
  - **Schema** (`data/schema.ts`): `Condition |= { kind:'timeOfDay', from: number, to: number }`
    (minutes past midnight; wraps when `from > to`, e.g. 22:00–06:00).
  - **Evaluator** (`systems/conditions.ts`): a `case 'timeOfDay'` in `checkCondition` over
    `state.clockMinutes`. **Note:** the window helper `inTimeWindow` currently lives in
    `systems/routine.ts`, which imports from `conditions.ts` — so **move `inTimeWindow` into
    `conditions.ts`** (or a small shared `time.ts`) and re-import it in `routine.ts`, to avoid a
    cycle.
  - **Editor** (`editor/ConditionEditor.tsx`): add `timeOfDay` to the kind list + two **HH:MM**
    inputs (reuse `editor/time-format.ts`).
  - **Logic graph** (`editor/logic-scan.ts`): `timeOfDay` touches **no flag** → no change needed
    (it just won't appear in the flag web).
  - **Verify:** `pnpm typecheck` + `lint` + `build`; a small Node test of the `timeOfDay` case
    (inside / outside / midnight-wrap / no-clock); a quick gated-dialogue smoke. Then start P0.
- [x] **Prereq 2 (engine) — contact shadows (variant A).** ✅ Characters + opted-in props cast a
      soft **blob shadow** (a missed piece of M10). `engine/shadow.ts` `createShadowSystem` draws a
      depth-scaled ellipse (soft radial texture) at each caster's feet/base in a world-space pass
      **below** the entities (zIndex 5, between background + characters); hidden when the entity is.
      **Characters** auto (sample `displayObject` x/y/width). **Props** opt in via `LayerData.castShadow`.
      Per-scene `ShadowConfig {opacity, squash, scale, disabled}` (on by default). Editor: a Scene-tab
      **Shadows** section + a **shadow** checkbox per layer. No light direction (directional = V2).
- [x] **P0 — Scaffold.** Start a fresh `content/game.json` for this game (the old demo stays in git
      history): `start`, three empty scenes (tavern / street / tower), `referenceHeight`, a basic
      walkable per scene, and the three exits wiring them together. _(Assets: none — geometric.)_
- [x] **P1 — Greybox layout.** Block out each scene with placeholder layers + walkable + holes;
      make the **street scroll** (`width`); place the rough zones (alley recess, market spot,
      fountain). Walk the loop tavern↔street↔tower. _(Assets: none.)_
- [x] **P2 — Items & pickups.** Define `hook` / `charm` / `fish` / `cat` / `beer`; the **fork→hook**
      pickup in the tavern; the **grate**, **cellar**, poster as interactables (hit-areas + examine).
- [x] **P3 — NPCs & dialogue.** Place the **4 cast NPCs**; dialogue trees: Tavernkeeper (deal +
      the post-rats "free beer" quip), Fish vendor (charm→fish), **Onion seller** (sells onions; a
      morning patrol **path** + the "Cibule!" monologue), Guard (taunt + the beer-ladder).
- [x] **P4 — The favour chain.** Wire it: `hook` on grate → `charm`; `charm` to fish vendor →
      `fish`; `fish` to cat → `cat`; `cat` on cellar → `rats-cleared` → `beer-unlocked` (a rule).
      Verify the chain can't be skipped / soft-locked.
- [x] **P5 — Guard, clock & tower gate.** The **clock** (Game logic → Clock); the beer-ladder
      dialogue (`beer1/2/3` → `guard-asleep`) gated `when timeOfDay dinner`; the tower door
      `when guard-asleep`; the **sober-up rule** (resets at end of dinner); the onion seller's
      morning `timeOfDay` gate; **lighting** swapped morning↔dinner. Tune `dayLengthSec` + the
      morning / dinner windows so the loop is brisk.
- [x] **P6 — Princess & ending.** The sleeping princess (sprite + click → one-option dialogue);
      the **kiss cutscene** (fails); the **failed-attempts** beats (shake / slap / yell → funny
      sleep-mutters + the hint); the **`onion`** fetch + **eat** (`ate-onion`); the **onion-kiss**
      wake cutscene → `princess-awake` → the funny-warm ending dialogue → `endGame` → credits.
- [x] **P7 — Life & atmosphere.** Ambient "bush" townsfolk (idle + monologues); per-scene lighting
      / fog / weather (warm tavern, moody alley, fountain mist, tower); SFX + ambient beds + music.
- [x] **P8 — Real-asset pass.** Swap greybox for real art scene-by-scene + character atlases (see
      the **Asset checklist**); re-anchor / re-fit; tune.
- [x] **P9 — Framing.** Title / loading / credits screens, the **font**, scene transitions, the
      end flow.
- [x] **P10 — Full playthrough & polish.** Play A→Z, fix soft-locks, balance pacing, finalize
      `content/game.json` + a short `content/README.md`. _(This is the M13c deliverable.)_

---

## Asset checklist (for the user to create)

Formats + the exact grids are in **`agent_docs/editor_guide.md` → Preparing assets**. Greybox
first; these land in P8 (characters can come earlier if ready). **Generating the art (pixel art via
PixelLab): copy-paste prompts in [`demo-assets.md`](demo-assets.md).**

- **Backgrounds (3):** tavern interior, the wide street (sky / buildings / road, layered for
  parallax + the 4 zones), tower exterior + interior.
- **Character atlases (7):** the **player** (idle + 8-dir-ish walk + `talk` + `kiss` + `eat-onion`
  one-shots), **Tavernkeeper**, **Fish vendor**, **Onion seller** (walk + a "shout/gesture" pose),
  **Guard** (+ a `drink` / `sleep` pose), the **cat**, the **princess** (sleeping + waking-in-tears).
  Frame grid + clip naming (`walk.E` / `idle.S` / one-shots), anchor = feet.
- **Item icons (6):** hook, charm, fish, cat, beer, onion.
- **Props / set-dressing:** poster, cellar hatch, grate, market stall, fountain, the bushes.
- **Screens art:** title logo / background, loading, credits.
- **Audio:** tavern ambience + music, street bustle, tower wind; SFX (pickup, pour/gulp, snore,
  the wake); short voice blips per speaking character.

---

## Decided

- **Title** — **_Magický polibek_** (A Magic Kiss). The "magic" is an onion.
- **Princess wake** — no curse; true-love's kiss fails; **eat an onion → onion-kiss wakes her** (in
  tears), after a run of funny failed attempts. Ending is funny with a beat of Fiona-style warmth.
- **Tavernkeeper task** — rats in the cellar → need a cat. **Street's third zone** — fountain square.
- **Roster** — **4 cast NPCs** (tavernkeeper, fish vendor, **separate mobile onion seller**, guard).
- **Time of day** — a **clock** drives it: the onion seller is **mornings only**, the guard is
  drinkable **at dinner only** (+ a sober-up rule); lighting changes morning↔dinner.
- **How time gates things → variant A (locked):** add the engine **`timeOfDay` condition** (the
  Prereq phase) so `when` reads the clock anywhere — chosen over the routine-only / "timekeeper
  flag" hacks because we want time-gating on **anything** and it's the clean, missing primitive.
- **Shadows → variant A now (Prereq 2):** soft **contact / blob** shadows for characters (auto) +
  props (opt-in). **Directional, light-driven** shadows (a single shadow away from the **dominant**
  light = sun + scene lights blended by intensity × distance) → **V2** (a meaningful way to make
  scene lights affect shadows without one-shadow-per-light noise).

## Session additions (locked — build run)

- **Hero name** — the tramp is **Claude** (used in dialogue, intro, examines, credits).
- **Parallax backgrounds** — sky + nature composed as parallax bands (street + tower-exterior;
  the tower room shows a landscape through its window).
- **Animated assets** — dynamism in two layers: engine particles / light-flicker / fog drift
  now, plus PixelLab `animate_object` sprite layers in P8 (fire, fountain water, swaying sign,
  birds, breathing princess, cat-tail twitch).
- **Sounds** — full **default-style** audio: per-scene ambient beds, footsteps, pickup,
  transition, SFX (pour / gulp / snore / wake), per-NPC procedural voices. (PixelLab is image-only;
  use the engine's built-in / procedural audio — real recordings are a later swap.)
- **Credits** — the user is the **Director**; the alias **„sabe"** is credited on every other role
  (art / code / design / sound / writing) — a one-person-show gag.

## Open questions

- **Beer count** — 3 (recommended, tidy ladder) vs 5 (the original idea). Decide at P5.
- **The ending dialogue** — draft written in the design chat; finalise the exact lines at P6.
- **Clock tuning** — `dayLengthSec` + the exact morning / dinner windows (set at P5 for a brisk loop).

## Workflow

- **User:** makes assets (per the checklist) and drives creative calls.
- **Together:** build mechanics in the editor / `content/game.json`, greybox first, art-swap later.
- Each phase: build → **▶ Test in game** → `pnpm typecheck` → commit. Lean on the **`pixin-editor`**
  / **`pixin-recipes`** / **`pixin-gamedoc`** skills while building.
