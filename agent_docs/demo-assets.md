# Demo assets — PixelLab prompt sheet (_Magický polibek_)

Copy-paste prompts for generating the demo's pixel art in **[PixelLab](https://www.pixellab.ai/docs)**,
mapped to the asset checklist in `demo-roadmap.md`. PixelLab generates pixel-art **characters,
items, tilesets, and backgrounds**; prompts are **short descriptive phrases**, and its style
controls are weak — so **cohesion comes from a locked style, not the prompt**.

## Workflow (do this first — it's what keeps everything matching)

1. **Lock the look once.** Generate **one** asset you like (suggest the **player** or a single house).
   Then for everything else use **Create images from style references (Pro)** pointing at it (or
   reuse the same **Seed** with identical style keywords). PixelLab's text controls drift, so a
   style reference / fixed seed is how a dozen sprites end up cohesive.
2. **Neutral lighting only.** Do **not** bake shadows / time-of-day / coloured light into the art —
   the engine does morning↔dinner lighting + fog + grade itself. Generate everything in **flat,
   even daylight** so the engine can tint it.
3. **Transparent where it stacks.** Turn on **Remove background** for characters, items, and every
   scene layer that sits over another (hills, buildings, props). Only the **sky** is full-bleed.
4. **Export → grid.** Characters/animations export as sprite sheets; make sure each is a **uniform
   grid** (equal frame size, fixed columns) — that's what the editor's atlas expects
   (`editor_guide.md` → Preparing assets). Items/layers export as single transparent PNGs.

## Global settings

| Setting             | Use                                                                 |
| ------------------- | ------------------------------------------------------------------- |
| **View**            | `side` (sidescroller) for **everything** — the whole game is side-on |
| **Facing**          | `south` for idle/talk poses · `east` for walk cycles (engine mirrors W) |
| **Remove background** | on for characters, items, hills, buildings, props · **off for sky** |
| **Force symmetry**  | on for round/symmetric items (charm, fountain) · off for figures    |
| **Seed**            | pick one number and **reuse it** across a set                       |
| Size (native px)    | items ~**32–48** · characters ~**64** (tall figures 48×80) · scene layers as large as the tool allows (M-XL), or tileable pieces |

### Style suffix (append to every prompt)

> `detailed painterly storybook pixel art, muted earthy palette (warm browns and dusty reds against cool sage and teal), soft dithered shading, atmospheric depth, dark outline, flat even neutral lighting, side view`

**Art-direction reference (user-provided).** The target look is **Octavi Navarro–style** narrative
pixel art: richly detailed and painterly (not flat / minimal), a muted earthy palette with **warm
interiors against cool exteriors**, soft dithering, strong atmospheric depth (layered mountains /
haze / parallax), and small storytelling details everywhere. We adopt that **rendering style, not
its fjord content** — our world stays the medieval fairy-tale (tavern / street / tower). Keep
generating **neutral, even lighting** (the engine adds the morning↔dinner mood, fog, and grade) —
the cinematic atmosphere comes from the engine's lighting + fog + colour-grade layered over
neutral art, never baked into the sprite.

---

## Scenes (generate as separate parallax layers)

The engine stacks layers per band (`background` / `mid` / `foreground`) with **parallax**. So
generate each layer on its own and stack them.

### Tavern (one room — does not scroll)

- **Room background** (full-bleed): `cozy medieval tavern interior, timber beams, stone fireplace with fire, wooden bar, stacked barrels, hanging lanterns`
- **Foreground props** (transparent, separate): `a heavy wooden table with a full beer tankard` · `a wooden cellar trapdoor in the floor` · `a crumpled royal WANTED poster nailed to a plank wall` · `an old bent fork / wire hook on a shelf`

### Street (WIDE — scrolls sideways; this is the layered one)

Generate **each** as its own image, back to front:

- **Sky** — _full-bleed, NO transparency, slowest parallax:_ `soft pastel medieval daytime sky, a few gentle fluffy clouds, plain`
- **Hills behind the city** — _transparent, slow parallax:_ `distant rolling green hills on the horizon, a far castle and faint town rooftops, hazy, simple silhouette`
- **Town buildings** — _transparent, mid parallax:_ `a row of crooked medieval timber-framed houses and little shopfronts, warm plaster and wood, no people`
- **Street ground** — _the walkable strip:_ `cobblestone medieval street, worn flagstones, a gutter`
- **Zone props** (transparent, foreground): `a dark narrow alley opening between two houses, shadowy` (alley) · `a small wooden market stall with crates` (market) · `an old stone fountain with a trickle of water` (fountain) · `a rusty iron drain grate in the cobbles` (grate)

### Tower

- **Tower gate** (exterior, the guard scene): `the stone base of a tall round tower, a heavy iron-banded wooden door, a guard's post, ivy`
- **Tower bedroom** (interior, the princess): `a round stone tower bedroom, a canopy four-poster bed, an arched window, moonlit, cosy`

---

## Characters & NPCs

Use **Create animated character (Pro)** for the player + the mobile onion seller (they walk);
the rest can be **8-directional sprite** or a couple of still poses. All **side view**,
**Remove background** on.

| Who | Prompt (+ style suffix) | Poses / frames needed |
| --- | --- | --- |
| **Player (tramp hero)** | `a scruffy penniless peasant tramp, patched brown tunic, ragged cloak, messy hair, stubble, cheeky grin, barefoot` | idle (`south`), walk (`east`); one-shots: **talk**, **kiss**, **eat-onion** (2–3 frames each) |
| **Tavernkeeper** | `a stout jolly medieval tavern keeper, bald head, big bushy moustache, dirty apron, rolled sleeves, holding a tankard` | idle + talk (`south`) |
| **Fish vendor** | `a plump cheerful market fishwife, headscarf, apron, a basket of silver fish, ruddy cheeks` | idle + talk (`south`) |
| **Onion seller** | `a skinny old onion peddler, straw hat, braids of onions slung over the shoulder, waving an onion, toothy open-mouthed shout` | walk (`east`) + a "shout/gesture" pose (`south`) |
| **Guard** | `a sleepy bored tower guard, dented helmet, chainmail, leaning on a halberd, droopy eyes` | idle (`south`) + a **drinking-beer** pose + a **slumped-asleep** pose |
| **Princess** | sleeping: `a young princess asleep on a canopy bed, long flowing hair, small crown, peaceful` — waking: `a young princess sitting up in bed, teary squinting eyes, annoyed scowl, crown askew` | 2 stills (asleep, awake-in-tears) — treat as scene elements, not a walker |
| **Cat** | `a scrawny grey tabby stray cat, big round eyes, sitting, scruffy` | small (~32–40px), idle + a tiny tail-twitch |

> Keep all NPCs roughly the **same height ratio** as the player so they read together; the engine
> depth-scales them by position.

---

## Items (inventory icons)

Small (**~32–48px**), **Remove background** on, neutral lighting, centred. **Force symmetry** on
for the round ones. Append the style suffix.

| Item | Prompt |
| --- | --- |
| `hook` | `a bent wire hook lashed to a short stick, makeshift` |
| `charm` | `a shiny ornate golden brooch trinket, a small jewel, lucky charm` _(force symmetry)_ |
| `fish` | `a single fresh silver fish, glistening` |
| `beer` | `a wooden tankard of frothy golden beer, foam on top` |
| `onion` | `a single yellow onion, papery skin, green sprout` _(force symmetry)_ |

_(The `cat` "item" can reuse the cat sprite shrunk to an icon.)_

---

## Engine import tips

- **Layers:** drop each scene PNG into Scene → **Layers** (`+ Image` / `+ Animated`), set its
  **band** + **parallax** (sky ~0.2, hills ~0.4, buildings ~0.7, ground 1.0, foreground ≥1).
- **Characters:** a uniform sprite-sheet grid → the player's view / an NPC view (frame w/h /
  columns / clips `idle.S`, `walk.E`, one-shots). Anchor **Y = 1** (feet at the bottom).
- **Items:** the PNG icon goes on the `ItemDef` (Items tab → **+ Icon**).
- Native pixel sizes are small on purpose — the engine scales them up to the 1080 design height;
  keep characters/items at a consistent native scale so they sit together.
- Generate **daylight-neutral**; the time-of-day mood (morning vs dinner) is the engine's lighting.
