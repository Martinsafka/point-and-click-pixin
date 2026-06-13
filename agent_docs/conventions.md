# Conventions

Code style and patterns for this project. Authoritative for "how we write code here". Keep it pragmatic — this is a jam, prefer working + swappable over clever.

## TypeScript

- **No `any`.** Use precise types; reach for `unknown` + narrowing if truly dynamic.
- Distinguish `null` vs `undefined` deliberately.
- Use **discriminated unions** for things with variants (view descriptors, entity states, scene types) — they make the swappable patterns safe.
- Type the data tables (recipes, manifests, view maps) so a bad entry is a compile error.

## Naming & files

- Clear English names. Files/dirs `kebab-case` or match the area's existing style; React components `PascalCase`.
- One concern per file. Keep an entity's **logic and view separable** (don't bake movement into a `Graphics` object).
- Follow the layout in `AGENTS.md` (`engine/`, `scenes/`, `entities/`, `state/`, `ui/`, `systems/`, `audio/`, `data/`).

## Data-driven game logic

- Game rules live in **data tables** under `src/data/`, not in `if/else` chains.
  - Item combinations: a recipe map (e.g. `[red, blue] → purple`).
  - Interactions: data describing what an object does when clicked / used-on.
  - Character appearance: a `state → view` map.
- Adding content should mean editing data, not rewriting logic.

## State

- **Per-frame state** (positions, frame index, motion) → plain mutable objects in the ticker loop.
- **Discrete/meta state** (inventory, flags, puzzle progress, current scene) → Zustand only.
- React UI **reacts** to Zustand; Pixi reads/writes the store imperatively. Never push 60fps updates through React or the store.

## Pixi specifics

- Prefer the global `pixijs-*` skills' v8 patterns over half-remembered tutorials (avoid v6/v7 API).
- Preload assets with `Assets` bundles before a scene needs them; avoid load hitches mid-play.
- Animation = baked PNG atlas + `AnimatedSprite`, not per-frame vector tessellation.
- Tear scenes down cleanly (`destroy`) to avoid leaks; remove ticker callbacks on teardown.

## Dependencies

- Don't add libraries casually. The stack is Pixi, React, Zustand, Howler + TypeScript. Justify anything new in the dev log.

## Done means

- `typecheck` + `lint` pass.
- The dev-log entry is written (`agent_docs/dev_log.md`).
- A commit message is proposed for the change (see `workflow.md` step 5).
