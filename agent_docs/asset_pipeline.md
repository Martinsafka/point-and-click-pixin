# Asset Pipeline

How art becomes a game asset, and how it binds to entities at runtime. For the entity/view *architecture*, see `architecture.md`.

## Principle

Functional code is the priority; **art is a swappable layer**. Build with geometric placeholders, swap in real art via the view descriptor when ready. Don't block code work on art.

## Pipeline (when doing real art)

1. **Recraft** (V4 Vector) — generate environments/elements as native SVG. **Lock a style from the first hour** (3–5 references, identical prompt prefix) for cohesion. Generate elements **separately** (background plate, foreground occluder, character), not one big scene to slice. Expect manual cleanup — environments are harder than its logo/icon sweet spot.
2. **Inkscape** — clean SVG, cut into layers, prep for export.
3. **Export PNG frames** → pack into a **texture atlas** (TexturePacker or a free packer; outputs JSON Pixi loads directly).
4. **PixiJS** — load via `Assets`, play via `AnimatedSprite`.

**Characters & references** (deferred — placeholders / geometric for now):
- **Leonardo** — character consistency (the protagonist and recurring characters across poses/expressions). Consistency is the **weakest link** in image gen; expect drift. Minimize the number of poses; the flat style at small scale hides it.
- **Sorceress** — **motion reference only**, never a final asset: generate an animated sprite sheet for silhouette + timing, then redraw into clean vector. Its raster/pixel output clashes with flat vector, but as a throwaway reference that's fine.

> De-risk: push **one generic asset** end-to-end through this pipeline before banking on it — that's where unfamiliar-tool surprises hide. Do it only after the systems work, and never block on it.

## View descriptor (build later — YAGNI)

When swapping placeholders for real sprites, the per-state binding is richer than "a URL". Model it so the swap stays a data change:

```ts
type View =
  | { kind: "static"; texture: string; anchor: Point; footprint: Rect }
  | { kind: "anim"; frames: { texture: string; ms: number }[]; loop: boolean; anchor: Point; footprint: Rect };
type CharacterViews = Record<StateName, View>;
```

- **Animated state ≠ one image** — it's frames + per-frame timing + loop. Model `static | anim` up front so adding animation isn't a refactor.
- **Anchor + footprint live on the descriptor, not the logic.** Logic positions one logical point (feet at x,y); the view carries its own pivot and hit-area. Otherwise a swap floats the character and misaligns the click target.
- **One thin signal flows view → logic:** `onComplete` for states that must finish (interact, "open chest"). Never pixels — just the timing signal.

## Animation technique

- **Frame-by-frame**, not rigged/cut-out (deliberate — see project_brief).
- Animate **on twos/threes** (each drawing held 2–3 frames) → ~8–12 unique drawings/sec, fewer for a walk loop.
- A one-direction walk ≈ **4–8 key poses** (contact, recoil, passing, high-point); the rest are looser smears.
- **The engine does NOT interpolate.** `AnimatedSprite` hard-cuts frame to frame. Smoothness = enough drawings + good smears + the eye; it's not free from the runtime.
- Variable per-frame timing: `AnimatedSprite` takes an array of frame objects with their own `time` — hold keys longer, flash smears short.
- **8 directions multiply the work.** A walk cycle is needed per facing. **Mirror horizontally** (draw S, SE, E, NE, N → flip for W, NW, SW) = ~5 cycles, not 8 — the single biggest animation cost. Free for placeholders; for real sprites drop to 4 directions if 5 is too much. (Movement / scaling / sorting spec → `architecture.md`.)

## Authoring: vector vs raster (per frame)

- SVG's benefit is at **authoring** (easy consistency edits, resolution independence), not runtime — Pixi rasterizes everything to a texture.
- Mix freely **per frame**: clean key poses in vector; blurry smear/in-between frames in raster (faster, look better). Both end up as PNG in the same atlas; the engine can't tell.

## Geometric fallback (a feature, not a failure)

If art slips, shipping with geometric shapes is a **legitimate style**, not an unfinished prototype (cf. *Thomas Was Alone*). The Röki direction (silhouette, flat shapes, chiaroscuro) means geometric primitives + the planned atmospheric filters (fog, glow, chiaroscuro) read as an intentional dark style. Keep the palette coherent and add subtle motion/easing.