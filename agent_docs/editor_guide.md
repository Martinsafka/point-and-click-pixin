# Editor Guide

How to use the visual, no-code editor — what every panel does and the
edit → test → publish loop. This is the authoring surface that will become the
OSS product, so **keep it in sync**: whenever an editor feature is added or
changed, update this guide in the same task (see `workflow.md`).

> Audience: someone building a game with the editor. For how the editor is wired
> internally, see `architecture.md` + the `src/editor/` source.

## Opening the editor

- Run the dev server (`pnpm dev`) and open the app with **`?edit`** in the URL
  (e.g. `http://localhost:5173/?edit`).
- **Dev only.** The editor is excluded from production; the shipped game ignores
  `?edit` and just plays the document.
- The app without `?edit` is the **game** — that's where you playtest.

## What you're editing

The editor edits one **document** (`GameDoc`): scenes, layers, walkable areas,
interactables, items, recipes. On load it picks the document in this order:

1. **Editor draft** — what you last saved with **▶ Test in game** (localStorage).
2. **`content/game.json`** — the committed game, if present.
3. **Built-in demo** — the street + room scenes in code.

So your edits live in a draft until you publish them (Export → `content/game.json`).

## Core ideas

- **Everything is a fraction of the scene (0–1).** Positions, polygons, sizes — all
  resolution-independent. The engine resolves them against the scene's design space
  (its **width** × the **reference height**) and fits that to the player's screen.
- **Bands** stack the visuals: **background < mid < foreground** (paint order).
  The **mid** band is depth-sorted by feet position, and the character lives
  there — so foreground layers can pass in front of it.
- **Interactables are invisible** — they're hit-areas (polygons) the player
  clicks. The editor shows them as coloured overlays; the game doesn't.

## Layout

The editor is **one Pixi world**: the **real game runs fullscreen** and you author over it
through **floating windows** opened from a **launcher bar** (top-left). There's no separate
side panel — the launcher is the whole UI. A top-right toolbar has **⏸ Freeze** (stop the
world — NPCs stop moving — so wandering NPCs don't get in the way; edits still apply),
**▶ Test in game** (play the draft for real), and **Discard**. Edits show immediately.

The world runs **view-only** — clicks don't drive gameplay, sound is muted, and gameplay
reactions (enter **triggers**, scene-entry **cutscenes**, stealth vision) don't fire — so you
see the **base** world and author over it rather than playing it. NPCs still walk their
**routines**, full lighting + weather render, and you can **drag image layers** to place them.
Use the **World** window to set flags / give items / jump scenes (that's how you reveal gated
content here). Lighting / weather + character size **update live** as you edit (no reload).

**The launcher (top-left).** Each entry opens a **floating, draggable window**; sections
mirror what used to be the tabs, one-to-one:

- **Scene** — Scenes, Walkable, Depth, Holes, Layers, Interactables, NPCs.
- **Items** — Items, Recipes.
- **Characters** — the player's animation set + the global **NPC cast**.
- **Dialogs**, **Cutscenes**, **Sounds**, **Atmosphere** (weather presets), **Project**
  (Display, Cursors, Audio, Lighting, Transition, Document export / import).
- **World** — drive the running world's state (flags / items / scene); see below.

Drag a window by its title bar, ✕ to close, keep **several open at once** (click one to bring
it to the front). The **Scene** window's drawing tools (Walkable / Holes / Hit-areas / NPC /
light placement) place points directly on the world; the overlays stay aligned because they
ride the scene's on-screen rect (so the letterbox around a non-matching-aspect window is
fine).

**World window.** A `World` launcher entry opens controls that drive the **running** world to
a state you want to author against: **jump scene**, **set / clear flags** (it lists the flags
used anywhere in the doc, plus an input to add a new one), **give / take items**, and **Reset
world**. Use it to reveal gated content while authoring: e.g. to see a light that's gated on
`hasItem flashlight`, **Give** the flashlight and it appears.

---

## Panels

### Scenes

The scenes in the game. Click one to select it (everything below acts on the
selected scene, and the preview shows it).

- **+ Scene** — adds a blank scene (a default floor walkable + a spawn point).
- **Delete** — removes the selected scene (always keeps at least one).
- **width** — the scene's width in **design px** (its height is the project's
  reference height — see **Project → Display**, default 1080). A scene wider than the
  screen's aspect makes the game's **camera** scroll horizontally to follow the
  character; the readout shows the aspect (e.g. `2.20:1`) and whether it scrolls.
- **characters** — a per-scene **size multiplier** (%) for the player and NPCs, for
  scenes drawn from a closer or different angle. It rides on top of the perspective
  (Walkable depth), not instead of it; the preview **rescales live as you drag** (no
  reload).

### Walkable · _N_ pts

The polygon the character may walk in. Clicks in the game move the character to
the nearest point inside it.

- **Draw** — toggle on, then click in the preview to drop polygon points in order
  (shown as a gold outline + dots). Toggle off (**Done**) when finished.
- **Clear** — empties the polygon (redraw from scratch; there's no vertex drag
  yet).

### Depth

How the character (and NPCs) **scale by depth** — bigger near the camera (low on
screen), smaller toward the back. It's a **curve** of stops: each stop sets the
`scale` at a feet **y** (0 = top, 1 = bottom). The little graph plots it live; the
in-game size is this × the scene's **characters** % × the screen fit.

- **+ stop** adds a point; **✕** removes one (min 2). Edit each stop's **y** and
  **scale**.
- Two stops = a straight near→far ramp (the classic look). Add stops for a
  non-linear curve (e.g. a compressed back third) — the size changes **smoothly**,
  with no popping. The spawn character in the preview updates on the next re-mount /
  Test in game.

### Holes · _N_

Obstacles cut out of the walkable area — the character routes **around** them
(nav-mesh pathfinding).

- **+ Hole** — adds a hole and starts drawing it; click in the preview to add its
  points. Select a hole in the list to edit it (**Draw** / **Clear**), or **✕** to
  delete.
- Holes are invisible in the game (navigation only); they show as **dashed red** in
  the editor.

### Layers · _N_

The scene's stacked visuals — uploaded images **and** the demo's built-in code
painters, listed in paint order.

- **+ Image** — upload an SVG or PNG. It's added as a full-screen background
  backdrop and stored **inside the document** (a data-URL), so it survives Export.
- **+ Animated** (M12.5) — upload an **atlas** (a grid of equal frames) → a looping
  animated layer (animated background / prop). Set its **frame grid** (w / h / cols /
  frames / fps) on the layer row. Placed / `when`-gated / draggable like an image — so a
  flag can swap a static **or** animated asset (two layers gated by opposite flags).

Each layer row:

| Control    | What it does                                                                 |
| ---------- | ---------------------------------------------------------------------------- |
| **band**   | background / mid / foreground (paint order; mid is depth-sorted).            |
| **fit**    | _(images)_ how it sizes to the screen — see the table below.                 |
| **role**   | scenery / occluder / floor — metadata for now (drives future occlusion).     |
| **parallax** | _(background / foreground)_ scroll rate: 1 = with the world, <1 = farther / slower, 0 = locked, >1 = nearer. |
| **↑ / ↓**  | reorder within the band (paint order).                                       |
| **✕**      | delete the layer.                                                            |

**Fit modes:**

| Fit       | Result                                                                          | Drag       |
| --------- | ------------------------------------------------------------------------------ | ---------- |
| `none`    | Natural size, centred on its position.                                         | free (X+Y) |
| `width`   | Full viewport width, keeps aspect — a horizontal **strip** (sky / land / road).| Y only     |
| `cover`   | Fills the screen, keeps aspect (crops the overflow).                           | locked     |
| `contain` | Fits entirely inside the screen (letterboxed).                                 | locked     |
| `stretch` | Fills the screen, ignoring aspect (distorts).                                  | locked     |

**Positioning by drag:** in the preview, drag a **`none`** image anywhere, or a
**`width`** strip up/down. The cursor hints which (move / ↕). Drag resumes from
where the layer currently sits.

**Parallax:** in a scrolling scene, give background / foreground layers a scroll rate
below 1 to sit "farther" — a distant skyline barely moves while the near ground tracks
the character. It only shows in the **game** (the editor preview is at rest), and a
slow layer should be **wider than the scene** so its edge doesn't appear as you scroll.
The **mid** band (the gameplay plane) is always 1.

### Interactables · _N_

The clickable objects — plus invisible **trigger** volumes. Shown in the preview as
coloured hit-areas, labelled by id: **green = pickable**, **amber = interact (use)**,
**blue = exit**, **teal = look (inspect)**, **violet = trigger**; the selected one is
highlighted.

- **+ Pick / + Use / + Exit / + Look** — add a clickable object (centred default
  hit-area + unique id). Pickable defaults to the first item, exit to another scene;
  **Look** (inspect) makes the protagonist comment.
- **+ Trigger** — an **enter-driven** volume: it runs its **effects** when a character's
  feet enter the area (no click). Set **by** (player / npc / any) and **once**. Great for
  sounds, animations, cutscenes and — with NPCs — chaining events.
- Click a row to **select**; **✕** deletes it.

The **selected object's form**:

| Field         | For            | Meaning                                                              |
| ------------- | -------------- | ------------------------------------------------------------------- |
| **id**        | all            | Unique id (used by gating, e.g. the `picked:<id>` flag). Keep unique.|
| **item**      | pickable       | Which inventory item it gives when picked up.                        |
| **to**        | exit           | The scene it leads to.                                               |
| **text**      | inspect        | What the protagonist says when clicked.                             |
| **audio**     | inspect        | Optional uploaded voice clip played with the text.                  |
| **look**      | pick / use / exit | "Look at" text shown on a plain click (no item selected).        |
| **by / once** | trigger        | Who fires it (player / npc / any) + whether it fires once a visit.   |
| **when**      | all            | A Condition that gates it ("(always)" = no gate). See Conditions.   |
| **effects**   | pick / use / exit / trigger | Effects run — on click, or on **enter** for a trigger.|
| **uses**      | interact, exit | "Use item on object" rules: an item + the effects of using it.      |
| **Hit-area**  | all            | **Draw** (click the preview to add points) / **Clear**.             |

Clicking an object that has **look** text (with no item selected), or clicking an
inventory item, shows that text as a transient narration line in the game.

> For a **pickable**, giving the item and hiding it (the `picked:` flag) are
> automatic — its **effects** are *extra* things on top. For an **exit**, the
> `goTo` is automatic; effects run after it.

### NPCs · _N_

**Place** cast characters into this scene (the cast is defined in **Characters → NPCs**).
Shown in the preview as **orange markers** at their spawns. A character can be placed in
**several scenes** — its runtime location picks the active one and a `moveNpc` effect
moves it between them — so the pickers only block placing the **same NPC twice in this
scene**. When an NPC is placed in more than one scene, set its **home** (the scene it
starts in) in the NPC modal (**Characters → NPCs → Edit**); the default is its first
placement.

- **+ Place NPC** — adds a placement (the first un-placed cast NPC); **✕** removes it.
  Click a row to **select**.
- For the selected placement: pick **which npc** (from the cast), its **when** gate
  (present only while the Condition holds), and **Place** it — click the preview for its
  spawn.
- **Paths** — a placement holds **several named paths**. **+ Path** adds one (an editable
  **name**; a fixed **id** the routine references — hover the name to see it). Per path:
  pick the **mode** (`once` stop / `loop` / `pingpong`), toggle **Draw** and click the
  preview to drop waypoints (dashed line + dots; the count shows on the button), **Clear**
  the points, or **✕** remove it. The NPC walks a path via the nav-mesh (rounding holes).
  Without a routine the NPC walks its first/conditional path; **with a routine, each routine
  node picks one of these paths by name** (see Routine). A `trigger` with **by = npc / any**
  fires when the NPC walks into it (chaining) — a `playAnim` on a walking character
  **pauses it, plays, then resumes**, so an NPC stops to gesture and walks on.
- NPCs render as real characters (or the placeholder), Y-sorted + depth-scaled like the
  player; appearance / dialogue / voice / vision / routine are in the NPC modal.

### Spawn points · _N_

Fixed-shape markers (M12.5 #7) that say **where a character starts** in this scene, overriding
the default spawn. **+ Spawn point** adds one (a ◎ dot); select it, hit **Place** and click the
preview to position it, and set **who** spawns there — the **player**, a specific **NPC**, or
**all**. A point assigned to a specific character wins over an **all** point. (Only affects the
*initial* position when the scene is entered.)

### Audio

The scene's looping **ambient** bed (M9). Pick a sound from the **library** (Sounds tab —
upload there first) + set its **vol**; an optional **when** gates it — while the Condition
fails (or no ambient is set), the **document default** ambient plays (Project tab → Audio).
Ambient swaps seamlessly when you move between scenes. _(SFX on interactions are the
`playSound` effect; footsteps + the default ambient are global, Project tab.)_

### Weather

This scene's weather (M10) — a **conditional list** of presets (defined in the **Atmosphere
tab**). The **first** entry whose **when** passes plays (so a story flag triggers / swaps
weather); reactive. **+ Weather** adds an entry (pick a **preset** + an optional `when`);
**✕** removes it. The weather (particles + its ambient sound) shows in-game — test with
**▶ Test in game**.

### Lighting

This scene's lighting (M10 10b) — a stylised darken + lights composited over the scene
(shows in-game, not the static preview; light markers + dark-area outlines draw in the
preview). Three parts:

- **Ambient** — tick **override ambient** to set this scene's **colour** + **intensity**
  (1 = daylight · 0 = black — a flashlight scene); otherwise the project default (Project
  tab) applies. Lights reveal the scene under the darken.
- **Lights** — **+ Light** places one (then **Place** → click the preview for its spot, a
  ☀ marker). Per light: **colour**, **shape** (sphere / cone), and sliders for **radius,
  intensity, flicker** (candle / neon), **rotation, width, height** (deform to an
  ellipse / rotated / a directional cone), **cone°** (cone), and a **when** gate (a switch
  flag). A light glows even over black; with a `when`, a light switch turns it on.
- **Dark areas** — **+ Dark area**, then **Draw** → click the preview to outline a polygon
  pushed toward black, with a **feather** slider for the soft edge. Visual only (hotspots
  still work — gate them with `when` if you want them dark-locked).

### Emitters · _N_

Localized **point particle** sources placed at a scene spot (vs full-screen Weather):
chimney smoke, a fire's embers, a dripping pipe. **+ Emitter** adds one (⛲ marker), **Place**
→ click the preview to position it, then tune: **colour / shape** (round / streak) **/ blend**
(normal / add-glow), and sliders for **rate** (particles/sec), **life** (seconds, fades over
it), **alpha**, **size** + **grow** (px/sec — smoke billows), **angle** (−90 = up, 90 = down)
+ **spread**, **speed** + **gravity** (negative rises like smoke), and **spawn r**(adius). A
`when` gates it. It's world-space (stays at the spot, scrolls with the scene) and renders
**live** as you tune.

### Fog

Animated **fog / clouds** for the scene (a scrolling soft-noise fake, not volumetrics). Tick
**fog enabled**, then set **colour** and the sliders: **parallax X ↔ / Y ↕** (the drift
velocity — fog can flow any direction; either sign; the front layer auto-leads for depth),
**seed** (reshapes the cloud pattern), **noise W / H** (the cloud-texture aspect), **scale %**
(zoom the whole noise at that W/H ratio; 100 = unchanged). Two layers (**back ◢** + **front
◤**), each with its own **opacity**:

- **front** is always a world overlay at **front depth** (over the scene; covers characters).
- **back** uses **back depth** (a z-order vs the bands: background 0 · characters 10 ·
  foreground 20) — **or** pick **back behind** = a scene layer to slot it _behind that layer_
  (e.g. behind the buildings, over the sky). Since "behind the buildings" is geometrically
  deeper than the characters, the back layer won't cover them — that's what the **front** haze
  is for.

Renders **live** as you tune.

### Grade & FX

The scene's mood pass (M10 10d) — three toggles, all live:

- **colour grade** — a tone filter over the scene art: **brightness / contrast / saturation**
  (1 = unchanged) and **hue°**.
- **vignette** — a soft darkened frame: **colour**, **intensity**, **size** (how far in the
  dark reaches).
- **lightning + thunder** — a screen flash on a random interval: flash **colour** +
  **intensity**, **gap min/max s** (the random wait between flashes), a **thunder** sound (from
  the Sounds library; plays a beat after the flash — silent in the editor preview), and an
  **only when** Condition (e.g. a storm flag — set it from the **World** window to test).

### Items · _N_ and Recipes · _N_ (global)

These two sections are **document-level** — they apply to the whole game, not the
selected scene.

**Items** — the inventory catalogue.

- **+ Item** — adds an item (a fixed auto id + an editable name).
- Edit the **name** and **examine** ("look at" text), and **+ Icon** to upload an
  inventory icon (SVG/PNG, stored in the document). **✕** deletes. The **id** is
  fixed at creation because interactables, uses, effects and recipes reference it —
  the name is just the label shown in the pickers.
- **Examine when** (M12.5) — conditional "look at" variants: each is a `when` + a text; the
  first whose condition passes is shown instead of the base examine, so a flag changes what the
  player learns on inspect.
- **On click** (M12.5) — make the item **actionable**: each entry is a `when` + a **dialog**
  (from the Dialogs library) and/or **effects**. Clicking the item in the inventory runs the
  first matching one (starts the dialog, runs the effects) instead of selecting it for combine —
  so an item can start a conversation, set a flag, or reveal something. Items with no "On click"
  keep the plain select-to-combine / use-on-object behaviour.

**Recipes** — combine rules: `a + b → output`, order-independent. Selecting two
matching items in the inventory consumes both and yields the output.

- **+ Recipe** — adds a row; pick **a**, **b**, and **output** from the items.
- **✕** deletes the rule.

### Characters (global)

The protagonist's appearance + animation. With none set, the game uses the built-in
placeholder figure.

- **Create from placeholder** — start a character from the placeholder's atlas +
  clips, ready to customise; **Remove** reverts to the placeholder.
- **Change atlas** — upload a sprite-sheet (PNG); it's stored in the document. The
  preview overlays the frame **index numbers**.
- **frame / cols** — the frame size (W × H) and how many columns the sheet has.
- **anchor** — the sprite origin (0..1); feet at the bottom = `1` for anchor-Y.
- **Clips** — name each animation + list its frame indices (+ fps, loop):
  - **`idle.S` / `walk.E` …** — keyed `state.facing`; the 5 base directions
    (S / SE / E / NE / N) suffice — the W-side mirrors automatically.
  - **`pickup` / `interact`** — one-shots played on a pickup / use (loop off).
  - **sound** — a library sound auto-played when the clip runs as a **one-shot** (e.g.
    `interact`), so a gesture's SFX needs no separate `playSound` effect.
  - Names + frame lists commit when the field loses focus.

**Appearance variants (M12.5 #3):** under the player (and in the NPC modal) — add **+ variant**
to give a character an alternate full view gated by a **condition**. The first variant whose
condition passes replaces the base view, **swapped live** when the flag flips (e.g. the player
steps into darkness → a different atlas / clips). Each variant is a `when` + a full
`CharacterEditor` (same fields as the base).

**NPCs (cast):** the global roster of characters. **+ NPC** creates one (a fixed id, an
editable **name**, and a walk **speed** ×); place them into scenes from each scene's
**NPCs** section. **✕** removes a character and any placements of it. **Edit** opens the
NPC modal — dialogue (+ gate), inspect, voice, **footsteps** (a library sound played while
this NPC walks), vision (stealth — incl. **approach**: walk to the player on detection, then
run the effects), appearance (+ variants), **monologues** (M12.5 — timed world-space speech
bubbles; eligible lines **cycle** in order, the first shows after `after` ms and each waits its
`every` ms before the next — a flag adds / removes lines; each line can carry a **sound** from the
library, played when it appears), its **routine** (below), and (when placed in more than one scene) its **home**
start scene.

#### Routine (cross-scene schedule)

A per-NPC **state machine** (a node graph) that moves the NPC **between scenes** and along
its in-scene paths as the story + time advance — it drives **only this NPC**. In the NPC
modal, **+ Routine** creates one (a single start node at the NPC's first placement scene);
**Remove routine** deletes it.

- **Nodes** are **stations**: while a node is active the NPC is in that node's **scene**.
  Drag nodes to arrange the graph. The **start** node (▶, green outline) is where the NPC
  begins. Click a node to edit it below the canvas:
  - **scene** — where the NPC is while in this node (it shows there, hides elsewhere).
  - **path** — picks one of the NPC's **named paths in that scene** (drawn in that scene's
    NPCs panel) to walk; `— stand —` = no path. Paths are drawn on the scene canvas, never
    in this graph — the graph only *selects* and gates them.
  - **On enter** — **state** effects run on entry (setFlag / give / take / `moveNpc` …).
    _(Engine effects like `playAnim` only fire if that scene is currently on screen.)_
  - **Set start** / **Delete**.
- **Edges** are **transitions**: drag from a node's handle to another to connect. Click an
  edge to set when it's taken (all set conditions must hold):
  - **on arrival** — when the source node's path **finishes** (a `once` path reaches its
    end, i.e. the NPC got there); ignored for looping / standing nodes.
  - **after (ms)** — linger this long in the source node first (a timed beat).
  - **time** — a **time-of-day window** (from/to, HH:MM) the transition is eligible in;
    needs a **game clock** (Game logic tab → Clock). Wraps past midnight (e.g. 22:00–06:00);
    ignored when no clock is set.
  - **when** — a Condition gate (the usual editor).
  - None set → taken immediately (an auto-advance). The first eligible edge out of the
    active node wins. **Delete** removes it.
- Select a node/edge and press **Backspace/Delete** to remove it from the graph.

The NPC's location is runtime state, so a routine **resumes from a save**. **Talking to a
routine NPC pauses its schedule** — while you're mid-dialogue with it, its timers and
transitions are frozen, so it can't wander off; it resumes when the conversation ends.
(A mid-path pause + a gesture/idle animation is done with a **trigger** on the scene —
`by = npc`, a `wait { ms, anim }` or `playAnim` effect — not in this graph.) The full
time-of-day scheduler (clock-driven schedules) is a later milestone (M12); routines here
react to story state + simple per-edge timers + arrival.

#### Cutscenes (scripted sequences)

A **cutscene** is an ordered, non-interactive, **skippable** sequence — character moves /
animations, camera moves (focus + zoom), dialogue lines, waits and effects. It's started
by the **`startSequence`** effect (available in any effect list — on an interactable, a
trigger, a dialogue node, or a scene's entry), so the usual gating (`when` / `once`)
controls when it plays. While it runs the world is input-blocked and a **Skip** button
(or **Esc**) fast-forwards it (remaining effects still apply; moves / camera snap).

Author them in the **Cutscenes tab**: **+ Cutscene** adds one (a fixed id the
`startSequence` effect references); **Edit** opens the **step-list editor**. Add a step by
kind (**+ Step**), reorder with **↑/↓**, remove with **✕**. Step kinds:

- **wait** — pause `ms`.
- **move** — walk an **actor** (player / a cast NPC) to a point (x/y, design-space
  fractions 0..1); awaits arrival.
- **anim** — play a one-shot **animation** on an actor; awaits it.
- **face** — turn an actor toward a point.
- **dialog** — play a **dialogue** (from the Dialogs library); awaits its end.
- **effects** — run a batch of effects (the usual editor) instantly.
- **camera** — focus an **actor** (live-follows it) or a **point**, with a **zoom** (1 =
  normal) over **ms**; the camera returns to the player when the cutscene ends.

Then add a `startSequence` effect somewhere (its picker lists your cutscenes) to fire it.
_(Points are typed as fractions for now; picking them on the preview is a follow-up.)_

### Dialogs (global)

The **Dialogs tab** is the reusable **dialogue library** — write a tree once, then attach it to
NPCs, items, triggers or cutscenes. **+ Dialog** adds one (a fixed id); **Edit** opens its
**node editor**; **✕** deletes.

A dialog is a set of named **nodes** entered from a **start node**. Each node has:

- **speaker** — whose name shows (a character id; blank = the NPC you're talking to).
- **text** — the line, revealed with a **typewriter** in-game (the NPC's **voice** blips while it
  types — see the NPC modal → voice). Blank text + only effects/branch = a silent routing node.
- **On enter** (effects) — run when the node is entered (set a flag, give an item, start a
  cutscene…).
- **Branch (router)** — conditional openings: the first branch whose `when` passes **redirects**
  to another node before this node shows — so the conversation starts differently by story state.
- **Choices** — player replies, each a **reply text** + optional `when` (only offered while it
  passes) + **→ effects** + **→ next** node. No choices = a click-to-continue line.
- **next** — where a click-to-continue line goes (blank = the dialogue ends).

**Attach a dialog:** in the **NPC modal** (Characters → Edit) pick the NPC's default **dialog**
(+ an optional **dialogWhen** gate — when it fails, clicking the NPC falls back to its **inspect**
line); a **placement** can override it per scene (Scene → NPCs). Items can start one (Items → On
click), and any effect list can `startDialog`. In-game, clicking an NPC walks the player over,
the NPC **pauses + faces** them, and the box opens (a **Skip** button ends it).

### Display (global)

The game's vertical **reference height** in px (default 1080) — the design resolution
every scene is authored against. The player's screen height is fitted to it with one
uniform scale, so characters and art keep a consistent size on any device (phone to
4k). Each scene's **width** (Scene tab) is in these px; widening a scene past the
screen's aspect is what makes the camera scroll.

**Font** (M11) — the game's UI **font** (a web-safe stack) for dialogue, inventory, menus,
the title. Shows in **▶ Test in game** (the editor's own chrome keeps its font). _(Players
set **text size** + **volume** themselves in the in-game ☰ Menu → Settings; those are
per-device, not part of the game.)_

### Screens (global, Project tab)

Full-screen **game screens** (M11). Tick a screen to enable + author it:

- **Loading** — a boot splash shown **only on the first visit** (then cached): background
  (colour or uploaded image) + logo + a min time. (It's not the scene-transition fade.)
- **Title** — background / logo / heading (text, colour, size) / tagline, and the **New game**
  + **Continue** buttons, each a styled **text** label or an uploaded **image** (no text).
- **Game over** / **End** — a text screen (text / colour / **size** / **align**) over a
  background; game over offers **Retry** (last save) / **Title**, end goes on to credits.
- **Credits** — formatted text that **scrolls up** (size / colour / align + scroll speed).

Trigger **Game over** / **End** from a dialogue or trigger with the **gameOver** / **endGame**
effect. The very last "made with" logo is fixed (dropped in at release, not editable). Author
in **Project → Screens**; see them in **▶ Test in game**.

### Game logic (tab) — Rules + Logic graph

A dedicated top-level tab (its own launcher window) for the **game-wide logic**, with three
sections:

#### Clock

A **game clock** (M12c) — a time-of-day that advances over real time. Tick it on, then set:

- **day length (s)** — real seconds for one full in-game day (24 h). e.g. 120 → a day every two
  minutes.
- **start time** — the time-of-day a fresh game begins at (HH:MM).

With a clock on, a **routine transition** can gate on a **time window** (open the NPC's routine,
select an edge, set its **from/to time**) — so a guard patrols by day and rests at night. Scrub
the live time-of-day in the **World** window (a slider appears when a clock exists) to test it.
The current time persists in saves (`clockMinutes`). _(A general time-of-day **condition** for
rules/gates and an in-game HUD clock are follow-ups.)_

#### Rules

Game-wide **reactive rules** (M12a) — the **global event graph**. A rule is a `when → then`
that is **not attached to any object**: it's evaluated everywhere, on every change to the
story state, so it orchestrates logic across scenes / NPCs. Use it for "derived" state and
cross-cutting reactions that don't belong to one hotspot.

Each rule has:

- **when** — a `Condition` (same vocabulary as everywhere; reuses the recursive condition
  editor — `hasItem` / `flag` / `visited` / `all` / `any` / `not`).
- **then** — `Effect`s that run while `when` holds (the same effect list). Use **state**
  effects: `setFlag` / `giveItem` / `takeItem` / `goTo` / `moveNpc` / `despawnNpc` / `gameOver`
  / `endGame`. _(Engine effects — startSequence / playSound / playAnim — are inert in a rule
  for now; trigger those from an interactable / trigger / dialogue instead.)_
- **once** — fire at most once per playthrough (else it re-fires each time `when` becomes true
  again). Optional **id** is just a label.

Example: `when` = `all[ hasItem k1, hasItem k2, hasItem k3 ]`, `then` = `setFlag gate-open` +
`moveNpc guard away`. Rules resolve to a **fixpoint** (one rule's effect can satisfy another),
so a chain fires in one go. They run in the live preview too — set flags / give items from the
**World** window and watch the rules react.

#### Logic graph

A **read-only**, auto-generated map of the **flag web** (M12b) — no authoring, just an
overview. It scans the whole document and draws:

- **Flag nodes** (⚑, on the right) — every flag used anywhere.
- **Element nodes** (on the left, border-coloured by kind) — anything that touches a flag:
  rules, interactables / triggers / exits, dialogues, cutscenes, NPC vision + routine, and
  per-scene gates (a scene's `onEnter` + gated weather / lights / emitters / layers).
- **Green arrow** element → flag = it **sets** the flag (`setFlag`); **amber dashed** flag →
  element = the element is **gated on** the flag (a `flag` condition).

So you can trace "what turns this flag on, and what reacts to it" at a glance — e.g. the guard's
vision sets `spotted`, the cover trigger sets `hidden`, the guard reads `hidden`. It refreshes
live as you edit; drag nodes to untangle (positions aren't saved).

The in-game pointer changes by what it's over: **walk** (over the walkable area),
**pickable**, **interact**, **exit**, **inspect**, or **default** (anywhere else —
sky, walls, outside any area). Upload an icon per context (SVG/PNG), or leave it
for the emoji fallback (👣 / ✋ / ⚙️ / 🚪 / 👁 / ↖️). The game has **no native
cursor**; over the game UI the normal pointer returns.

### Sounds (global library)

Upload audio clips **once** here (stored as data-URLs in the document) and reference them
by name everywhere — ambient, footstep, the `playSound` effect, NPC voice, inspect audio,
pickup / transition SFX. **+ Sound** uploads; edit the **name**; **Test** plays it; **✕**
removes it. Anywhere a sound is used you pick from this list (no re-uploading, no
duplication). The **built-in procedural sounds** (Ambient drone, Pickup blip, Scene
transition, Footstep, Rain loop) are seeded here too — rename or **✕** them, or upload
replacements. _(Older documents with inline sounds are migrated into this library
automatically.)_

### Atmosphere (global) — weather presets

The **weather-preset library** (M10 10a). **+ Preset** adds one; **Edit** opens the slider
editor; **✕** removes it. Each preset is **parametric** (no per-weather code): **shape**
(round = snow/dust · streak = rain), **blend** (normal / add-glow), **colour**, and sliders
for **count, alpha, size, angle, speed, sway, sway freq**; plus an optional **ambient**
sound (a library reference) that loops **over** the scene's ambient. Built-in **rain / snow
/ dust** ship ready (editable). Pick a preset per scene in **Scene → Weather** (gated by
`when`). _(A live preview while sliding is a follow-up — tune with ▶ Test in game.)_

### Audio (global)

Document-wide sound bindings (Project tab → Audio, M9):

- **default ambient** — the looping bed played in any scene without its own **ambient**
  (Scene tab). Pick from the library + volume.
- **footstep** — played in a cadence while the **player walks**; uncheck **footsteps while
  walking** to silence them.
- **pickup SFX** / **transition SFX** — played when an item is picked up / the scene
  changes. All four default to the built-in procedural sounds (pick another to replace).

_(Per-NPC footsteps + per-animation sounds + reactive ambient `when` are follow-ups.)_

### Lighting (global)

Document-wide lighting defaults (Project tab → Lighting, M10 10b):

- **default ambient light** — colour + intensity used by any scene without its own
  **ambient** (Scene → Lighting).
- **player light** — the light the player carries: **shape** (sphere around them / cone
  following facing), colour, radius, intensity, cone°, and a **when** gate (e.g. `hasItem:
  flashlight` — the player finds a torch and it lights up). It reveals the scene in dark
  areas / dark scenes.

### Transition (global)

How scene swaps look. By default the game fades through **black**; here you can set:

- **colour** — the wash colour the swap fades through.
- **art** — an optional image shown (centred, covering) over the wash during the swap.
- **min hold** — a minimum time (ms) the wash stays up, so a styled transition lingers
  even when the next scene loads instantly.

If a scene takes a moment to load, a **loading spinner** shows in the corner while the
screen is covered — the game never reveals a half-loaded scene.

### Playtest

- **▶ Test in game** — saves the working document as a dev draft and opens the
  game (drops `?edit`). Start **New game** to play your edits; a **dev draft**
  badge shows in-game.
- **Discard** — clears the draft and reloads (back to `content/game.json` or the
  demo).

### Document

- **Export** — downloads the whole document as `game.json`.
- **Import** — loads a `game.json` into the editor session.
- **To publish:** Export, drop it in **`content/game.json`**, and commit it (see
  `content/README.md`). The game then plays it.

---

## Preparing assets

Everything you upload (images, atlases, sounds) is stored **inside the document** as a data-URL,
so a single `game.json` carries the whole game and survives **Export**. Keep assets lean — big
files bloat the document. For _how to create_ the art (Recraft → Inkscape → atlas, animation
technique, the geometric-placeholder style), see `asset_pipeline.md`; this section is the exact
**formats the editor expects**.

### Design space

Author against the document's **reference height** (Project → Display, default **1080 px**). The
player's viewport is fitted to it with one uniform scale, so size your art for a 1080-tall stage
(a 16:9 scene is ~1920×1080). Scene positions are **fractions** (0..1), so art stays
resolution-independent; a scene's **width** (in these px) past the screen aspect makes the camera
scroll.

### Animation atlases (characters, NPCs, animated layers)

A character / NPC **view**, and an **animated layer**, are a single **atlas** image — a grid of
equal-size frames — plus a description of how to slice + play it.

- **Image** — one PNG (or SVG) holding all frames in a **grid**, packed **left-to-right,
  top-to-bottom**; frame indices start at **0**. No padding between cells.
- **Frame size + columns** — set **frame width**, **frame height**, and **columns** so the editor
  can cut the grid. (Rows are inferred.)
- **Clips** (character/NPC) — name each animation and list its **frame indices** + **fps** +
  **loop**. Naming convention: **`state.facing`**, e.g. `idle.S`, `walk.E`. Five base directions
  suffice — **S / SE / E / NE / N** — the **W-side mirrors automatically** (SW / W / NW). One-shots
  are named by action: **`pickup`**, **`interact`** (played on use), plus **`talk`** / **`crouch`**
  where used; a one-shot clip can carry its own **sound**.
- **Anchor** — the sprite origin in 0..1. Feet at the bottom = **anchorY `1`** (logic positions the
  character by its feet). anchorX `0.5` centres it.
- **Animated layer** — same grid; set frame w/h / columns / **frames** (how many to play) / **fps**;
  it loops. Gate it with `when` to swap a static **or** animated asset by flag.

### Images (layers, icons, cursors, screens)

SVG / PNG / JPG, uploaded where each field asks (a scene **Layer**, an item **Icon**, a context
**Cursor**, screen **backgrounds / logos / title-button images**). **SVG is preferred** for crisp
scaling (Pixi rasterises it to a texture at runtime). A backdrop **Layer** fits via **cover /
contain / width / stretch / none**; `none` / `width` layers are **draggable** in the preview.

### Sounds

Upload audio clips **once** in the **Sounds tab** (stored as data-URLs); everything else
**references** them by name (ambient, footsteps, weather, `playSound`, voice, a monologue line…).
Use a common web audio format (**WAV / MP3 / OGG**); keep one-shots short and ambient clips
**loopable** (seamless start/end). Built-in **procedural** sounds are seeded into every document
(ambient / pickup / transition / footstep / rain) and can be referenced or replaced.

---

## Reference

### Conditions (the `when` vocabulary)

| Kind        | True when…                                  |
| ----------- | ------------------------------------------- |
| `hasItem`   | the player holds an item.                   |
| `flag`      | a flag is on (or off — the checkbox).       |
| `visited`   | a scene has been visited.                   |
| `all`       | **all** nested conditions are true (AND).   |
| `any`       | **any** nested condition is true (OR).      |
| `not`       | the nested condition is false.              |

`all` / `any` / `not` nest more condition editors, so you can build any logic.

### Effects

Effects run in order, from an interactable / trigger / dialogue node / cutscene step / rule.
**State** effects change the saved game; **engine** effects act on the live scene.

| Kind            | Does…                                                                          |
| --------------- | ------------------------------------------------------------------------------ |
| `setFlag`       | set a flag on / off (state).                                                   |
| `giveItem`      | add an item to the inventory (state).                                          |
| `takeItem`      | remove an item (state).                                                        |
| `goTo`          | switch to a scene (state).                                                     |
| `moveNpc`       | move a cast NPC to another scene — its runtime location (state).               |
| `despawnNpc`    | remove an NPC from play (state).                                               |
| `gameOver`      | show the **Game over** screen (Retry / Title) (state, M11).                    |
| `endGame`       | show the **End** screen → credits → final → title (state, M11).                |
| `startDialog`   | start a dialogue (id from the **Dialogs** library).                            |
| `startSequence` | play a **cutscene** (id from the Cutscenes library); blocks input until it ends. |
| `playSound`     | play a library sound clip.                                                     |
| `playAnim`      | play a one-shot animation (`action`) on a character (default the player).      |
| `say`           | show a world-space **speech bubble** (`text`) over a character (M12.5).         |
| `wait`          | linger the entering NPC / dialogue partner for `ms` (optionally looping `anim`); never the player. |
| `setStance`     | hold an idle posture (e.g. `crouch`) on a character until cleared (crouch at cover). |

### Keyboard & mouse

- **Esc** — close the editor's open modal (NPC) / cancel a draw mode; in-game, opens the menu.
- **Backspace / Delete** — remove the selected node or edge in a graph (routine / logic).
- **Drag** — reposition free (`none` / `width`-fit) image / animated layers, lights, emitters,
  spawn points, and NPC spawns in the preview; drag graph nodes to arrange them.
- **▶ Test in game** lives in the top-right toolbar with **Discard** and the panel toggle.

---

## A typical scene, start to finish

1. **Scenes → + Scene** (or pick an existing one).
2. **Layers** — upload a backdrop, or stack `width` strips (sky / land / road) and
   drag them into place on Y.
3. **Walkable → Draw** the floor the character can stand on.
4. **Interactables** — place pickables / exits / interacts, **Draw** each hit-area,
   and set **item / to / when / effects / uses**.
5. **▶ Test in game** to play it.
6. **Export → `content/game.json` → commit** when you're happy.
