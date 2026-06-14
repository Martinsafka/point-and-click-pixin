# Dev Log

Running log of changes — the project's memory for future sessions. **Append a new entry after every task** (newest at the top). Keep entries concrete and skimmable, not verbose.

## How to write an entry

Each entry has: a dated title, then **What / Why / How** (and optional **Follow-ups**):

- **What** — what changed (files / features touched).
- **Why** — the goal or reason.
- **How** — approach taken, key decisions, tradeoffs, anything non-obvious the next session needs.
- **Follow-ups** — known gaps, TODOs, deferred items (optional).

Example shape:

> ### 2026-06-13 — Click-to-move prototype
> **What:** Added `src/engine/scene.ts`, `src/entities/character.ts`; cube character moves to click point.
> **Why:** First system in the spike — validate input → movement in the layered scene.
> **How:** Lerp to target in the ticker; character is a `Graphics` cube behind a `view` interface so it's swappable for a sprite later. Click handled via Pixi `events` on the interactive-mid container.
> **Follow-ups:** A* over a walk-mesh deferred; footprint/anchor not yet modeled.

---

<!-- Newest entries below. Add yours on top of the list. -->

### 2026-06-14 — M7 step 4d.1: NPC definition modal (dialogue / inspect authoring)
**What:** An editor **modal** + the NPC's interaction config — so the dialogue / inspect runtime is authorable without hand-editing `game.json`. Characters → NPCs → **Edit** opens a modal: assign a **dialogue** (dropdown of the `GameDoc.dialogs` library), set **dialogWhen** (the full `ConditionEditor`, gating the dialogue), and the **inspect** "look at" (text + audio). New `EditorModal` (reusable dev-only modal) + `NpcEditor`; the editor store gains `patchNpcDef(npcId, patch)`.
**Why:** M7 step 4d (editor), first chunk — complements the NPC dialog↔inspect runtime just built, and establishes the **modal pattern** the dialogue node editor (4d.2) + appearance (4d.3) reuse. (Voice waits for 4c.)
**How:** `EditorModal` is a fixed backdrop + roomy panel (close on ✕ / backdrop; clicks inside don't bubble). `NpcEditor` reads the cast NPC live from the store and writes via `patchNpcDef` (a generic merge, so dialog / dialogWhen / inspect — and later view / voice — share one action); empty inspect (no text + no audio) clears the field. Name + speed stay inline in the cast row; Edit opens the deeper modal.
**Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** 4d.2 the Dialogs library + node editor (modal); 4d.3 per-NPC appearance (generalise `CharacterEditor` to any view); placement dialogue override in `NpcList`; voice = 4c.

### 2026-06-14 — NPC dialog ↔ inspect switch (condition-gated)
**What:** An NPC can now be **looked at** as well as talked to. `NpcDef` gains `inspect?: { text?, audio? }` (a "look at" line, like the inspect interactable) + `dialogWhen?: Condition` (gates the dialogue). Clicking an NPC resolves **dynamically** against story state: dialogue if present and `dialogWhen` passes, else inspect (walk up + the player comments), else nothing (the click falls through to a walk). The cursor reflects the resolution **live** — 👄 talk vs 👁 look. The "mode" is just flags: any `setFlag` (trigger / dialogue / interaction) flips `dialogWhen`. Demo: the street `stranger` is **inspect-only until you hold the key** (`dialogWhen: hasItem key`) — then clicking talks (cursor 👄).
**Why:** User wanted NPCs that switch between talk and look, driven from anywhere. Chose the **condition / flag-gated** model — consistent with the one effect/condition vocabulary, no new effect or per-NPC state. (Per-NPC scoped state stays for step 6, the routine.)
**How:**
- `NpcDef.inspect` + `dialogWhen`; the scene resolves the NPC's interaction **dynamically** (`resolveNpc(interaction, state)`) at click + hover, instead of fixed at mount. An NPC is interactive if it has either a dialogue or an inspect; a gated-off click with no inspect doesn't `stopPropagation` → falls through to a walk.
- `sceneHit` (the cursor bridge) returns `talk` / `inspect` from the same resolution, so the icon tracks the gate live as flags change.
- Inspect reuses the protagonist `say()` + audio path (same as the inspect interactable); the player faces the NPC.
- Editor (choosing dialogue/inspect + the gate) stays **4d**; authored in `game.json` for now.
- **Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** 4c voice; 4d the NPC editor (dialogue / inspect / appearance / voice) in the modal.

### 2026-06-14 — Talk cursor (👄) over dialogue NPCs
**What:** A new `talk` `CursorKind` — the 👄 emoji (or an uploaded icon) shows over an NPC the player can talk to (one with a resolved dialogue). Editor: `talk` added to the cursor upload list (👄 fallback).
**Why:** User request — a discoverable affordance that an NPC is talkable. (4b had left the talk-cursor as a follow-up.)
**How:** New `src/engine/hotspots.ts` — a tiny bridge (`sceneHit.kindAt`, like `cameraOffset`) the mounted scene publishes so the DOM `GameCursor`, which can't see moving entities, can ask which clickable NPC is under the pointer. The scene's hit-tester inverts the camera (pointer → design space) and tests each clickable NPC's box (its view's local bounds × the depth scale, around the feet), returning that NPC's cursor kind; cleared on teardown. NPCs win over interactables (matching the click, which NPCs capture via `stopPropagation`). `CursorKind` gained `talk`; both EMOJI maps (runtime + editor) + the editor `KINDS` list updated.
**Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** an NPC **inspect** mode (look vs talk) is under discussion — it'll reuse this same hotspot/cursor path (👁 vs 👄) and the click resolution.

### 2026-06-14 — M7 step 4b: dialogue runtime + UI
**What:** Dialogues are real. **Schema:** a `GameDoc.dialogs` library (`Dialog { start, nodes }`; `DialogNode { speaker?, text?, effects?, choices?, next?, branch? }`; `DialogChoice { text, when?, effects?, next? }`; `DialogBranch { when?, to }`) + `NpcDef.dialog` (default) + `NpcPlacement.dialog` (per-scene override). **Runtime:** a `dialogueStore` (vanilla zustand) walks the tree; a `DialogueBox` DOM overlay types the line out + lists choices. Click an NPC (with a resolved dialogue) → the player walks beside it → it **pauses + faces the player** (and the player faces it) → the conversation runs → on end it **resumes its patrol**. Demo: the street `stranger` has a small branching dialog (first-meet vs repeat via a `met-stranger` flag, a 3-way choice loop, a `setFlag`).
**Why:** M7 step 4b — per-NPC dialogue is the buildable narrative piece; the global scenario stays flags + conditions (branch / choice `when` + effects set flags).
**How:**
- `dialogueStore.begin(deps)` takes scene context (the `Dialog`, `run`, `check`, `nameOf`, `subject`, `onEnd`). `present(node)` routes `branch` **first** — state-driven openings evaluated against the *incoming* state, so a node routes before its own effects (a subtle but important order: putting effects first let the demo's `root` set its own gate and skip the intro). Then it runs effects and shows text + `when`-filtered choices (or falls through a pure router / effects node). `advance()` / `choose()` walk `next`; `finish()` resumes the NPC via `onEnd`; a hops guard caps redirect loops.
- **Scene:** a thin `run(effects, subject)` wraps the shared `runEffects` and also handles `startDialog` (it needs the scene's dialogs + actors). `beginDialogue` pauses / faces the partner + wires `deps`. NPCs with a resolved dialogue get `eventMode='static'` + a `pointertap` (stopPropagation, walk beside via `TALK_GAP`, begin on arrival). `onTap` + the NPC handler no-op while a dialogue is active (input is captured); `destroy()` ends an active dialogue (e.g. a dialogue `goTo` swapped scenes).
- **UI:** `DialogueBox` — a typewriter (steady interval; render-phase reset on line change, **not** setState-in-effect) + choice buttons; the box captures clicks (advance / pick). Mounted in the App overlay; a `useDialogue` hook mirrors `useStory`.
- The engine now imports the `dialogueStore` singleton (the first `state/` import in the engine) — a small boundary smudge to revisit at M13; the store is vanilla (no React / DOM). `dialogs` threaded `GameCanvas → createSceneHost → mountScene`.
- **Verified:** format / typecheck / lint / build green; `content/game.json` valid; a ported logic sim of the demo (branch first-vs-repeat, choices, end) **passes**; dev smoke `/` + `/?edit` 200.
**Follow-ups:** 4c voice (gibberish + uploadable clips); 4d the Dialogs library + node editor in a modal (+ per-NPC appearance, pinned earlier). Talking to a *moving* NPC uses its click-time position (it can drift before arrival) — approach / re-target polish later.

### 2026-06-14 — Editor QoL: effect pickers as dropdowns (animation + target) + greet loop fix
**What:** The effect editor's free-text fields became **dropdowns**: `playAnim` **action** + `wait` **anim** pick from the cast's available action clips, and `playAnim` **target** picks from the player + NPC cast. New `src/editor/effect-options.ts` derives the lists — `actionNames(doc)` (clip-key bases, e.g. `walk.E` → `walk`, unioned across the placeholder + the player view; per-NPC views join in 4d) and `actorIds(doc)` (`'player'` + cast ids). Also fixed the demo: the street `greet` trigger's `wait` now sets `anim: "interact"` so the `stranger` visibly **loops** the gesture during the pause.
**Why:** User feedback — authors couldn't tell which animation names / targets were valid. The reported "gesture isn't looping" was **not a bug**: `playAnim` is a one-shot by design, and the demo's `wait` had no `anim`, so nothing looped. The dropdowns make valid values discoverable; the demo now demonstrates the loop.
**How:**
- One `OptionSelect` (a select like `ItemSelect` / `SceneSelect`) in `EffectList` serves all three pickers; a current value not among the options stays selectable, so custom / stale names + removed cast ids are never silently dropped. `wait.anim` keeps an empty "—" option (optional). Target maps `'player'` ↔ `undefined` (the default) to keep the data minimal.
- `effect-options.ts` is pure derives over the working `GameDoc`. Threaded `animations` + `targets` through `InteractableForm` → `EffectList` / `UsesList`; `EffectList` stays controlled (props, not store reads). 4d's dialogue-node effects reuse `EffectList`, so they inherit the pickers for free.
- **Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` + `/?edit` 200.

### 2026-06-14 — Roadmap: per-NPC appearance pinned into step 4d
**What:** Pinned **per-NPC appearance** (atlas + clips, `NpcDef.view`) as an explicit task in **4d**, which was only loosely implied before ("appearance … layers in over steps 3–6"). 4d is now the NPC's **full-definition editor** (appearance + dialogue + voice) in the modal — appearance by **generalising the player's `CharacterEditor`** to any view (`{ view, onCreate, onChange, onRemove }`), runtime falling back to the placeholder. The cross-scene routine stays step 6.
**Why:** Spotted in the editor — an NPC can set only name + speed; only the player has a view editor (NPCs hardcode the placeholder in `scene.ts`). Folding appearance into 4d keeps the whole NPC definition authored in one modal.
**How:** Roadmap only — 4d expanded into appearance / dialogue / voice; the step-2b cast bullet de-vagued. Implementation lands with 4d.
**Follow-ups:** continue with **4b** (dialogue runtime + UI).

### 2026-06-14 — M7 step 4a: actor registry + `wait` effect
**What:** Lifted `runEffects` out of `mountScene` into a shared module (`src/engine/effects.ts`) over an **actor registry** (`Map<string, Character>` — `'player'` + each cast id), and added the **`wait`** engine effect (`{ kind: 'wait', ms, anim? }`). New `Character` controls: **`pause()` / `resume()`** (indefinite hold, preserves the walk path — for talk-pause), **`pauseFor(ms, anim?)`** (timed hold, optional looping `anim`), **`faceToward(x, y)`** (turn without moving). `CharacterView` gains **`loopAction(action, facing)`** (force-loop a clip; cube = no-op). Editor: `wait` added to the effect dropdown (ms + optional loop-anim). Demo: the street `greet` trigger now `playAnim` + `wait 1500` — the `stranger` reaches forward then lingers ~1.5 s before resuming its loop.
**Why:** M7 step 4a — the foundation 4b–4d (dialogue) stand on. The shared registry is what lets engine effects (`playAnim` / `wait` / pause / face) fire from triggers, clicks **and** (next) dialogue, all addressing the same live characters by id.
**How:**
- `runEffects(effects, actors, store, subject?)` — `playSound` / `playAnim` (target via the registry) / `wait` (on the **`subject`**, the actor the batch is "about"); everything still forwards to the store (engine kinds are no-ops). `mountScene` builds `actors` and a thin `run(effects, subject)` closure; `checkTriggers` passes the **enterer's id** as the subject. `wait` is **skipped for `'player'`** (player control is never frozen — user constraint).
- `Character` pause model rewritten: the single `paused` flag → three holds (`manualHold` / `holdUntil` clock-timed / `oneShotHold`) + `held()`; **"longest wins"** so a `wait` + a concurrent `playAnim` gesture compose (resume on the longer). `syncView` split into `positionView` (always — depth / Y-sort stay live while held) + the pose, so a held frame never restarts a loop clip.
- Schema: `wait` added to `Effect` (engine group); `applyEffect` no-ops it. Editor `EffectList` got the `wait` case (kept the exhaustive switches compiling).
- **Verified:** format / typecheck / lint / build green; `content/game.json` valid; dev smoke `/` 200 + changed modules transform 200.
**Follow-ups:** 4b — `GameDoc.dialogs` + `dialogueStore` + `DialogueBox` (typewriter + choices); click-NPC → walk + `pause()` + `faceToward(player)` + `resume()`.

### 2026-06-14 — Roadmap: M7 step 4 (dialogue) broken into 4a–4d + decisions locked
**What:** Detailed M7 step 4 into **4a** (actor registry + `wait` effect), **4b** (dialogue runtime + UI), **4c** (voice), **4d** (editor). Decisions locked with the user: conditional **`branch`** router on nodes; **per-placement dialogue override**; voice = procedural **gibberish demo default + uploadable per-NPC clips** (real VO); the dialogue **library / node editor opens in a modal** (room to work, and the future flowchart). The global story scenario stays **flags + conditions** for now (visual graph = M12). Roadmap only.
**Why:** Lock the dialogue architecture before building. The **actor registry** (shared live-character control: the scene registers `player` + NPCs by id, `runEffects` lifts to a shared module over it) is the central refactor 4b–4d depend on — it's what lets engine effects (`playAnim` / `wait` / pause / face) fire from the dialogue, not just the scene.
**How:** Roadmap M7 step 4 restructured into the 4a–4d sub-steps.
**Follow-ups:** start **4a** (actor registry + lifted `runEffects` + `wait`).

### 2026-06-14 — Roadmap: NPC pause behaviours folded into step 4 (talk-pause + `wait` effect)
**What:** Filed two requested NPC-pause behaviours into M7 step 4. (1) Talking to an NPC pauses it (+ faces the player) and resumes its loop / pingpong on dialogue end. (2) A `wait` effect (`{ kind: 'wait', ms, anim? }`) lets a trigger make the *entering* NPC linger — optionally **looping an `anim`** (idle-variant / fidget) for the duration — then continue. Both reuse the step-3 pause primitive (`paused`); step 4 adds public `Character.pause()` / `resume()` + `pauseFor(ms)`. Roadmap only — no code yet.
**Why:** Lock the design before step 4. **Key constraint (user):** the `wait` effect **must not pause the player** — only NPC movers — so player control is never frozen.
**How:** Roadmap M7 step 4 (two bullets). Pause resolves "longest wins" so `wait` + `playAnim` compose without cutting each other short.
**Follow-ups:** implement with step 4 (dialogue).

### 2026-06-14 — M7 step 3 follow-up: trigger gestures pause-resume + NPC speed on the cast
**What:** Two refinements to step 3's NPC system. (1) A trigger-driven `playAnim` on a **walking** character now **pauses the walk, plays the one-shot, then resumes** — so an NPC stops to gesture mid-patrol and walks on (the step-1 "defer to idle" never fired on a loop). (2) Walk **speed** moved from the path to the **global cast** (`NpcDef.speed`, editable in Characters → NPCs). Demo: the `stranger` slowly loops a street patrol and pauses to wave each time it crosses the `greet` trigger (`by: npc`, target `stranger`).
**Why:** The user's intended flow — an NPC reaches a trigger, stops, plays, continues — and speed is a property of the character, not of a route.
**How:**
- `Character.playOnce` while walking sets a `paused` flag (freezes movement at an idle pose so the walk doesn't override the one-shot), plays it, and clears the flag on completion. Replaced the `pendingAction` "defer to idle" from step 1.
- `NpcDef.speed` (was `NpcPath.speed`); `mountScene` now takes the **cast** (`Record<NpcId, NpcDef>`, threaded `GameCanvas → createSceneHost`) and applies `setSpeedScale` per NPC. Editor: `setNpcDefSpeed` + a speed field in the cast.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.

### 2026-06-14 — M7 step 3: in-scene NPC paths + NPC-triggered events
**What:** A placement can carry a **patrol path** (`NpcPath { points, mode: once | loop | pingpong, speed? }`) — the NPC walks the drawn waypoints via the nav-mesh (each leg rounds holes), chained on arrival. Triggers now fire on **NPC** entry too (`by: npc | any`), tracked per character — so an NPC reaching a spot fires an event (the chaining). Editor: a **Path** control on each placement (draw waypoints + once / loop / pingpong) with a dashed path + waypoints in the preview. Demo: the street `stranger` loops a patrol; the `greet` trigger (`by: any`) makes the player react when either crosses it.
**Why:** M7 step 3 — NPCs that move + the trigger→NPC chaining the routine (step 6) builds on.
**How:**
- `startNpcPath` resolves the path to design px and drives the NPC `Character` via `setTarget(waypoint, onArrive)`, advancing the index per mode; `Character.setSpeedScale` applies the optional per-path speed.
- `checkTriggers` now iterates the **movers** a trigger's `by` allows (player and/or NPCs) and tracks `inside` as a **Set of character ids** for per-character enter edges (`once` still fires once total).
- Editor: a unified `draw === 'npcpath'` mode appends waypoints (alongside `'npc'` for the spawn); `addNpcPathPoint` / `clearNpcPath` / `setNpcPathMode` — no preview re-mount.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** the cross-scene routine + runtime NPC location (step 6) builds on these in-scene paths; per-NPC appearance + dialogue layer onto the cast (step 4).

### 2026-06-14 — M7 step 2b: NPCs reworked to a global cast + per-scene placement
**What:** NPCs are now **global characters** (`GameDoc.npcs: Record<id, NpcDef>` — id + name; appearance / dialogue / routine layer in later) **placed** into scenes (`SceneData.npcs: NpcPlacement[]` = `{ npc, spawn, when }`). A character is placed in **at most one scene** (editor-enforced — the pickers only offer un-placed NPCs). Editor: a **Characters → NPCs** cast section + the scene's **NPCs** section becomes placement (pick a cast NPC + click-to-place + when). Demo: a global `stranger` placed in the street.
**Why:** Step 2's per-scene NPC data didn't suit recurring characters or the per-character dialogue / voice / routine coming up (which belong to the character, not the scene).
**How:**
- Schema: `NpcDef` (cast) + `NpcPlacement` (replaces `NpcData`); `GameDoc.npcs` + `SceneData.npcs: NpcPlacement[]`.
- Engine: `mountScene` iterates placements, spawns a placeholder `Character` per placement (the cast def has no appearance yet); runtime id = `placement.npc` so `playAnim` target still resolves. No cast lookup needed yet.
- Editor: cast id is **fixed at creation** (like items — placements + effects reference it), name editable; removing a cast NPC **cascades** to drop its placements. A `placedNpcIds` set (across all scenes) drives the one-scene-per-NPC constraint on the place pickers.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** an NPC's **current scene as runtime state** + a `moveNpc` effect (move between scenes) lands with the routine (step 6); per-NPC appearance / dialogue over steps 3–4.

### 2026-06-14 — Roadmap: NPC model reworked (global cast + per-scene placement) + narrative tiers
**What:** Recorded the agreed NPC architecture in M7. NPCs become **global characters** (a cast defined once: id / name now, appearance / sounds / dialogue / routine later) **placed** into scenes (`{ npc, spawn, when }`, click-to-place), **unique** — one NPC is placed in at most one scene. An NPC's current scene is **runtime state**; a `moveNpc` / `despawnNpc` effect + its routine move it between scenes ("appears elsewhere" = a logical action, not a second placement). Narrative is **two-tier**: a global **story scenario** (orchestrates several NPCs + the action sequence) + per-NPC **dialogue** bubbles (a reusable library + inline one-offs). Added **Step 2b** (the global-cast refactor) and **Step 6** (cross-scene routine flowchart). Roadmap only — no code yet.
**Why:** Step 2's per-scene NPCs don't suit recurring characters or dialogue / voice (which belong to the character). Lock the model before step 3 so paths / dialogue build on placements, not per-scene data.
**How:** Roadmap M7 restructured (2b + 6 inserted; 3 / 4 reworded). The player is conceptually "character 0" (unify later). The routine flowchart is its own grand step on top of the in-scene paths (step 3).
**Follow-ups:** implement **Step 2b** (global `GameDoc.npcs` cast + `SceneData.npcs` placements + uniqueness), then step 3.

### 2026-06-14 — M7 step 2: NPC entities
**What:** `SceneData.npcs?: NpcData[]` — characters placed in a scene (id + spawn + optional `view` + `when` gate), spawned alongside the player and **Y-sorted + depth-scaled** in the same band. Static for now (movement is step 3). The `playAnim` effect can now **target an NPC by id**, so a trigger can make an NPC react (a taste of the chaining). Editor: an **NPCs** section (Scene tab) — add / remove / id / when / **Place** (click the preview for spawn) + orange spawn markers. Demo: a `stranger` the street's `greet` trigger waves at when the player approaches.
**Why:** M7 step 2 — the cast that dialogue / paths / stealth build on.
**How:**
- `mountScene` builds the nav-mesh **once** and shares it across the player + every NPC (the visibility graph is O(corners²) to build — don't repeat it per character). Each NPC is a `Character` (placeholder view by default), positioned at its spawn, added to `interactive`, updated each tick, destroyed on teardown. A `when` NPC joins the existing conditional-visibility list — the store subscription is now **unconditional** so entries added after it (NPCs) are still refreshed. `runEffects` resolves `playAnim` `target` → the player or an NPC by id.
- Editor: NPCs are **DOM markers** (no Pixi re-mount on edit), placed via a unified `draw === 'npc'` mode; they render as sprites only in the game.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** per-NPC art upload; `by: npc` trigger checks + NPC movement paths (step 3) → NPCs walk into triggers and chain events.

### 2026-06-14 — M7 step 1: trigger interactables + engine effects
**What:** A 5th interactable kind **`trigger`** — an **enter-driven** hit-area that runs its `effects` when a character's feet enter it (not on click). `by: player | npc | any`, `once` + enter-edge debounce, gated by `when`. New **engine effects** `playSound` + `playAnim` (a one-shot on the player; NPC targets land in step 2). Editor: **+ Trigger** + form (by / once / effects), violet hit-area. Demo: a street trigger that waves (`playAnim 'interact'`) on entering the right side.
**Why:** First M7 piece — a generic "run anything on enter" volume that later reacts to NPCs (chaining) and drives the stealth crouch.
**How:**
- `mountScene` collects trigger volumes (hit-areas → design px) and, each tick, fires the ones the player's feet just entered (tracking `inside` for the edge + `fired` for `once`), gated by `by` + `when`. `pickInteractable` skips triggers (never clicked) and its return type now **excludes** the trigger variant — which kept the click / cursor code type-safe without changes.
- **Engine effects vs state effects:** the scene's new `runEffects` handles `playSound` (audio) / `playAnim` (`character.playOnce`) locally and forwards the list to the story store (which treats the engine kinds as no-ops via `applyEffect`). Both clicks and triggers route through it.
- **Gesture timing:** a trigger fires *mid-walk* (the feet cross into the area before the click point), and a one-shot during a walk is cancelled by the walk pose — so `Character.playOnce` **defers** the gesture to the next idle frame (it plays on arrival). A new walk discards a queued gesture.
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200. `sprite-view.playOnce` already no-ops on a missing clip.
**Follow-ups:** `by: npc`, `playAnim` on NPC targets, and `spawnNpc` land in **step 2 (NPC entities)**.

### 2026-06-14 — Planned M7 (NPCs, dialogue & stealth) — folded in triggers + NPC paths + stealth crouch
**What:** Expanded the roadmap's M7 into five chainable steps and added three user-requested mechanics: an **enter-driven `trigger`** interactable (reacts to player + NPCs), **drawn NPC movement paths**, and a **crouch-at-cover** stealth beat. Roadmap only — no code yet.
**Why:** Lock the M7 scope before building, so the trigger → NPC-path → stealth chaining is designed up front.
**How:** Step order **triggers → NPC entities → NPC paths → dialogue → stealth**. Triggers are step 1 because they extend the existing interactable model (a 5th hit-area variant, but feet-enter-driven) and are testable with the player alone. New Effects (`playSound` / `playAnim` / `spawnNpc`) introduce **engine effects** beside the existing state effects. Open decision for step 5: NPC detection model (simple proximity vs vision cone).
**Follow-ups:** start **M7 step 1 (triggers)** next.

### 2026-06-14 — Parallax backgrounds (per-layer scroll rate)
**What:** Background / foreground layers can scroll at their own rate via `LayerData.parallax?` (1 = with the world / default, <1 = farther & slower, 0 = locked to the viewport, >1 = nearer & faster). Applied in the camera loop; the editor exposes a per-layer **parallax** input (Layers list, background / foreground only). Demo: the street's sky / land / buildings are set to 0.3 / 0.5 / 0.7.
**Why:** Depth on scrolling scenes — a distant skyline barely moves while the near ground tracks the character. The last queued piece before M7.
**How:**
- In `mountScene` each non-`mid` layer with `parallax !== 1` is recorded with its base position; `updateCamera` (already per-frame) sets `layer.x = baseX + (1 − p) · (−pan) / scale` — shifting the layer back toward rest by `(1 − p)` of the camera pan (world-local design px, hence ÷ scale). `p = 1` → no shift; `p = 0` → fully counter-shifted (locked to the viewport).
- **Gameplay plane stays at 1:** parallax is restricted to background / foreground; the `mid` / `interactive` band carries the character + hit-areas + the cursor's world-conversion, which must not desync.
- The editor preview has no camera, so parallax shows only in the game; a slow layer must be wider than the scene to avoid revealing its edge (authoring note in the guide).
- **Verified:** format / typecheck / lint / build green; `game.json` valid; dev smoke `/` + `/?edit` 200.
**Follow-ups:** none. **All queued pre-M7 work is done** → next is **M7 (NPCs, dialogue & stealth)**.

### 2026-06-14 — Task B: scene-transition polish (loading spinner + custom wash / art / min hold)
**What:** Scene swaps gained a `GameDoc.transition` config — a **wash colour** (default black), an optional **centred art** image, and a **minimum hold** (ms). A **loading spinner** appears in the corner when a scene mount outlasts ~220 ms (quick swaps stay clean). Editor: a **Transition** section (Project tab) — colour / art upload / min-hold.
**Why:** The await-the-mount-under-cover invariant was already there (no blank frame); this adds feedback for slow mounts and lets a game style its transitions instead of a hard cut to black.
**How:**
- `createSceneHost`: the fade overlay is now a `Container` (colour-wash `Graphics` + optional cover-fit art `Sprite`), alpha-animated as before. The spinner is a rotating arc above it, raised by a `setTimeout(SPINNER_DELAY_MS)` that's cleared the moment `mountScene` resolves; `transition.minMs` then holds the wash for a floor duration. Re-confirmed invariant: **the fade-in never starts until the mount (and its assets) resolves.**
- Schema: `TransitionConfig { color?, image?, minMs? }`, threaded `GameCanvas → createSceneHost`. Editor `setTransition` (document-level, no preview re-mount).
- **Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** none essential. Next: **parallax backgrounds** (the last queued piece before M7).

### 2026-06-14 — Fix: pathfinding rewritten to a visibility graph (no more "walk across the scene")
**What:** Replaced the triangle-channel A\* + funnel with a **visibility-graph** path search. The earcut triangulation now only serves point-in-area tests (spawn / target clamp); the route is the shortest path through a graph over the obstacle corners (+ start / goal), edges being mutually visible (line-of-sight) pairs, A\* over Euclidean distance.
**Why:** Regression after the height-anchored design space: scenes now triangulate at a fixed wide aspect (e.g. 4224×1080), and aligned hole tops (collinear Y) made earcut emit degenerate triangles — which broke the triangle adjacency, so the channel A\* routed "the long way round" and the funnel faithfully followed → the character walked to the far side of the map and back. A randomized street check found 4.6% of paths with a >2.5× detour (worst 21–51×) and 3.6% leaving the walkable.
**How:**
- The **visibility graph** is robust to how earcut splits the polygon (the triangle dual is unreliable for thin / aligned geometry). Corners = the input polygon vertices (walkable + each hole). Corner↔corner visibility is precomputed once; start/goal edges are tested per query.
- **Line-of-sight** = no *proper* crossing of any walkable / hole outline edge **and** the segment midpoint is inside the walkable. The midpoint test is essential: a chord between two *opposite corners of one hole* shares an endpoint with every hole edge, so the strict segment-cross test alone never flags it (it would cut diagonally through the hole). Outline edges come from the **input polygons**, not the triangulation (collinear vertices leave phantom unmatched edges).
- **Verified (Node):** over 4–6k randomized street paths — **0 leave the walkable, 0 cut through a hole interior**; the worst detour is now 2.70× (a legitimate route around a hole). Directed cases (clear line, around-a-corner, weave-the-gaps) all optimal. format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** building the graph is O(corners²) (fine for hand-authored scenes; revisit only if one ever has hundreds of hole corners). Supersedes the earlier "funnel portal orientation" fix below.

### 2026-06-14 — Per-scene depth curve: piecewise scale stops + editor control
**What:** The per-scene depth scaling (character size by feet Y) is now a **piecewise-linear curve** of `{ yFrac, scale }` stops instead of a single near→far ramp. `DepthConfig.stops?` (≥2) defines it; scenes without it fall back to the `near/far` pair (a 2-stop ramp) — fully backward-compatible. New **Depth** section in the editor (Scene tab): a live curve graph + an editable stop list (add / remove / y / scale).
**Why:** A linear 2-point ramp can't express non-linear perspective (e.g. a compressed back wall). Stops give arbitrary control — the smooth version of "scale per Y-third" (hard thirds would pop the character at the boundaries). Composes with `characterScale` (per-scene baseline) and the resolution fit `S`.
**How:**
- `systems/depth.ts`: `DepthScale` now holds sorted px `stops`; `depthScaleAt` walks them (linear between, clamp outside). `data/scene-config.ts` `resolveDepthScale` builds + sorts the px stops from `stops`, or the near/far fallback.
- Editor: `DepthEditor.tsx` (curve `<svg>` + stop rows) writes `setDepthStops` (no preview re-mount — the graph is the live feedback; the spawn character updates on the next mount / Test in game).
- **Verified:** format / typecheck / lint / build green; a Node test confirms back-compat equals the old linear ramp, and piecewise interpolation + end-clamp + unsorted-input sorting; dev smoke `/` + `/?edit` 200.
**Follow-ups:** ghost characters at a few Y in the preview (richer feedback); demo scenes still use near/far (exercises the fallback). Next: **parallax backgrounds**; **Task B** (transition polish) still pending.

### 2026-06-14 — Editor: aspect-locked, re-fitting scene preview (areas no longer drift on resize)
**What:** The editor preview is now a **stage box of the scene's aspect**, centred in the pane; the Pixi canvas and the DOM overlays share that one box, so drawn areas (walkable / holes / hit-areas) stay put when the side panel is resized. `mountPreview` builds in design px under a `root` container scaled to fit the box and **re-fits on resize** (ResizeObserver on the canvas) — no re-mount. Scene **width** edits now re-mount the preview (commit on blur / Enter) so the box re-aspects.
**Why:** Bug: widening the panel changed the preview pane size, but the Pixi content was laid out once at mount and never re-fit — so the background drifted from the overlay grid, and an area drawn afterwards landed off-target in the game. (Also delivers the deferred aspect-correct preview: a wide scene shows its true shape instead of stretched-to-pane.)
**How:**
- **Editor:** a `.editor__stage` div sized in JS to `contain` the design aspect in `.editor__preview` (ResizeObserver on the pane); `<ScenePreview>` + overlays live inside it. Stage-size changes dispatch a `resize` so Pixi (`resizeTo: host`) re-fits the canvas. Width/characterScale use commit-on-release drafts; `setSceneWidth` now re-mounts.
- **Preview:** content built in design px under `root`; `root.scale = canvasHeight / designHeight` (uniform, undistorted), recomputed by a ResizeObserver on `app.canvas`. Layer drag is now scale-aware (`display.parent.toLocal`).
- **Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200.
**Follow-ups:** depth-scale stops (next, A.2); game-camera dead-zone still open.

### 2026-06-14 — M6: camera — height-anchored design space (responsive scaling + per-scene character size)
**What:** Replaced the viewport-multiple "world" model with a **design space**: the document has a `referenceHeight` (px, default 1080) and each scene a `width` (design px) + `characterScale`. The game wraps the bands in a `world` Container scaled so the **design height always fills the viewport** (one uniform scale `S = viewportHeight / referenceHeight`), then pans horizontally to keep the character centred (clamped; pillar-boxed if the world is narrower). New `engine/camera.ts` shares `{x, y, scale}` so the **DOM cursor** inverts the transform to design space. Editor: **Scene width** + **Characters %** (Scene tab) and **reference height** (Project → Display). Street demo → `width 4224, characterScale 2.2`; room → `1920, 2.4`. Closes M6.
**Why:** The old model tied the world size to the viewport, so a scene's aspect — and the character's on-screen size — drifted with the device. Anchoring on the **locked axis (height)** keeps art + characters a constant fraction of the screen on phone and 4k alike (the conclusion Unity's ortho camera / Godot `keep_height` also reach); `characterScale` then lets a scene drawn from a different angle resize the cast without retuning the perspective gradient (`depth`).
**How:**
- **One design space, one scale.** Everything (layers, walkable, holes, spawn, characters, depth) resolves in design px (= `scene.width` × `referenceHeight`); the `world` Container's `scale = S` cascades to all of it, so nothing desyncs. `interactive.toLocal` is inside `world` → clicks already arrive in design coords. Shared `designSize()` in `data/scene-config.ts`.
- **Resize-safe for free.** `updateCamera` (ticker, every frame) reads the *current* `app.screen`, recomputes `S` + the pan, and writes them — so a window resize / rotation re-fits with **no re-mount and no teleport** (the character keeps its design position). Vertical never scrolls (design height maps exactly onto the viewport height).
- **Character size = `depthScaleAt(feetY) × scene.characterScale × S`** (Character holds the per-scene factor; `S` comes from the world scale). The editor preview multiplies by the same factors (× `box.height / referenceHeight`) so the % slider reads truthfully.
- **Camera clamp:** `place(content, viewport, target)` centres when the content fits (pillar-box), else clamps the pan to `[viewport − content, 0]` around the character.
- **Verified:** format / typecheck / lint / build green; dev smoke `/` + `/?edit` 200. (Browser check is the user's; the dev draft shadows `content/game.json`, so **Discard** to see the demo numbers.)
**Follow-ups:** aspect-correct editor preview (a wide scene still stretches to the pane — the `characterScale` height-fraction is already faithful, only the width shape isn't); dead-zone smoothing; a viewport-bounds indicator. **M6 complete.** Next: **Task B — transition polish** (await-mount invariant + loading icon + custom transition art), then **M7**.

### 2026-06-14 — Fix: nav-mesh funnel portal orientation (direction bug)
**What:** Fixed pathfinding so the character no longer walks **through** a hole or takes a huge detour when travelling in certain directions. The funnel's portal left/right was derived from the triangle winding, which was only correct for **one** travel direction — right→left channels got flipped orientation, so the funnel string-pulled across the obstacle. Now left/right is oriented by the **travel direction** (curr centroid → next centroid).
**Why:** User report — a hand-drawn hole: the character walked through it and detoured to the far side of the map and back.
**How:**
- For each channel edge, `left` = the shared vertex on the left of the (currC → nextC) direction (`area2 < 0`), `right` = the other. Robust whichever way the channel runs.
- **Side effect:** also removed the suboptimal routing — the aggressive Node test's path/straight ratios dropped from 1.3–2.3 to **1.0–1.04** (near-optimal); the previous orientation was both wrong (R→L) and long.
- **Verified by Node tests:** 6 aggressive cases (directional / edge / non-convex incl. the previously-failing **R→L**) all walkable; the original 12-check regression + the street-holes check still pass. Plus format / typecheck / lint / build green; dev smoke 200.
- **Note on the user's #1 (no pre-added holes):** the editor + game were running the **localStorage dev draft** (from earlier testing), which shadows `content/game.json`, so the street holes I added didn't show. **Discard the draft** to see them — or a freshly drawn hole now routes correctly.

### 2026-06-14 — M6 editor: draw obstacle holes
**What:** The editor can draw obstacle **holes** (Scene tab → Holes). New `editor/HoleOverlay.tsx` (dashed-red polygons over the preview, the selected one with vertices; draw mode = click to add points). The Editor's draw modes are unified into one `Draw` state (`walkable | hole | hitarea | null`); `editor-store` gains `addHole` / `setHole` / `removeHole`. Also: **two obstacle holes added to the street scene** in `content/game.json` so pathfinding is visibly testable.
**Why:** M6 — author the obstacles the nav-mesh routes around, and give the demo something to route around (its walkables were convex quads → straight paths).
**How:**
- **Holes are navigation-only** (invisible in-game; the nav-mesh cuts them out) → a DOM overlay + no `revision` bump, like walkable. Per-hole select + Draw / Clear / delete, mirroring the interactables list.
- **One draw mode at a time:** replaced the per-overlay booleans with a single `Draw` union, so walkable / hole / hit-area drawing are mutually exclusive by construction.
- **Street holes verified:** a Node check on the real street walkable + holes — a left→right path returns **4 waypoints** (routes around) and the hole centre is not `contains`ed.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; nav check passes.
**Follow-ups:** vertex dragging on the overlays; in-game obstacle visuals are the author's own layers; then the **camera** (the last M6 piece).

### 2026-06-14 — M6: nav-mesh pathfinding (A\* + funnel)
**What:** The character now walks a **nav-mesh path** instead of a straight line. New `systems/navmesh.ts`: triangulate the walkable polygon minus obstacle holes (earcut), A\* over the triangle adjacency graph, then the **funnel** (string-pulling) algorithm → a smooth shortest path of waypoints. Schema: `SceneData.holes?: Polygon[]`. `Character` rewritten to **follow waypoints** (`findPath` on `setTarget`, walk waypoint-to-waypoint, clamp via the mesh); `scene.ts` builds the navigation from the resolved walkable + holes. **New dependency: `earcut`** (3.0.2, ISC, ~2 kB) — the de-facto polygon triangulator; hand-rolling hole-aware triangulation is error-prone.
**Why:** M6 pathfinding — straight-line + clamp-and-slide cut corners / hugged walls; the nav-mesh routes around concave walls + holes with natural shortest paths.
**How:**
- **Nav-mesh, not grid** (the user's choice): exact geometry, smooth funnel paths, scales to large open areas; holes = polygons cut from the triangulation. Pure geometry (no Pixi) → unit-testable.
- **Verified by a Node test** (`--experimental-strip-types`, 12 checks): a straight path on a convex square, routing around an **L-shape**'s inner corner, **avoiding a central hole**, plus clamp / contains — which confirmed the funnel portal orientation.
- The demo's walkables are convex quads (so straight paths) — the win shows on concave areas + holes (editor hole-drawing is the next M6 editor piece).
- **Verified:** format / typecheck / lint / build green; nav test 12/12; dev smoke 200.
**Follow-ups:** editor **hole drawing** (M6 editor); the cursor's walk-check still uses the outer polygon (ignores holes); a priority-queue A\* if meshes grow large; then the **camera**.

### 2026-06-14 — M6: scene transitions (fade through black)
**What:** Scene swaps now **fade through black** instead of hard-cutting. `createSceneHost` adds a black overlay above every scene (a huge rect, `eventMode none`), animated on `app.ticker`: on a `goTo`, fade out → destroy old + mount new → fade in. The first scene fades in from black (a soft intro).
**Why:** M6 — the `goTo` swap was an instant cut with a possible blank frame during the async mount; the fade hides both.
**How:**
- **Fade = alpha-lerp on the ticker** (`FADE_MS` each way); `fadeTo(target)` returns a promise the async `show()` awaits, so the destroy + mount run at full black.
- The overlay sits at `zIndex 10000` on the sortable stage, so it stays on top across swaps (a scene `destroy` only tears down the bands, not the fade); `eventMode none` so it never blocks clicks.
- Only the game (`createSceneHost`) fades — the editor preview (`mountPreview`) is a still.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; `fadeTo` in the transform. The actual fade is the user's browser check (walk the door street ↔ room).
**Follow-ups:** M6 **pathfinding** (A\* over the walkable mesh) next, then the **camera** (+ the overlay-follows-world note in the roadmap).

### 2026-06-14 — M5 step 4: editor Characters tab (player view descriptor)
**What:** The protagonist is now **authorable**. `GameDoc.player?: ViewDescriptor` holds the player's atlas + clips; the game + editor preview use it (threaded into `mountScene` / `mountPreview` / `createSceneHost`, default = the placeholder). New `editor/CharacterEditor.tsx` in the **Characters tab**: create-from-placeholder / remove, upload an atlas (with a numbered frame-grid overlay), set the frame grid (W × H, columns) + anchor, and define clips (name + frame indices + fps + loop). `editor-store` gains `createPlayer` / `removePlayer` / `updatePlayer` (bump `revision` so the preview re-mounts the sprite). Closes M5.
**Why:** M5's editor step — make the character data, not code.
**How:**
- **Threaded, not global:** the player view is a param on the engine mount fns (`playerView: ViewDescriptor = placeholderView`); the game passes `gameDoc.player`, the preview passes the editor doc's `player` (undefined → default placeholder). Editing bumps `revision` → the preview re-mounts the new sprite.
- **Frame-index authoring:** the atlas preview overlays a numbered grid (rows from image-height / frame-height) so clip frame lists are easy to fill. Clips are keyed `state.facing` (5 base dirs, W-side mirrors) + one-shot names — matching the runtime resolver.
- **Input ergonomics:** clip name + frames commit on **blur** (so typing doesn't re-key the row); grid / anchor / fps + loop are live.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, CharacterEditor). Authoring + the in-game custom character is the user's browser check.
**Follow-ups:** a footprint (separate from anchor); a visual frame-picker (click frames on the atlas); per-trigger animation assignment (now by convention); NPC characters (M7). **M5 complete** → next **M6 (Movement & camera)**.

### 2026-06-14 — M5 step 3: one-shot animations + onComplete
**What:** Clicking a pickable / interact (or using an item) now walks the character there, plays a **one-shot** animation (pickup = a crouch, interact = a forward reach), and runs the **effects on the animation's completion** (so the item appears after the reach-down). New `CharacterView.playOnce(action, facing, onComplete)`; `createSpriteView` plays a non-looping clip, fires `onComplete`, then reverts to the pose. `Character.setTarget` gains an optional `action`; on arrival it plays the one-shot and defers `onArrive` until it finishes. `scene.ts` maps interactable kind → one-shot (pickable → pickup, interact + use-on-object → interact). The placeholder atlas gained pickup + interact rows.
**Why:** M5 step 3 — actions land with weight (the protagonist performs the pickup / use before the result), reusing the existing arrive-callback path.
**How:**
- **Pose lock:** during a one-shot, `applyPose` keeps the clip (only turns); the `AnimatedSprite.onComplete` fires the callback + reverts. A new walk (state `walk`) cancels the one-shot **without** firing it (an interrupted pickup = no pickup).
- **Graceful fallback:** no clip for an action → `onComplete` fires immediately (the cube view + descriptors without one-shots still run the effects).
- **Placeholder one-shots:** `drawBody` gained `crouch` (lowers the upper body, feet planted) + `reach` (right arm forward); two extra atlas rows (`pickup`, `interact`).
- **Verified:** format / typecheck / lint / build green; dev smoke 200. The crouch / reach + effects-after-animation timing is the user's browser check.
**Follow-ups:** per-item pickup variants + a **talk** one-shot for inspect / dialogue (M7); **M5.4** the editor Characters tab (upload atlas, define clips incl. one-shots, map triggers).

### 2026-06-14 — M5 step 2: 8-direction walk cycle
**What:** The character plays **directional** clips. `ViewDescriptor.clips` are keyed `state.facing` (e.g. `walk.E`, `idle.S`); `createSpriteView` resolves the clip from the character's `facing` and **mirrors the W-side** (W / SW / NW = E / SE / NE flipped via `sprite.scale.x`), so 8 facings need only ~5 base directions. The procedural placeholder atlas grew to **5 rows** (S / SE / E / NE / N) × 6 frames, with a head/nose marker pointing in the facing direction (N = the back of the head).
**Why:** M5 step 2 — facing → the right walk cycle; mirror-to-5 keeps the atlas small (the `asset_pipeline.md` plan).
**How:**
- **Mirror map:** `BASE_FACING` sends each facing to its base direction (W→E, SW→SE, NW→NE); `MIRRORED` flips `scale.x` for the W-side. Resolution falls back `state.facing → state → idle.facing → idle`, so a state-only descriptor (M5.1 style) still works.
- **Placeholder conveys direction via the head:** the body + walk cycle are shared across rows; only the head/nose differs (front / diagonals show a nose pointing the right way; N is the darker back of the head). Real per-direction art comes from the editor upload (M5.4).
- **Verified:** format / typecheck / lint / build green; dev smoke 200. The actual 8-dir cycle + W-side mirror is the user's browser check.
**Follow-ups:** **M5.3** one-shots (pickup / interact) + `onComplete`; **M5.4** the editor Characters tab (upload atlas, define clips, map state / facing, anchor + footprint).

### 2026-06-13 — M5 step 1: AnimatedSprite character + view descriptor + placeholder atlas
**What:** The character is now an **`AnimatedSprite`** driven by a **`ViewDescriptor`** (atlas + grid + `state → clip`), replacing the placeholder cube — a data change via the `CharacterView` interface, not a logic refactor. New: `data/schema.ts` `ViewDescriptor` + `AnimClip` types; `entities/placeholder-atlas.ts` (a procedural character spritesheet drawn in code → PNG data-URL + its descriptor, idle + walk clips); `entities/sprite-view.ts` `createSpriteView` (loads the atlas, slices frame sub-textures, builds clips, plays idle / walk per `MoveState`, mirrors for west facing). `scene.ts` mounts it in both the game + the editor preview.
**Why:** M5 step 1 — realise the view-descriptor model from `asset_pipeline.md`; swap the cube for a real animated sprite, testable now via a procedural placeholder (no real art needed).
**How:**
- **Placeholder = a baked atlas, same path as real art:** the figure is drawn on a 2D canvas → `toDataURL` → loaded like any uploaded atlas, so the editor's future atlas upload reuses the exact `createSpriteView` load path.
- **View ≠ depth:** the AnimatedSprite is a child of the view `container`; facing mirrors `sprite.scale.x` while `Character` depth-scales `container` — independent axes.
- **Frames:** sub-textures share one atlas source (`new Texture({ source, frame })`); clips set `animationSpeed = fps / 60` + `loop`. `AnimatedSprite` auto-updates on `Ticker.shared` (movement stays on `app.ticker`).
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, both modules). The actual animation (idle bob / walk cycle / facing mirror) is the user's **browser check** — if it doesn't animate, switch the AnimatedSprite to the app ticker (a `view.update` hook).
**Follow-ups:** **M5.2** real 8-direction frames (clip keys `walk.E` …, mirrored to ~5) wired to facing; **M5.3** one-shots (pickup / interact) + `onComplete`; **M5.4** the editor Characters tab (upload atlas, define clips, map state / facing, anchor + footprint).

### 2026-06-13 — Editor IA: top-level tabs (Scene / Items / Characters / Project)
**What:** The editor panel is split into top-level **tabs** instead of one long scroll — **Scene** (Scenes · Walkable · Layers · Interactables), **Items** (Items · Recipes), **Characters** (placeholder for M5), **Project** (Cursors · Document). A persistent **footer** holds **▶ Test in game** / Discard (always reachable). Sections still collapse (accordion) within a tab; the panel stays drag-resizable.
**Why:** The user flagged the single panel was getting crowded; the big cohesive blocks (scenes / items / characters) deserve separation, and M5's character & animation editor needs its own space ("a second level"). Pre-M5 IA so M5 drops into the Characters tab.
**How:**
- **Tabs = a `tab` state** + a content switch; `changeTab` resets the draw modes. Panel layout is now `tabs (fixed) / tab-content (flex:1, scroll) / footer (fixed)`; the preview + overlays + resizer are unchanged. Test / Discard moved into the persistent footer (testing is frequent); Cursors + Document live in **Project**.
- **Verified:** format / typecheck / lint / build green; dev smoke 200. Tab switching / footer feel is the user's browser check.
**Follow-ups:** **M5** fills the Characters tab (character list + animation editor, likely its own master-detail level). Test animations for M5 = a **procedural placeholder atlas** (code-drawn frames → `AnimatedSprite`), matching the geometric-placeholder philosophy.

### 2026-06-13 — M4 cursor polish #2: walk-only-on-walkable + default cursor
**What:** The `walk` cursor (👣) now shows **only over the walkable area**; anywhere else over the scene (sky, walls, outside any area) shows a new **default** `CursorKind` (↖️ emoji or an uploaded icon). So the game has a fully custom cursor — no native pointer anywhere over the scene. Schema: `CursorKind` gains `default`. `GameCursor` hit-tests the walkable polygon (`containsPoint`) after the hotspot check; `CursorEditor` lists `default` (upload an icon). Also: **dropped #5** (pickable walk-through) — the user re-tested and the current click-on-hit-area pickup is already correct. Guide updated.
**Why:** The user's last M4 cursor polish — `walk` was showing over non-walkable areas (e.g. the sky); the walk cue should appear only where you can walk, with a custom default elsewhere.
**How:**
- **Hover order:** hotspot (`pickInteractable`) → its kind; else inside the walkable polygon (`containsPoint`, fractions → px) → `walk`; else → `default`.
- Adding `default` to `CursorKind` forced both EMOJI maps (GameCursor + CursorEditor) to list it (↖️), enforced by TS.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; `containsPoint` in the transformed `GameCursor`. The over-sky-vs-floor feel is the user's browser check.
**Follow-ups:** none — **M4 is fully complete** (core + all additions; the full look/use/talk verb modes remain the deferred optional). Next: **M5 — Characters & animation**.

### 2026-06-13 — M4 #1: inspect interactable (protagonist text + voice)
**What:** A 4th interactable kind, **inspect** — a plain click makes the protagonist "speak": its `text` shows as the narration line + an optional uploaded `audio` voice clip plays. New `CursorKind 'inspect'` (👁 emoji / uploaded icon). Schema: an `inspect` variant (`{ id, hitArea, text?, audio?, when? }`). Runtime: `scene.ts` walks to it, then `say(text)` + plays the clip; `audio.ts` gains `playClip(src)` (Howler; format derived from the `data:audio/<x>` mime, Howls cached). Editor: a **+ Look** button, an inspect form (text + audio upload), a teal hit-area, and the inspect cursor in `CursorEditor` / `GameCursor`. Guide updated.
**Why:** The user's important M4 addition — a "look at / comment" object with the protagonist's voice, distinct from the silent `examine` text.
**How:**
- **Audio via dynamic import:** `scene.ts` does `import('../audio/audio').then((m) => m.playClip(...))` only when a clip fires. `audio.ts`'s only static importer is `Menu.tsx` (game-only), so the **editor preview never loads audio** (no stray ambient) — the dynamic import keeps the engine's static graph audio-free too.
- **inspect has no effects/uses/examine** — just text + audio (the user wanted "just dialog"). `effectsFor` / `effectsForUse` gained inspect cases; the form gates the other fields off; the `say(examine)` line is now guarded to non-inspect kinds (a first typecheck caught `hit.examine` on the inspect variant).
- **Cursor:** adding `inspect` to `CursorKind` forced both EMOJI maps to list it (👁) — enforced by TS.
- Dialogue here is a single line + a clip; the full branching dialogue runtime is still **M7**.
- **Verified:** format / typecheck / lint / build green; dev smoke 200. Authoring + in-game speech / voice is the user's browser check.
**Follow-ups:** **#5 pickable** deliberate-click pickup is the last M4 addition; branching dialogue + voice-while-speaking is M7.

### 2026-06-13 — M4 polish: accordion sections, resizable panel, cursor fix
**What:** Editor QoL + a cursor bug fix. (1) Editor sections are now **collapsible** (a `Section` wrapper over native `<details>`, default open). (2) The side panel is **drag-resizable** (a splitter between panel + preview; `panelWidth` state; flex layout). (3) **Cursor fix:** the native pointer still showed under the custom icon — `mountScene` set `app.stage.cursor = 'pointer'`, which Pixi writes onto `canvas.style.cursor`, overriding the CSS `cursor: none`. Set it to `'none'`; the custom icon is offset up-left of the pointer so it's not on the click point.
**Why:** The editor grew long (9 sections) → collapsing + widening help; and the user reported the native cursor showing under the icon.
**How:**
- **Accordion = `<details>`** (controlled `open` + `onToggle` → per-section `useState`, default open) — no deps, keyboard-accessible.
- **Resize:** flex layout (`panel | resizer | preview`); the splitter's mousedown tracks window mousemove → `panelWidth` (clamped 240–720). A `useEffect` on `panelWidth` dispatches a window `resize` so Pixi's ResizePlugin re-fits the preview to its container.
- **Cursor:** the real bug was Pixi writing the canvas cursor; `stage.cursor = 'none'` fixes it. Icon offset via `transform: translate(-82%, -82%)` (tunable).
- **Verified:** format / typecheck / lint / build green; dev smoke 200; `cursor="none"` in the transformed `scene.ts`. Collapse / drag / cursor feel is the user's browser check.
**Follow-ups (still M4):** **#1 inspect** interactable (protagonist text + audio + eye cursor) is next; then **#5 pickable** deliberate-click pickup.

### 2026-06-13 — M4: context cursor (icons + emoji fallback)
**What:** An in-game pointer that changes by what it's over — walk / pickable / interact / exit — using an uploaded icon per context, else an emoji fallback (👣 ✋ ⚙️ 🚪). New `ui/GameCursor.tsx` (DOM cursor following the mouse; hover hit-test via `pickInteractable`; native cursor hidden on the scene canvas) + `editor/CursorEditor.tsx` (upload / clear an icon per kind). Schema: `GameDoc.cursors?` (`CursorKind` → icon URL). `editor-store` gains `setCursorIcon`; the Editor gets a global **Cursors** section. Guide updated.
**Why:** The user asked for the optional cursor part of M4's verb/cursor item, kept **simple** (icons + emoji) — not the full look/use/talk verb modes.
**How:**
- **Hover logic in the DOM, not Pixi:** the game canvas is fullscreen, so `clientX/Y` map to scene px → `pickInteractable` (pure, no Pixi) finds the hotspot under the mouse on each `mousemove`. No scene changes, no per-move store writes.
- **Native cursor hidden on `.game-canvas canvas`**; the custom cursor shows only while the mousemove target is the canvas, so UI chrome keeps its normal pointer.
- **Position via a ref** (no re-render); only kind / visibility use state, and bail out when unchanged.
- **Icons = uploaded data-URLs** on `doc.cursors` (survive Export); emoji fallback per kind.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, both modules). Feel + hover are the user's browser check.
**Follow-ups:** a "use item" cursor (the selected item's icon); walkable-vs-blocked distinction; the full look/use/talk verb system stays the deferred optional. **M4 is complete.**

### 2026-06-13 — M4 step 3: examine ("look at") + inventory item icons
**What:** **Examine** — `examine?` text on interactables + items; a plain click on an object (no item selected), or a click on an inventory item, shows it as a transient **narration line** (auto-clears). **Item icons** — `ItemDef.icon` is now authorable + rendered in the inventory. Schema: `examine?` on the three interactable variants + `ItemDef`. Runtime: `StoryStore` gains a **store-only** `narration` + `say()`; `scene.ts` narrates examine on click; `Inventory` narrates item examine + renders the icon; `App` shows the narration line. Editor: `InteractableForm` gets a **look** field; `ItemCatalogue` gets an **examine** field + an **+ Icon** upload (data-URL) with thumbnail / clear; `editor-store` gains `setInteractableExamine` / `setItemExamine` / `setItemIcon`. Guide updated.
**Why:** M4's last core piece (examine) + the user's item-icon request. Chose **upload** over auto-cropping the scene art — simple, explicit, reuses the layer-upload pattern; auto-crop is fragile (hit-area includes background; builtin vs image differ).
**How:**
- **Narration is store-only, not `StoryState`** → the save snapshot (which cherry-picks StoryState fields) ignores it; `reset` / `load` clear it; a 4 s React timeout auto-clears the line.
- **Examine fires on a plain click** (no selected item) so it doesn't fight item-use; inventory examine fires on any slot click.
- **Icons = uploaded data-URLs** on the item (survive Export), rendered in the slot (falls back to the name label).
- **Verified:** format / typecheck / lint / build green; dev smoke 200. Authoring + in-game narration / icons are the user's browser check.
**Follow-ups:** examine on an `exit` is cut short (the `goTo` changes scene immediately); optional auto-crop icon; the optional **verb / cursor** system would make "look vs use vs talk" explicit. **M4 core is complete** (verb/cursor is the only optional left).

### 2026-06-13 — M4 step 2b: item catalogue + recipe table
**What:** Document-level data authoring. New `editor/ItemCatalogue.tsx` (add / remove items, edit name; id fixed) and `editor/RecipeTable.tsx` (add / remove `a + b → output` recipes, reusing `ItemSelect`). Editor gains **Items** + **Recipes** sections (global, before Playtest). `editor-store` gains a `patchDoc` helper + `addItem` / `removeItem` / `setItemName` / `addRecipe` / `removeRecipe` / `setRecipe`. `editor_guide.md` gains an "Items & Recipes" section (per the new docs rule).
**Why:** M4 step 2b — author the inventory items + combine recipes that the interactable logic (giveItem / uses / recipes) references, completing M4's logic data.
**How:**
- **Document-level (`patchDoc`)** — items/recipes live on the `GameDoc`, not a scene, and don't touch the Pixi preview → no `revision` bump. The sections render from `doc.items` / `doc.recipes` regardless of the selected scene (grouped with Playtest / Document at the panel bottom).
- **Item id is fixed at creation** (auto `item`, `item-2`…) — interactables / uses / effects / recipes reference it, so only the display name is editable (cascade-rename is a follow-up). Pickers show items by name, so the generic id rarely surfaces.
- **Recipes reuse `ItemSelect`** (a / b / output) from the effect & condition editors.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, both modules). Authoring + the in-game combine is the user's browser check.
**Follow-ups:** cascade-rename item ids; warn when deleting a referenced item; item **icons** (upload + render in the inventory). **M4 step 3 — examine** ("look at" text) is the last M4 piece.

### 2026-06-13 — Editor guide + "document editor features" rule
**What:** New `agent_docs/editor_guide.md` — a usage guide for the visual editor: every panel / control (Scenes, Walkable, Layers, Interactables, Playtest, Document), the edit → test → publish loop, and reference tables (fit modes, Conditions, Effects). Added a standing rule to `workflow.md` (step 3, Execute), `AGENTS.md` (progressive-disclosure list), and `conventions.md` ("Done means"): any change under `src/editor/` must update the guide in the same task.
**Why:** The editor has grown (scenes · walkable · layers · interactables · logic forms) and was undocumented; it's the eventual OSS product surface, so its usage docs can't lag behind the code. The user asked for the guide + a process rule to keep it current.
**How:** Docs only, no code. The guide lives in `agent_docs/` (the project's doc home), written for the game author (it seeds the OSS user docs later) and listed in `AGENTS.md` so the agent reads it when touching `src/editor/`. Markdown is `.prettierignore`d, so no formatting churn.
**Follow-ups:** keep it current per the new rule. **M4 step 2b** (item catalogue + recipe table) next — it'll add an "Items & recipes" section to the guide.

### 2026-06-13 — M4 step 2a: Condition / Effect / uses forms
**What:** The editor authors per-interactable logic. New `editor/EffectList.tsx` (controlled `Effect[]` editor + shared `ItemSelect` / `SceneSelect`), `editor/ConditionEditor.tsx` (recursive `Condition` editor — hasItem / flag / visited leaves + all / any / not combinators), `editor/UsesList.tsx` (item → effects rules, reusing `EffectList`). `InteractableForm` gains `when` (gate), `effects`, and — for interact / exit — `uses`. `editor-store` gains `setInteractableWhen` / `setInteractableEffects` / `setInteractableUses`.
**Why:** M4's logic step — the full condition/effect vocabulary that powers all gating is now authorable, so an `interact` does things, exits/objects gate on conditions, and "use item on object" puzzles (crank → panel → gem) are buildable in the editor.
**How:**
- **Controlled components** (`value` + `onChange`) so `EffectList` is reused in interactable effects AND in each use rule's effects; the parent persists via the store. No `revision` bump (interactables are DOM-only).
- **Recursive `ConditionEditor`:** all/any render nested editors (+ add / delete each), not renders one. An `allowEmpty` prop lets the top-level gate be "(always)" while nested children must be real conditions. Union edits use `{ ...node, … }` spreads to keep the narrowed `kind`.
- **Panel widened 260 → 320px** + flex-wrap rows so the forms fit the column.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, all four modules). Authoring + in-game behaviour is the user's browser check.
**Follow-ups:** **M4 step 2b** — item catalogue (add/edit items) + recipe table; then **examine** (step 3). Note: pickable `effects` are the optional *extra* effects (giveItem + picked-flag stay implicit); `startDialog` is a marker until M7.

### 2026-06-13 — M4 step 1: place interactables + draw hit-areas
**What:** The editor can place interactables and draw their hit-areas. New `editor/HitAreaOverlay.tsx` (SVG/DOM overlay drawing every interactable's hit-area, colour-coded by kind, the selected one highlighted + labelled by id + vertices; draw mode = click to add points) and `editor/InteractableForm.tsx` (edit the selected one's id + essential field — pickable→item, exit→target scene — and draw/clear its hit-area). Editor gains an **Interactables** panel (+ Pick / + Use / + Exit, a list to select / delete). `editor-store` gains `addInteractable` / `removeInteractable` / `setHitArea` / `setInteractableId` / `setInteractableItem` / `setInteractableTo`.
**Why:** M4 step 1 — author the clickable objects (the jam slice's were hand-coded). Pickable + exit are end-to-end testable now; `interact`'s effects come in step 2.
**How:**
- **Interactables are invisible** (just hit-areas for `pickInteractable`), so they live in the DOM overlay, not Pixi — their store actions **don't bump `revision`** (no preview re-mount), like `setWalkable`.
- **Reused the walkable pattern:** SVG 0–1 viewBox + a click-catcher in draw mode → fractions. Walkable + hit-area overlays stack over the preview; **only one draw mode is active at a time** (mutually exclusive toggles), and both stay pointer-events-none when idle so the Pixi layer-drag underneath still works.
- **Defaults are valid:** a centred box hit-area + a unique id (`<kind>`, `<kind>-2`…); pickable defaults to the first item, exit to another scene — so a freshly placed object isn't broken.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, both new modules). Placing / drawing / in-game behaviour are the user's browser check.
**Follow-ups:** click a hit-area in the preview to select it; drag existing vertices; **M4 step 2** — Condition / Effect / `uses` forms + item catalogue + recipe table; then examine.

### 2026-06-13 — Fix: layer-drag grab offset (no jump on re-grab)
**What:** Dragging an image layer no longer snaps its centre to the cursor on grab. `makeLayerDraggable` records the pointer→origin offset at `pointerdown` and moves with `position = pointer + offset`.
**Why:** User report — grabbing a taller `width` strip made it jump (its centre leapt to the click point), so it looked like the saved Y position was lost / reset to default. The position *was* persisted (`setLayerPos` writes `yFrac`, re-mount reads it); the jump was the whole symptom, and it's worse for tall strips because the grab point sits farther from the centre.
**How:** on `pointerdown`, `grabX/grabY = display.position − e.global`; on move, `clamp(e.global + grab)`. A re-grab resumes from the layer's current (saved) spot with zero jump. X stays locked for `width` strips.
**Verified:** format / typecheck / lint / build green; dev smoke 200; the grab-offset is in the transformed `scene.ts`. The drag feel is the user's browser check.

### 2026-06-13 — M3 step 3c: `width` fit for horizontal strips
**What:** New image `fit: 'width'` — full-bleed horizontally (keeps aspect), positioned vertically by `yFrac` and **draggable on Y only** in the preview. For composing a scene from stacked bands (sky / land / road) instead of one backdrop. `makeLayerDraggable` gained an axis lock; `LayerList` lists the new fit + an updated tip.
**Why:** The user wanted to stack horizontal strips and slide them vertically — `cover` fills the screen and `contain` is centred/locked.
**How:**
- **`width` = scale to viewport width**, anchor centre, X centred, Y = `yFrac`. Renders identically in game + preview (shared `fitImageSprite`).
- **Axis-locked drag:** `makeLayerDraggable(..., axis)` — `width` strips move only on Y (X stays full-bleed; cursor `ns-resize`); `none` props keep free 2D drag.
- **Forward-compatible with M6:** positioned strips are exactly the unit a camera/parallax builds on — in M6 `width` reads against world-width and each strip gets a `parallax` factor. Larger-than-viewport scenes were **deferred to M6 by decision** (it's a coordinate-system change — viewport-fractions → world-space); no speculative fields added now.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; axis-lock (`ns-resize`) + the `width` branch present in the transformed modules. The visual drag is the user's browser check.
**Follow-ups:** optional snapping / arrow-key nudge; a `height` counterpart for vertical strips if it's ever needed. → **M4**.

### 2026-06-13 — M3 step 3b: drag image layers to position them
**What:** Free-positioned (`fit: none`) image layers can be dragged in the editor preview to place them precisely. Engine `mountPreview` gains an optional `onLayerMove` callback + `makeLayerDraggable` (makes such sprites interactive and moves them live). `editor-store` gains `setLayerPos(id, index, xFrac, yFrac)` (no `revision` bump). `ScenePreview` wires the callback → store; `LayerList` shows a positioning tip.
**Why:** The user asked to place uploaded props precisely with the mouse — `fit: none` images were stuck centered with no positioning UI.
**How:**
- **Clean boundary:** the engine takes a callback, not the editor store — `ScenePreview` injects `setLayerPos`. `engine/` stays React/editor-free.
- **Smooth, no jump:** the drag moves only the Pixi sprite live; `setLayerPos` records the fractions WITHOUT bumping `revision`, so the preview doesn't re-mount during/after the drag (mirrors `setWalkable`). A later structural re-mount recreates the sprite at the stored position.
- **Only `fit: none` is draggable** (cover/stretch/contain are screen-locked by design). Passive layers (builtins, the character) don't block hit-testing, so an image is grabbable even under them. Sprite anchor is center, so xFrac/yFrac = the prop's centre; the drag clamps to the viewport.
- **Verified:** format / typecheck / lint / build green; dev smoke 200; `makeLayerDraggable` present in the transformed `scene.ts`. The actual mouse-drag is the user's browser check.
**Follow-ups:** the same drag pattern serves **M4** (place interactables / draw hit-areas) and spawn-point placement; optional snapping / arrow-key nudge.

### 2026-06-13 — M3 step 3: upload image layers (M3 core complete)
**What:** The editor can upload images as scene layers. **Schema:** `image` LayerData gains `fit` (`stretch`/`cover`/`contain`/`none`). **Runtime:** `scene.ts` `fitImageSprite()` sizes/places an image sprite (cover fills the viewport keeping aspect; none = natural size, centered on `xFrac`/`yFrac`). **Editor:** new `editor/LayerList.tsx` + a **Layers** panel — upload an SVG/PNG (FileReader → data-URL stored in the doc) and, per layer, set band / fit / role, reorder (↑/↓), or delete. `editor-store` gains `addImageLayer` / `removeLayer` / `moveLayer` / `setLayerBand` / `setLayerFit` / `setLayerRole`.
**Why:** M3's last core piece — author scenes with real art, not just code painters. Completes the editor core (M3 done).
**How:**
- **schema → runtime → editor:** added `fit` to the schema, taught `buildLayer` to size the sprite, then exposed it. SVG/PNG load via `Assets.load(dataUrl)`; for `.svg` files the mime is forced to `image/svg+xml` so Pixi's SVG loader auto-detects it.
- **Builtin + image share the panel:** the list shows every layer (the demo's `builtin` painters too) — all can be rebanded / reordered / removed. Array order = paint order within a band; ↑/↓ swap neighbours.
- **Re-mount only when visual:** add/remove/move/band/fit bump `revision` (preview reloads; `Assets` caches data-URLs so it's cheap); `role` is metadata → no re-mount (mirrors `setWalkable`).
- **Uploads live in the document** as data-URLs, so they survive Export → `content/game.json`. (This is what will push the localStorage draft past its ceiling → the IndexedDB / async-load migration noted earlier.)
- **`content/` un-prettied:** added `content` to `.prettierignore` so the editor's exported `game.json` isn't reformatted on every `pnpm format` (prettier was collapsing it by ~81 lines); the editor owns that file's format, like `public/` and `*.md`.
- **Verified:** format / typecheck / lint / build green; dev smoke 200 (game, `?edit`, LayerList, scene). Whether an uploaded SVG visually renders is the user's browser check.
**Follow-ups:** image **props need positioning** (`fit:'none'` currently centers them — xFrac/yFrac drag handles, like the walkable overlay); per-layer `when` visibility + `anchorYFrac`; list thumbnails. → **M4** (interactables / items / recipes / exits).

### 2026-06-13 — content/ boundary: load a published game.json
**What:** New top-level **`content/`** (with a README) is the home for the game's data. `data/game.ts` now resolves the document in priority: **editor dev-draft (localStorage) → `content/game.json` → built-in demo** (street + room, in code). `content/game.json` loads via `import.meta.glob` (eager, optional) so the file is optional and bundles into the build when committed.
**Why:** The user asked where the editor's exported `game.json` should live so it actually drives the game — without a defined home + loader, Export was a dead-end download.
**How:**
- **Optional file via glob:** `import.meta.glob('../../content/*.json', { eager: true, import: 'default' })`, then pick the `game.json` entry; no file → empty map → demo. Avoids a static import of a maybe-absent file and keeps the demo as a permanent fallback (the engine always has content).
- **Demo stays in code, not duplicated as JSON:** deliberately did *not* hand-write `content/game.json` from the demo — that would be a parallel, drift-prone copy. The demo lives in `src/scenes/` (data + painters); `content/game.json` is for the author's *published* doc (their own Export, exact by construction).
- **Top-level `content/`** (sibling of `src/`, `public/`) for discoverability + matches the roadmap's `content` package boundary. `public/` would be wrong here (runtime-fetched static, not bundled content).
- Painters still register via the `src/scenes/*` imports regardless of which document wins.
- **Verified:** format/typecheck/lint/build green; dev smoke 200 (game, `?edit`); glob wiring confirmed — the transformed `game.ts` gains the content import only when `content/game.json` exists (temp file → +2 references → removed).
**Follow-ups:** a dev-server endpoint that writes `content/game.json` directly (Export without the manual move). Assets (SVGs / atlases / audio) join `content/` as the pipeline grows.

### 2026-06-13 — M3: editor → game test loop (localStorage doc draft)
**What:** Close the edit → play loop. New `data/doc-draft.ts` (load / save / clear / has a `GameDoc` in localStorage, DEV-only). `data/game.ts` splits into `bakedGameDoc` (the shipped const) + `gameDoc = loadDocDraft() ?? bakedGameDoc` — in dev, an editor draft overrides the baked doc. Editor gains a **Playtest** section: **▶ Test in game** (save the working doc as a draft, then open the game, dropping `?edit`) and **Discard** (clear + reload). The game shows a small **dev draft** badge while a draft is active.
**Why:** The user's question — after editing you couldn't leave the editor and try the changes in the real game. The editor mutated a clone, the game ran the const `gameDoc`, with no bridge between them.
**How:**
- **localStorage (sync), not IndexedDB:** the game's `gameDoc` resolves the draft synchronously when `data/game.ts` evaluates, so no async-boot refactor of the store/host. The save-game slot stays on IndexedDB — different concern (playthrough state vs the authoring document).
- **Builders still register:** `data/game.ts` keeps importing the scene modules (side-effect registers the `builtin` painters), so a draft reusing those builder keys renders.
- **DEV-only:** `loadDocDraft` / `hasDocDraft` gate on `import.meta.env.DEV`; prod ignores any localStorage and ships `bakedGameDoc`.
- **The loop:** `?edit` → Test → title → New game plays the draft; the editor's working clone also starts from `gameDoc` (= the draft), so reopening `?edit` continues editing it. Discard reverts both to baked.
- **Bug fixed this turn:** `App.tsx` referenced `hasDocDraft()` without importing it (an edit in the previous turn had silently failed on a text mismatch, right before the context compacted); added the import. Caught on re-read, then confirmed by typecheck.
- **Verified:** format + typecheck + lint + build green; dev smoke 200 for the game, `?edit`, and the new `doc-draft.ts` transform.
**Follow-ups:** localStorage's ~5 MB ceiling will bite once layers embed SVG data-URLs (M3 step 3) → move the draft to IndexedDB + an async document load then. "Publish to repo" is still Export-JSON-and-bake; a dev-server endpoint that writes `src/data` is the later convenience. **Next:** layer upload — the last M3 core piece.

### 2026-06-13 — M3 step 2b: walkable polygon drawing
**What:** Draw a scene's walkable area in the editor. New `editor/WalkableOverlay.tsx` — a DOM/SVG overlay over the preview that draws the walkable polygon (filled outline + vertex dots) and, in **Draw** mode, turns clicks into vertices. Editor gains a Walkable section (Draw toggle / Clear / point count); `editor-store` gets `setWalkable(id, polygon)` (no `revision` bump). `ScenePreview` now mounts once (re-mounts via React key only), so walkable edits don't tear the Pixi canvas down.
**Why:** Walkable was the most painful thing to author by hand — now you click it out on the live preview (and the existing street/room areas show up immediately).
**How:**
- **Overlay uses screen fractions directly:** SVG `viewBox="0 0 1 1"` stretched to the pane (`preserveAspectRatio: none`) + `vector-effect: non-scaling-stroke` for crisp lines; vertices are DOM dots positioned by `%`. Aligns with the Pixi scene (also positioned by fractions). Clicks → fractions via `getBoundingClientRect`.
- **No re-mount while drawing:** `setWalkable` updates the doc but doesn't bump `revision`; the preview keys on `selectedId-revision` and mounts once (effect `[]`), so each point updates only the React overlay, not the canvas. (Mount-once needed an `exhaustive-deps` disable — re-mount is intentional, via the key.)
- Clicks round to 3 decimals; switching scenes exits Draw mode.
- **Verified:** typecheck + lint + build green; dev server transforms the modules. Visual — `?edit`: Draw → click the preview → the road polygon appears; Export to see it in the JSON.
**Follow-ups (M3):** last piece — **layer upload** (SVG → place in band, reorder, set role); then persist the doc into the project (dev endpoint).

### 2026-06-13 — M3 step 2: editable doc + add/delete scenes + JSON save/load
**What:** Editor goes from read-only to editable. New `editor/editor-store.ts` (Zustand) holds a **mutable clone of `gameDoc`** + selection + a `revision` counter; actions select / add / delete scene + setDoc. The panel gains **+ Scene / Delete** and **Export / Import** (download/upload the doc as JSON). The live preview re-mounts on `selectedSceneId-revision`.
**Why:** M3 step 2 — the data-mutation layer + persistence that the visual tools (walkable, layers) build on.
**How:**
- **Working doc is a clone**, so editing never touches the const `gameDoc` (the running game). Add → a blank scene (default floor walkable + spawn, no layers); delete keeps ≥1 scene and fixes `start` / selection.
- **Save/load = JSON export/import** in-session (download a `game.json`; import validates `scenes` + `start`). Wiring an edited doc back into the build (or loading it at runtime) is a later integration.
- **Preview keys on `selectedId-revision`** so any structural change re-mounts it; walkable edits (step 2b) will use a separate overlay so they don't re-mount.
- **Verified:** typecheck + lint + build green; dev server transforms the editor modules. Visual — `?edit`: add/delete scenes, export → a JSON file, import it back.
**Follow-ups (M3):** **walkable polygon drawing** (SVG overlay over the preview — step 2b); then layer upload / order / role; later, persist the doc into the project (dev endpoint) so edits survive a reload without manual import.

### 2026-06-13 — M3 step 1: editor shell + scene panel + live preview
**What:** Started the editor. `?edit` (DEV-only) routes `main.tsx` to a new `<Editor>` (`src/editor/`) instead of the game: a left **scene panel** (lists scenes from `gameDoc`, click to select) + a **live preview** of the selected scene. New `engine/mountPreview(app, scene)` renders a scene's layers (reusing the layer builder) + a static character at spawn, no gameplay input. `createPixiApp` now takes a `resizeTo` target so the preview canvas sizes to its pane.
**Why:** M3's first chunk — the editor shell + read-only live preview, the surface every later editing tool hangs off.
**How:**
- **Dev-only routing:** `isEditMode()` = `import.meta.env.DEV && ?edit`; `main.tsx` renders `<Editor>` or `<App>`. Editor lives in `src/editor/` (the dev-only boundary). Excluding it from the prod bundle is a packaging task; for now it's bundled but never rendered in prod.
- **Preview = visuals only:** `mountPreview` reuses the engine's `buildLayer` + band/zIndex/depth logic but skips input/ticker/interactables; conditional layers evaluate against an empty initial state. Small band/layer duplication with `mountScene` (left untouched; extract later).
- **Per-scene preview:** `ScenePreview` mounts a Pixi app sized to its container, re-mounts on scene change (StrictMode-safe, like GameCanvas).
- **Verified:** typecheck + lint + build green; dev server transforms the editor modules. Visual — open `…/?edit`.
**Follow-ups (rest of M3):** scene add/delete; an editor store (mutate the `GameDoc`); upload SVG layers + reorder + role; draw the walkable polygon on the preview; save the doc (JSON / dev endpoint).

### 2026-06-13 — Roadmap: scheduled the extra features
**What:** Promoted the candidate backlog into proper milestones at sensible spots: **M6 Movement & camera** (pathfinding A\*/walk-mesh · camera / scrolling scenes · scene-transition fades) and **M8 Cutscenes / scripted sequences**; folded **examine** + optional **verb/cursor** into M4, and **settings (volume)** + **i18n** into M11 (UI theming). Final layout is M0–M13; cross-references fixed.
**Why:** User asked to schedule all the recommendations + nice-to-haves, not leave them in a backlog.
**How:** No code — roadmap only. Movement & camera (M6) sits next to Characters (M5); cutscenes (M8) follow NPCs/dialogue (M7) since they orchestrate characters + lines + effects.
**Follow-ups:** Start the editor (M3).

### 2026-06-13 — Roadmap: characters & animation + candidate backlog
**What:** Added **M5 — Characters & animation** (view descriptor `state → animation`, AnimatedSprite swap of the placeholder cube, 8-dir walk, one-shot triggers pickup/interact/talk with `onComplete`; editor uploads frames + maps states/triggers). Renumbered NPCs → M6 (an NPC = a character + idle anim + the same set), audio → M7, atmosphere → M8, UI theming → M9, story graph → M10, packaging → M11; fixed cross-references. Added a **Candidate additions** backlog: pathfinding (A\*/walk-mesh), camera/scrolling scenes, scene transitions (fade), cutscenes/sequences, settings (volume), i18n, verb/cursor system, examine items.
**Why:** Capture the player + NPC animation/authoring the user flagged, plus likely-forgotten engine features, before starting the editor (M3).
**How:** Characters & animation realise the view-descriptor model already specced in `asset_pipeline.md`; the view/logic split (placeholder cube behind a swappable view) means the swap is a data change, not a refactor. Triggers stay data-driven (the picked item/object names the one-shot). No code changed.
**Follow-ups:** Editor is next (M3).

### 2026-06-13 — M2b: title screen + exit-to-title  ← M2 complete
**What:** The app now has two phases — **title** and **playing**. New `ui/TitleScreen.tsx` (New game / Continue; DOM for now). `App.tsx` holds the phase: New game resets the store + enters, Continue loads the save + enters; the Pixi world (GameCanvas) only mounts while playing. The in-game `Menu` drops New game/Continue and gains **Exit to title** with a confirmation (unsaved progress is lost).
**Why:** The flow requested — in-game you Save or Exit; on the title you start New game or Continue a save. Completes M2.
**How:**
- **Phase = React state in App.** The title branch returns `<TitleScreen>`; the playing branch renders the game + overlay. Hooks stay unconditional (the early return is after them). The store is set (reset/load) *before* entering, so the scene host mounts the right scene.
- **Exit tears the world down** (GameCanvas unmounts → Pixi app destroyed) and leaves the in-progress state in the store until New game (reset) or Continue (load) overwrites it — so unsaved progress is genuinely discarded, as warned.
- **Exit confirmation** is a two-step menu panel; ESC / Resume / backdrop all drop it in handlers, not an effect (lint: `react-hooks/set-state-in-effect`).
- The rich SVG-composed title is deferred to the editor (M8); this is a clean DOM placeholder.
- **Fix:** `saveGame` now persists only the plain `StoryState` fields. `storyStore.getState()` also carries the store's action functions, which IndexedDB's structured clone rejected — so Save silently failed (and Continue stayed disabled). Confirmed with a `structuredClone` check.
- **Verified:** typecheck + lint + build green; dev server transforms the modules.
**Follow-ups:** M2 done → **M3 (the editor)**. Same-scene re-mount-on-reset/load still pending; title visual composer is M8.

### 2026-06-13 — M2: ESC menu + save/load (IndexedDB)
**What:** Menu opens/closes with **ESC**. One-slot **save/load**: `src/state/storage.ts` (hand-rolled IndexedDB wrapper — `saveGame` / `loadGame` / `hasSave`), a `load(state)` store action, and Save / Continue buttons in the menu (Continue disabled when no save; "Saved ✓" feedback).
**Why:** M2's first chunk — runtime polish + persistence, before the title screen and the editor.
**How:**
- **Save = the serialisable story state** (currentScene, flags, inventory, visited) put under one IndexedDB slot, versioned (old saves ignored). The per-frame world (cube position) isn't saved — re-mounting the scene on load reconstructs it. `load` clears `selectedItem`.
- **Load drives the store**, and the existing subscriptions follow: the host swaps to the saved scene (if it differs), the visibility subscription refreshes pickables to match flags, the inventory bar reflects the loaded items.
- **No new deps** — hand-rolled IDB (~50 lines) instead of a library, for one slot.
- **Verified:** typecheck + lint + build green; dev server transforms the modules. Save → Continue is a browser/IDB flow — test in `pnpm dev`.
**Follow-ups:** M2b — title / start screen (app phase title→playing; a visual title scene + Play / Continue). Re-mount-on-reset/load would make a same-scene restart re-spawn the cube (currently it doesn't).

### 2026-06-13 — Roadmap expanded (post-M1 feature planning)
**What:** Reworked `agent_docs/roadmap.md` to fold in 9 requested feature areas. New layout: M2 runtime polish & framing (ESC menu, save/load via IndexedDB, title/start screen), M3 editor core, M4 editor interactables/items/recipes, M5 NPCs + dialogue (typewriter) + stealth (NPC vision) + voice gibberish, M6 audio authoring (conditional per-entity sounds incl. footsteps), M7 atmosphere & lighting (stylised), M8 UI theming, M9 story graph, M10 packaging.
**Why:** Map the path from the jam slice to the full reusable engine + editor before building the editor.
**How:** Every feature stays schema-first → runtime → editor. Honest scoping on the two ambitious asks: lighting = stylised chiaroscuro (Pixi blend modes / shaders, not normal maps); fog/clouds = animated-noise fake (not raymarched volumetrics) — both fit flat vector and run fine in-browser. Old M1 "stealth detection" folded into M5 (NPC vision). No code changed.
**Follow-ups:** Next is M2 (runtime polish) or jump straight to the editor (M3).

### 2026-06-13 — M1: menu + audio  ← M1 / jam slice complete
**What:** Finished M1. A React menu (`ui/Menu.tsx`): a corner button → panel with Resume / New Game (`store.reset`) / Mute. Audio (`src/audio/`): Howler playing placeholder sounds generated in code as WAV data URIs (`sounds.ts`) — a soft drone ambient loop + pickup/transition SFX — wired to the store (`audio.ts`): a blip when inventory grows, a chime on scene change; mute toggles `Howler.mute`. App renders the menu; styles added.
**Why:** Close out M1 (UI + audio) — the 2-scene slice is now a self-contained, playable jam build.
**How:**
- **No audio assets yet, so synthesise them:** `sounds.ts` builds short 16-bit PCM WAVs (a seamless drone + faded blips), base64-encodes them as `data:` URIs, and Howler loads those. Real files swap into the same `Howl`s later. (~79 kB baked into the bundle → ~588 kB now; benign, externalise later.)
- **Audio = side-effect of state** (architecture): `audio.ts` subscribes to the story store at module load and plays SFX on inventory-grew / scene-changed; the drone starts on the first `pointerdown` (browser autoplay policy).
- **New Game** = `store.reset(gameDoc)`: the host re-mounts when currentScene changes; within the same scene the visibility subscription refreshes (pickables reappear) and the inventory clears. Minor: resetting while already on the start scene doesn't re-spawn the cube — a re-mount-on-reset is the clean fix.
- **Verified:** typecheck + lint + build green; dev server transforms the new modules. Sound + menu are runtime — test in `pnpm dev` (click once to start the ambient).
**Follow-ups:**
- M1 done bar **optional stealth** ("only if core"). Footstep SFX deferred (per-frame, not state-driven). Audio data URIs → real files; re-mount-on-reset for a clean New Game.
- Next milestone: **M2 — the visual editor** (the bigger goal), or stealth if wanted.

### 2026-06-13 — M1: inventory complete (combine + use-on-object)
**What:** Finished the inventory verbs. `selectedItem` + `select`/`combine` actions in the store; an interactive inventory bar (click a slot to select, click another to combine via a recipe). Use-item-on-object: a selected item clicked on a world interactable runs its `uses` rule. Schema += `Recipe`/`recipes`, `UseRule`/`uses`. Pickables now gate on a derived `picked:<id>` flag (set on pickup), so a consumed item never reappears. Room demo: pick up gear + handle → combine → crank → use crank on the wall panel → gem.
**Why:** Complete "Inventory: add + combine + use-on-object" — the inventory puzzle loop.
**How:**
- **Picked-flag fixes last step's consume-reappear bug:** `effectsFor(pickable)` auto-sets `picked:<id>`; `pickInteractable` auto-gates pickables by it; the visual layer gates `not flag('picked:<id>')`. So combining (which consumes inputs) doesn't bring them back. (Node-tested: "stays gated after consume".)
- **Combine** = a store action over `gameDoc.recipes` (`findRecipe`, order-independent) → `takeItem a, takeItem b, giveItem output`. **Use-on** = engine onTap: a selected item + an interactable's matching `uses` rule → walk + run; any click consumes the selection (`select(null)`).
- **Inventory bar** is buttons now (`pointer-events: auto` on slots, container stays `none` so gaps pass clicks through); selected slot highlighted.
- **Renamed** `useEffectsFor` → `effectsForUse` — the `use*` name tripped `react-hooks/rules-of-hooks` (false positive on a non-hook function).
- **Verified:** typecheck + lint + build green; Node test of recipes + combine + picked-flag (10 checks); dev server transforms the new modules. The clicky bits are visual — test in `pnpm dev`.
**Follow-ups:** M1 remaining — simple **menu** + **audio** (Howler), then optional stealth. The real dialog runtime is M4 (`startDialog` is still an inert marker).

### 2026-06-13 — M1: pickup + inventory bar + condition-gated door
**What:** Inventory, first half. Pickables are picked up via the existing click → effect path; a picked item vanishes from the scene and shows in an inventory bar. Added `LayerData.when?` (conditional layers) + a store subscription in `mountScene` that toggles layer visibility as state changes. New `ui/Inventory.tsx` (DOM bar reading `store.inventory`) + styles. Street: a gold `key` pickable (visual + hitArea, both gated `not hasItem(key)`); the room door now gated `hasItem(key)`. Added the `key` item to `gameDoc`.
**Why:** Deliver the pickup → inventory → condition-gated-transition loop — the spine of inventory puzzles — on the M0 condition/effect foundation.
**How:**
- **Pick up once, then vanish, no extra state:** the pickable AND its visual layer are both gated `not hasItem(item)`. Pick up → you hold it → both disappear (the layer via the visibility subscription; the pickable via `pickInteractable`'s `when`). The door's `when: hasItem(key)` is re-checked per click, so it "unlocks" the moment you hold the key. Caveat: if an item is later *consumed*, a `not hasItem` pickable reappears — a per-pickable picked-flag is the robust fix once use/combine can consume items.
- **Conditional layers are general:** any layer with `when` is shown/hidden reactively (scene subscribes to the store, unsubscribes on destroy) — useful beyond pickups (open/closed doors, state props).
- **Inventory UI is display-only** for now (names/placeholders), `pointer-events: none` so it doesn't block world clicks; selection comes with combine/use-on.
- **Verified:** typecheck + lint + build green; dev server transforms the new modules; the gating logic (hasItem / not / giveItem) is Node-tested (M0). Pickup + render is visual — test in `pnpm dev`.
**Follow-ups (M1 inventory, part 2):**
- **Combine** (data-driven recipes) + **use item on object** (select in inventory → click world object): needs `selectedItem` in the store, `recipes` in `GameDoc`, `uses` rules on interactables, and an interactive inventory bar.

### 2026-06-13 — M1: interactables + scene transitions + persistence
**What:** First M1 chunk. Click an interactable → the character walks to it, then its `Effect`s run; an `exit`'s `goTo` swaps scenes. Added `systems/interactions.ts` (`effectsFor`, `pickInteractable`), `Character.setTarget(x, y, onArrive?)`, a store-aware `mountScene(app, scene, store)` + self-driving `createSceneHost(app, scenes, store)` (subscribes to `currentScene`, swaps deferred). New 2nd scene `scenes/room.ts` + a lit door on the street, connected by `exit` interactables. Overlay shows scene name + visited count. Moved `StoryStore` into `conditions.ts` to break an engine↔store cycle.
**Why:** Three original-backlog items at once — interaction (click → effect), scene transitions, persistence — all on the M0 condition/effect + store foundation.
**How:**
- **Walk-then-interact.** A click hit-tests `scene.interactables` (topmost, gated by `when`); if hit, the character walks to the clamped point and `onArrive` runs `effectsFor(it)` via the store. Off-road doors clamp to the nearest road point.
- **Deferred scene swap (key safety).** A `goTo` runs inside `character.update` (inside the ticker); the host swaps via `queueMicrotask`, so the old scene is destroyed *after* the frame, never mid-update. `onArrive` also fires after `syncView`.
- **Persistence is free** — the store is a singleton; the host only swaps scenes, never resets. Inventory/flags/visited survive transitions (visited count proves it).
- **Cycle break:** `StoryStore` now lives in `systems/conditions.ts`; the engine depends on a minimal `SceneStore` view, not `state/story`.
- **Verified:** typecheck + lint + build green; dev server transforms the new graph; goTo state logic is Node-tested (M0). The click → walk → swap is visual — test in `pnpm dev`.
**Follow-ups:**
- M1 continues: **inventory** (pickable items + combine recipes + use-on-object), then menu, audio, stealth (if core). A `key` gating the door (`when: hasItem`) is the natural inventory demo.
- Rapid double-transition isn't guarded (fine for clicks); brief blank frame during the async mount.

### 2026-06-13 — M0 (part 2): scene as data + store wired  ← M0 complete
**What:** The engine now consumes serializable `SceneData` instead of a code factory. `engine/scene.ts`: `mountScene(app, SceneData)` + a **builder registry** (`registerLayerBuilder`) so geometric `builtin` layers stay in the data, while image/SVG layers load via `Assets`. `scenes/street.ts` rebuilt as `SceneData` (painters registered by key) with the walkable as fractions. New `data/game.ts` (`gameDoc`); `data/schema.ts` refined (fractions everywhere, `builtin` params, `anchorYFrac`). Store wired: `state/story.ts` exposes a `storyStore` singleton, `ui/use-story.ts` React hook, `GameCanvas` mounts `gameDoc.scenes[currentScene]`, overlay shows the scene name from the store. Removed `scenes/index.ts`; folded `SceneConfig` into schema's `DepthConfig`.
**Why:** Make the scene fully data-driven (the editor's substrate) and prove the store flows both ways — engine reads `currentScene` to mount, React reads it for the overlay.
**How:**
- **Coordinate convention: fractions of screen (0..1)** in `SceneData` (positions, walkable, spawn, `anchorYFrac`), resolved to px at mount → resolution-independent documents.
- **Builtin builder registry** bridges geometric placeholders into the data model: a `builtin` layer is `{ builder: key, params }`; scenes register painters at module load. The escape hatch disappears as layers become `image` SVGs.
- **Vanilla store singleton** shared by engine (imperative `getState`) and React (`useStore` via `useStory`). Discrete state only.
- **Visual unchanged** — same geometry, now data-driven; overlay gains "Scene: Street".
- **Verified:** typecheck + lint + build green; dev server transforms the whole graph (`/src/main.tsx` 200). Build prints a benign >500 kB chunk advisory (Pixi).
**Follow-ups:**
- M1 next: scene transitions (exit interactables → `goTo`) + interaction (click → effect) + inventory (recipes, use-on) + menu + audio.
- Resize re-layout still deferred (scene built once from `app.screen`).

### 2026-06-13 — M0 (part 1): data schema + condition/effect + story store
**What:** Started the roadmap's M0 (data-driven foundation). Added `agent_docs/roadmap.md` (the milestone plan) and `workflow.md` step 6 ("point to the next step"). New code: `src/data/schema.ts` (serializable `GameDoc` — scenes, layers, interactables, items, flags + the `Condition`/`Effect` vocabulary), `src/systems/conditions.ts` (`StoryState` + pure `checkCondition`/`applyEffect`/`applyEffects`), `src/state/story.ts` (vanilla Zustand store wrapping them).
**Why:** The schema is the project's public API — the engine, the editor, and the future npm package all sit on it. Schema-first means M1 gameplay and the M2+ editor slot on with no refactor.
**How:**
- **Additive only** — no working code touched, so the street game still runs. `schema.ts` is a leaf (no internal imports). Note: `SceneBand` is for now defined in **both** `schema.ts` and `engine/scene.ts` — a deliberate temporary dup, deduped when the engine consumes `SceneData` (next M0 step).
- **One logic vocabulary.** `Condition` (hasItem/flag/visited/all/any/not) + `Effect` (setFlag/giveItem/takeItem/goTo/startDialog) are serializable data; the evaluator is pure + immutable. All gating (exits, interactions, dialog, NPCs, recipes) will route through it.
- **Vanilla Zustand store** (`createStoryStore(doc)`) so engine/Pixi can read/write outside React (getState/subscribe); React binds via a `useStory` hook in M1. Holds only discrete state.
- **Verified:** typecheck + lint + build green; Node test of `conditions.ts` — 15 checks (conditions + effects + immutability) all pass. Store covered by typecheck (Node can't resolve the extensionless internal imports the bundler handles, so it's not in the Node test).
**Follow-ups (rest of M0):**
- Port the street scene to `SceneData` + a builder registry for `builtin` (geometric) layers; make `mountScene` consume `SceneData`; dedupe `SceneBand`.
- Add a React `useStory` hook and provide the store to the app.

### 2026-06-13 — Walkable area, layered scenes + swap, street polish
**What:** Three things on the street. (1) **Walkable area** — new `src/systems/walkable.ts` (`WalkArea` polygon, `containsPoint`, `clampToArea`); `Character` takes an optional area and clamps both the click target and every step, so the cube only travels on the road. (2) **Scene system v2** — `engine/scene.ts` mounts a `SceneDefinition` of stacked `SceneLayer[]` (band + display + optional anchorY); added `createSceneHost(app)` (swap scenes), `imageLayer(url, band)` (load an SVG/image as a Sprite layer — the art path), async `mountScene`/`SceneFactory`; new `scenes/index.ts` registry. `street.ts` rebuilt as layers (sky / land / buildings / road + lamppost/bush). `GameCanvas` mounts via the host. (3) **Polish** — horizon raised to the top third; sky is now clear night-blue bands (was a near-black "void").
**Why:** Requested: keep the player on the road, fix the dead black sky band, and prepare easy scene swap/creation toward SVG-composed scenes (parts layering).
**How:**
- **Walkable = polygon clamp.** The road is a concave ⊥ (horizontal street + receding branch). `clampToArea` returns the point if inside, else the nearest boundary point — off-road clicks walk to the road edge, and per-frame clamping slides the cube along edges around the corner. No A* yet (proper nav for the concave corner) — flagged. Verified the geometry in Node: inside/outside checks pass, house-click → road edge, sky-click → branch top.
- **Layers model "parts stacking."** Each background part (sky, land, buildings, road) is its own Graphics layer drawn in array order; mid layers Y-sort + depth-scale by `anchorY`; foreground always on top. Maps 1:1 to future SVGs — `imageLayer()` loads a URL into a Sprite layer; `SceneFactory` is async so a scene can `await Assets.load(...)`. Swapping is `host.show(scenes.x)`.
- **Sky/horizon.** `HORIZON_FRAC` 0.46 → 0.33; sky split into 3 clearly-blue bands. Kept flat fills (not `FillGradient`): still can't see the canvas from here, and a flat fill can't fail as a runtime error.
- **Verified:** format + typecheck + lint + build green; Node test of the walkable polygon; dev server transforms the new modules (200). The render is eyeballed in `pnpm dev`.
**Follow-ups:**
- **Resize** still unhandled — the scene (layout, walkable polygon, depth, hitArea) is built once from `app.screen`. One resize pass should rebuild it all.
- **Walkable nav** is clamp-and-slide; a walk-mesh + A* would give clean paths around the L corner (architecture's intended approach).
- **SVG art:** `imageLayer` is ready — wire real SVGs when the pipeline produces them; consider a manifest/bundle preload.

### 2026-06-13 — Data-driven scenes + geometric street scene
**What:** Generalised the engine into a scene-manifest mounter and added the first real scene. `engine/scene.ts`: `createScene` → `mountScene(app, SceneFactory)` consuming a `SceneDefinition` (depth, start, `paintBackground`, mid/foreground props); mid props are Y-sorted + depth-scaled by their `anchorY`. New `src/scenes/street.ts`: a geometric city street (sky + hills, a house row with a central gap, a lower-third road branching into an L that recedes to the horizon, mid-layer lampposts, foreground bushes). `data/scene-config.ts`: dropped `demoScene` (scenes own their depth values now). `GameCanvas` mounts `streetScene`; overlay hint updated.
**Why:** The "design a simple street scene" task — and the natural moment to realise the proposed data-driven scene manifest (populates the empty `src/scenes/`). The street exercises all three systems at once: layering, dynamic occlusion, depth scaling.
**How:**
- **Scene = factory `(screen) → SceneDefinition`.** Engine owns the generic "how" (3 layers, input, ticker, teardown, prop sort/scale); each scene owns the "what" (a background painter + a prop list). Adding a scene/prop is data, not engine edits.
- **Two occlusion kinds on show:** the cube hides behind **foreground bushes** (top layer) and Y-sorts in front of / behind the **lampposts** (mid layer, `zIndex = anchorY`). Mid props are also depth-scaled by `anchorY`, so they sit in the character's perspective.
- **Depth test = the L branch.** Walking up the receding side road (feet Y → `yFar` 0.5H) shrinks the cube to `scaleFar` 0.4; the horizontal road is the near (large) end.
- **All geometric, flat Röki palette.** Sky is flat bands, **not** `FillGradient` — deliberately: a gradient-API slip would be a runtime error invisible to typecheck/build, and the canvas can't be seen from here.
- **Verified:** format + typecheck + lint + build green; dev server transforms the new modules (HTTP 200). Visual correctness eyeballed in `pnpm dev`.
**Follow-ups:**
- Everything is laid out from `app.screen` at build time — **no resize re-layout** yet (backdrop, props, depth, hitArea). One resize pass should rebuild/rescale the scene together.
- Still free movement — **walkable-area clamping** (keep the cube on the road/L) is the obvious next step now that there's a road to stay on.
- Props are built inline in `street.ts`; if scenes multiply, consider a small shape/prop schema or shared prop helpers.

### 2026-06-13 — Scene layering + dynamic occlusion + depth scaling (2.5D)
**What:** Turned the flat stage into a 3-layer 2.5D scene. Added `src/systems/depth.ts` (`DepthScale` + `depthScaleAt`) and `src/data/scene-config.ts` (per-scene depth fractions + `resolveDepthScale`). Reworked `engine/scene.ts` into background / interactive-mid / foreground layers with a placeholder backdrop, a Y-sortable crate, and a foreground pillar occluder. `entities/character.ts` now scales + Y-sorts by feet Y. Overlay hint updated. Also added **workflow step 5 "propose a commit message"** to `workflow.md` + `conventions.md` (Done means) + `AGENTS.md` (the loop summary).
**Why:** Deliver the layering + dynamic-occlusion beat (the cube passes behind the foreground and hides) plus the depth illusion that makes it read — all keyed off the feet point step 2 set up.
**How:**
- **Layers** ordered by `zIndex` on a `sortableChildren` stage: background (0) < interactive (10) < foreground (20). Two occlusion kinds: the **foreground pillar** always draws over the character (top layer ⇒ "hides behind it"); the **mid crate** is Y-sorted — its `zIndex = feetY`, the same rule as the character, so the cube draws in front when nearer (larger feetY) and behind when further.
- **Depth scale + Y-sort both come from feet Y** in `Character.syncView`: `container.scale = depthScaleAt(feetY)` and `container.zIndex = feetY`. These are positioning (engine's job), not touching the view's pixels — the view/logic invariant holds. `DepthScale` is injected via the constructor from `resolveDepthScale(demoScene, screenH)`; perspective is **scene data** (fractions of screen height), not hardcoded.
- **Props are inline geometric placeholders** (Röki silhouette) — real scenes/props become a data-driven manifest later; only the depth config is data so far.
- **Verified:** format + typecheck + lint + build green. Occlusion / sorting / scaling are visual — eyeball in `pnpm dev`.
**Follow-ups:**
- Backdrop, prop positions, depth config and `hitArea` are all computed at build from `app.screen` — none re-sync on **resize** yet (one resize pass should refresh them together).
- Walkable-area clamping still deferred: the cube can walk above the horizon (clamped to min scale) and onto props' footprints.
- Next candidates: walk-mesh/walkable polygon, a real scene manifest (data-driven props + multiple scenes), or wiring Zustand (scene/inventory) + Howler.

### 2026-06-13 — Click-to-move + 8-direction facing (cube placeholder)
**What:** First gameplay system. Added `src/systems/movement.ts` (`Facing`/`MoveState` types, `facingFromVector`, `WALK_SPEED`), `src/entities/character-view.ts` (swappable `CharacterView` interface + `createCubeView` placeholder), `src/entities/character.ts` (`Character` entity), `src/engine/scene.ts` (`createScene`: interactive layer + click-to-move + ticker hook). Removed the static placeholder from `engine/app.ts`; `ui/GameCanvas.tsx` now builds/tears down the scene; overlay hint updated.
**Why:** Establish the core `input → logical state → view` loop (the architecture's first spike) and lay the feet-position groundwork that step 1 (layering + occlusion + depth scale/Y-sort) builds on.
**How:**
- **View ≠ logic kept clean.** `Character` holds only mutable per-frame state (x/y/target/facing/state as plain fields, **not** Zustand) + a `CharacterView`. It positions the view container and calls `setPose(state, facing)` — never touches pixels. Swapping the cube for an `AnimatedSprite` is a change in `character-view.ts` alone.
- **Feet-anchored.** View origin = feet (cube drawn y=-H..0); the click target is a feet target — the single point depth scale + Y-sort will read next. Interactive layer already has `sortableChildren = true` so step 1 only adds containers + drives zIndex.
- **Movement.** Lerp toward target in the ticker (`deltaMS`, px/sec speed), snap + idle on arrival. `facingFromVector` buckets the move vector into 8 via `round(atan2 / 45°)`. Facing is a view concern: the cube shows it with a rotating "nose" marker (tinted idle vs walk), no per-direction art needed.
- **Input (v8 events).** Stage `eventMode='static'` + `hitArea = app.screen` (stage bounds only cover children, so a screen-sized hitArea makes empty space clickable) + `pointertap`; click converted to layer-local via `toLocal` so it survives a future camera/transform.
- **Teardown.** `scene.destroy()` drops the ticker callback + listeners + containers before `app.destroy()` — no leaked tickers across StrictMode remounts / future scene swaps.
- **Verified:** typecheck + lint + build green. Interactive behaviour (click → walk, 8-way marker) is visual — eyeball via `pnpm dev`.
**Follow-ups:**
- **Next (step 1):** 3-layer scene (background / mid / foreground occluder) + dynamic occlusion + depth scale & Y-sort from feet Y.
- Click target not yet clamped to a walkable area (walk-mesh/polygon deferred per architecture).
- `hitArea = app.screen` isn't re-synced on resize — revisit with the resize/camera pass.

### 2026-06-13 — Stripped game-specific branding → generic template
**What:** Removed the placeholder game title "Finn McCool and the Templar's Treasure" and the character names "Finn, Amara" from all source + docs. Display title is now "Point & Click Adventure" (`index.html`, `src/ui/App.tsx`); `package.json` name → `point-and-click-pixin`; `AGENTS.md`, `project_brief.md`, `asset_pipeline.md` reworded to describe a generic template with no fixed story/characters.
**Why:** User wants this repo to be a reusable, generic point-and-click template, not tied to one game's IP.
**How:** Grepped `finn|mccool|amara|templar|treasure` to find all occurrences (6), replaced each with a generic equivalent. Kept genre / mechanics / visual direction / architecture and external references (Röki, Broken Sword, Polda, the art tools) — those define the template, not the IP. Also fixed a stale contradiction while in the file: `AGENTS.md` called the game "side-scrolling", which the rest of the docs explicitly deny (it's 2.5D depth) — dropped the word. Verified: re-grep returns zero brand references; typecheck + lint + build still green.
**Follow-ups:** None new — systems follow-ups unchanged from the scaffold entry below.

### 2026-06-13 — Dev environment scaffolded (Pixi v8 + React, Vite + pnpm)
**What:** Took the repo from docs-only to a runnable app. Added toolchain config (`package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`), the `src/` layout from AGENTS.md (`engine/ scenes/ entities/ state/ ui/ systems/ audio/ data/` + `public/assets/`, empty ones `.gitkeep`'d), and a minimal boot — `main.tsx` → `ui/App.tsx` → `ui/GameCanvas.tsx` + `engine/app.ts` — that renders a placeholder Pixi cube under a React overlay. Installed pixi.js, react, react-dom, zustand, howler + dev tooling.
**Why:** First build task — establish a verified dev loop before any game systems.
**How:**
- **Toolchain = Vite + pnpm + ESLint/Prettier + TS.** This **reverses the earlier "not Vite"** note, decided with the user after comparing Vite vs Rsbuild/Parcel/esbuild/webpack. Vite wins for this stack: first-class PixiJS path (create-pixi's main template, official examples), best React+TS DX; its one real risk — the **top-level-await prod-build gotcha** — is a one-liner (`build.target: 'esnext'`). Fresh majors installed: Vite 8 (Rolldown-based), TS 6, ESLint 10, React 19.2, Pixi 8.19.
- **Vite 8 uses Rolldown**, so the old `optimizeDeps.esbuildOptions` TLA workaround is deprecated/unneeded — only the prod `build.target: 'esnext'` is required (kept it minimal).
- **Pixi↔React wiring honours the core invariant:** world lives in the Pixi scene graph (`GameCanvas` mounts `app.canvas`), chrome is a DOM overlay (`pointer-events: none`). Async init/cleanup is StrictMode-safe and tears down with `releaseGlobalResources: true` (per the `pixijs-application` skill) to avoid stale-texture flicker on re-init.
- **Strict types enforced:** `tsconfig` `strict` + `noUnused*` + `verbatimModuleSyntax`; ESLint `@typescript-eslint/no-explicit-any: error` for the no-`any` invariant.
- **Verified green:** `pnpm typecheck`, `pnpm lint`, `pnpm build` (722 modules, no TLA error), `pnpm format:check`; dev server boots and serves `/` + transforms `/src/main.tsx` (HTTP 200).
**Follow-ups:**
- Zustand + Howler are installed but not yet wired — add on first real use (discrete-state store; audio as a state side-effect).
- Placeholder cube doesn't re-center on resize (fine for the smoke test). Next: the scene/layer system — background/mid/foreground containers, Y-sort + depth-scale from feet position.
- `pixi-filters` to add when atmosphere work (fog/glow/chiaroscuro) starts.

### 2026-06-13 — Project docs initialized
**What:** Added `AGENTS.md` + `agent_docs/` (project_brief, architecture, asset_pipeline, conventions, workflow, dev_log, building_and_dev).
**Why:** Establish project context + a documented workflow for Claude Code before the jam build.
**How:** Mirrored a lean-`AGENTS.md` + progressive-disclosure pattern; distilled the pre-jam tech spec into the topic docs. Invariants and the analyze→architect→execute→log loop are the spine.
**Follow-ups:** Scaffold the project (Pixi v8 + React + Zustand + Howler; build tooling TBD — not Vite).
