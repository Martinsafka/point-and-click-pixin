# content/

The game's content lives here. **`game.json`** is a serialized `GameDoc` (the
schema in `src/data/schema.ts`): scenes, layers, walkable areas, interactables,
items, and recipes. This is the engine's content boundary — assets (SVGs, sprite
atlases, audio) will live here too as the pipeline grows.

## How the game picks its document

In priority order (`src/data/game.ts`):

1. **Editor draft** — in dev only, the working doc the editor saves via
   **▶ Test in game** (localStorage; see `src/data/doc-draft.ts`).
2. **`content/game.json`** — this file, if present. Bundled into the build.
3. **Built-in demo** — the street + room scenes defined in `src/scenes/`, used
   when no `game.json` exists.

## Publishing your edits

1. Open the editor: `…/?edit` (dev only).
2. Edit, then click **Export** — your browser downloads `game.json`.
3. Drop it here as **`content/game.json`** and commit it.
4. The game — and a production build — now plays it.

> The editor's **▶ Test in game** already lets you try edits instantly via the
> dev draft; `content/game.json` is for committing them as the shipped content.
> A dev-server endpoint that writes here directly (so Export skips the manual
> move) is a planned convenience.
