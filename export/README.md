# export/ — raw editor exports (gitignored)

Drop your editor **Export** here as `game.json`, then run:

```bash
pnpm assets
```

The pipeline (`scripts/build-assets.mjs`) reads `export/game.json`, writes the externalized
art/audio to `public/assets/baked/`, and emits a lean `content/game.json` — the committed
source of truth the game bundles.

Raw exports in this folder are **gitignored**: they hold megabytes of inline base64 and never
get committed. Only the lean `content/game.json` and `public/assets/baked/` do.
