# Architecture

How the game is built at runtime. Authoritative for engine, rendering, state, and the entity model. For the art→runtime binding and animation, see `asset_pipeline.md`.

## Responsibilities at a glance

| Layer | Owns |
| --- | --- |
| **PixiJS** (renderer) | world, scene graph, layering, ticker, in-world click |
| **React / DOM overlay** | HUD, inventory, dialog, menu |
| **Zustand** | discrete/meta state — the bridge between Pixi and UI |
| **Plain JS objects** | per-frame state inside the loop |
| **Howler** | audio (reacts to state) |

PixiJS is a **renderer, not a game framework** — we wire scenes, input, audio, and state ourselves. Use the global `pixijs-*` skills for correct v8 API.

## Engine & scene layering

- 2D WebGL/WebGPU rendering via PixiJS v8.
- **No physics engine.** Click-to-move = lerp to point, or a small A* over a walk-mesh (polygon walkable area + hit-test). Keep it simple.
- A scene = separated `Container` layers, ordered via `zIndex` + `sortableChildren`:
  1. **Background** (lowest zIndex)
  2. **Interactive mid** — characters, interactive objects, the playable plane
  3. **Foreground / occluder** — framing elements (walls, foreground props; highest zIndex)
- **Atmosphere** (fog, chiaroscuro, lights) via GPU filters (Pixi core + `pixi-filters`: blur, glow, displacement). Layer it in the engine; don't bake it into every asset.

## Stealth occlusion

The character lives **inside** the scene graph, between mid and foreground. The foreground container has a higher `zIndex`, so it draws over the character → the character is "hidden" behind it. This is why the character must **not** be a DOM/SVG overlay — it has to sit between Pixi layers.

(Visual occlusion ≠ stealth detection. "The guard doesn't see me while I'm in a hide-zone" is game logic, not rendering — see `src/systems/`. Only build detection if stealth is a core beat.)

## Movement & pseudo-depth (2.5D)

The character moves freely in **8 directions** and the scene fakes 3D depth from flat 2D layers — the classic adventure approach (Broken Sword, Black Mirror / Posel smrti, Polda). It is **not** a side-scroller. Three pieces, all recomputed each frame from the character's **feet position**:

**1. Walkable area.** Each scene defines a polygon the character may stand in; click-to-move paths within it (lerp to point, or small A* on the polygon). Per-scene data.

**2. Depth scaling.** The character's `scale` is a function of its feet **Y** (the scene's depth axis): near the camera (low on screen) = larger, far = smaller. Lerp between two per-scene reference values:

```ts
// per-scene data in src/data/
type DepthScale = { yNear: number; yFar: number; scaleNear: number; scaleFar: number };
// each frame:
const t = clamp((feetY - yFar) / (yNear - yFar), 0, 1);
sprite.scale.set(lerp(scaleFar, scaleNear, t));
```

Perspective differs per background, so `DepthScale` is scene data, not hardcoded.

**3. Depth sorting (Y-sort).** The character's `zIndex` follows its feet Y, so it draws in front of "closer" scenery and behind "further" scenery. Give any depth-sortable prop its own anchor Y + zIndex by the same rule, in the same sortable container as the character — that's how the character walks **around / behind** mid-scene objects (table, pillar), beyond the fixed foreground occluder.

> The 3-layer model still holds. Y-sorting operates **within** the interactive layer for objects at varying depth; the foreground occluder stays a top layer.

**8-direction facing is a view concern, not logic.** Logical state stays `idle` / `walk` (+ `interact` / `hidden`) plus a `facing` derived from the movement vector (angle → one of 8 buckets). The view maps `(state, facing)` → the right animation. The cube placeholder needs no per-direction art (a shape, or a small direction marker) — the prototype proves the **selection + scaling + sorting** plumbing; real directional sprites slot in later via the view descriptor. Art cost: see `asset_pipeline.md` (8 directions is the biggest animation budget — mirror to cut it).

## State — two kinds, never mixed

- **Per-frame state** (positions, current frame, what's moving) → plain mutable objects, mutated in the ticker loop. **Never** in a reactive store — a reactive update ~60×/s is a perf footgun.
- **Discrete / meta state** (inventory, solved puzzles, dialog flags, current scene, "NPC persuaded") → **Zustand**. Event-driven, changes rarely, the UI reacts to it.

Zustand works **outside React**: Pixi code reads/writes via `getState`/`setState` and subscribes; React UI binds natively. It is the single shared state between the Pixi world and the React overlay.

## Entity model — view separate from logic

This is the core invariant. An entity = abstract logical state + a swappable view.

- The entity holds a Pixi `Container` (the **view**). Logic positions that container and switches abstract states (`idle`, `walk`, `interact`, `hidden`). **Logic never touches pixels.**
- What's *inside* the container — now a `Graphics` cube placeholder, later an `AnimatedSprite` — is irrelevant to the logic. Swapping cube → sprite is a data change (which view to instantiate), not a refactor.
- **Do now (cheap):** the thin separation above.
- **Defer (YAGNI):** the richer per-state view descriptor (frames + timing, anchor/pivot, footprint, `onComplete`). Add it when real sprites arrive — see `asset_pipeline.md`.

Build with cube placeholders first: the cube prototype proves the **systems**, not the art.

## UI layer

- HUD, inventory, dialog, menu = **React/DOM overlay positioned over the canvas**, not built inside Pixi (Pixi has no layout engine; building UI from `Text`/`Graphics` is painful).
- World = Pixi canvas; chrome = React layer on top. Only the character/world stays in Pixi (for occlusion); UI that sits on top and occludes nothing can be DOM.

## Audio

- Howler, **outside** Pixi. Audio is a **side-effect of state**: state changes → trigger a sound (call it at the event site, or subscribe to the store).
- Needs: ambient loop(s), a few SFX (footsteps, click, pickup, stingers), crossfade between scenes.

## Scenes & persistence (watch out)

Pixi has no scene manager — we hand-roll scene teardown/setup. When transitioning scenes, tear down the old containers cleanly (avoid leaks / lingering tickers) and **preserve Zustand state** (inventory must survive a scene change). Test this early.