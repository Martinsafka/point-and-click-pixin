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

- **Everything is a fraction of the screen (0–1).** Positions, polygons, sizes —
  all resolution-independent. The engine turns them into pixels at runtime.
- **Bands** stack the visuals: **background < mid < foreground** (paint order).
  The **mid** band is depth-sorted by feet position, and the character lives
  there — so foreground layers can pass in front of it.
- **Interactables are invisible** — they're hit-areas (polygons) the player
  clicks. The editor shows them as coloured overlays; the game doesn't.

## Layout

A **left panel** (the tools, top to bottom) beside a **live preview** of the
selected scene. Edits show in the preview immediately. Each section **collapses**
when you click its title (accordion), and you can **drag the divider** between the
panel and the preview to widen the panel.

---

## Panels

### Scenes

The scenes in the game. Click one to select it (everything below acts on the
selected scene, and the preview shows it).

- **+ Scene** — adds a blank scene (a default floor walkable + a spawn point).
- **Delete** — removes the selected scene (always keeps at least one).

### Walkable · _N_ pts

The polygon the character may walk in. Clicks in the game move the character to
the nearest point inside it.

- **Draw** — toggle on, then click in the preview to drop polygon points in order
  (shown as a gold outline + dots). Toggle off (**Done**) when finished.
- **Clear** — empties the polygon (redraw from scratch; there's no vertex drag
  yet).

### Layers · _N_

The scene's stacked visuals — uploaded images **and** the demo's built-in code
painters, listed in paint order.

- **+ Image** — upload an SVG or PNG. It's added as a full-screen background
  backdrop and stored **inside the document** (a data-URL), so it survives Export.

Each layer row:

| Control    | What it does                                                                 |
| ---------- | ---------------------------------------------------------------------------- |
| **band**   | background / mid / foreground (paint order; mid is depth-sorted).            |
| **fit**    | _(images)_ how it sizes to the screen — see the table below.                 |
| **role**   | scenery / occluder / floor — metadata for now (drives future occlusion).     |
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

### Interactables · _N_

The clickable objects. Shown in the preview as coloured hit-areas, labelled by id:
**green = pickable**, **amber = interact (use)**, **blue = exit**, **teal = look
(inspect)**; the selected one is highlighted.

- **+ Pick / + Use / + Exit / + Look** — add an object (with a centred default
  hit-area and a unique id). Pickable defaults to the first item, exit to another
  scene; **Look** (inspect) makes the protagonist comment.
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
| **when**      | all            | A Condition that gates it ("(always)" = no gate). See Conditions.   |
| **effects**   | pick / use / exit | Effects run when clicked. See Effects.                           |
| **uses**      | interact, exit | "Use item on object" rules: an item + the effects of using it.      |
| **Hit-area**  | all            | **Draw** (click the preview to add points) / **Clear**.             |

Clicking an object that has **look** text (with no item selected), or clicking an
inventory item, shows that text as a transient narration line in the game.

> For a **pickable**, giving the item and hiding it (the `picked:` flag) are
> automatic — its **effects** are *extra* things on top. For an **exit**, the
> `goTo` is automatic; effects run after it.

### Items · _N_ and Recipes · _N_ (global)

These two sections are **document-level** — they apply to the whole game, not the
selected scene.

**Items** — the inventory catalogue.

- **+ Item** — adds an item (a fixed auto id + an editable name).
- Edit the **name** and **examine** ("look at" text), and **+ Icon** to upload an
  inventory icon (SVG/PNG, stored in the document). **✕** deletes. The **id** is
  fixed at creation because interactables, uses, effects and recipes reference it —
  the name is just the label shown in the pickers.

**Recipes** — combine rules: `a + b → output`, order-independent. Selecting two
matching items in the inventory consumes both and yields the output.

- **+ Recipe** — adds a row; pick **a**, **b**, and **output** from the items.
- **✕** deletes the rule.

### Cursors (global)

The in-game pointer changes by what it's over: **walk** (over the walkable area),
**pickable**, **interact**, **exit**, **inspect**, or **default** (anywhere else —
sky, walls, outside any area). Upload an icon per context (SVG/PNG), or leave it
for the emoji fallback (👣 / ✋ / ⚙️ / 🚪 / 👁 / ↖️). The game has **no native
cursor**; over the game UI the normal pointer returns.

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

| Kind          | Does…                                            |
| ------------- | ------------------------------------------------ |
| `setFlag`     | set a flag on/off.                               |
| `giveItem`    | add an item to the inventory.                    |
| `takeItem`    | remove an item.                                  |
| `goTo`        | switch to a scene.                               |
| `startDialog` | marker only — the dialogue runtime arrives in M7.|

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
