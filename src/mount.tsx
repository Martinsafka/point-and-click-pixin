import { StrictMode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import type { GameDoc } from './data/schema'
import { setActiveDoc } from './data/active-doc'
import { setSoundLibrary } from './audio/audio'
import { migrateSounds } from './data/migrate-sounds'
import { seedBuiltinSounds } from './data/seed-sounds'
import { seedWeatherPresets } from './data/weather-presets'
import { App } from './ui/App'
import './styles.css'

/** Handle returned by {@link mountGame}. */
export interface GameHandle {
  /** Unmount the game and release its React root. */
  destroy(): void
}

/**
 * Mount a playable game from a `GameDoc` into a DOM container — the `pixin` embedding API.
 *
 * Renders the full screen flow (loading → title → play → end / credits). The document is seeded
 * (built-in sounds + weather presets, like the editor's runtime) and published as the active
 * document, so **one game runs per page**. `react`, `react-dom` and `pixi.js` are peer deps the
 * host provides, and the stylesheet must be loaded once: `import 'pixin/styles.css'`.
 *
 *   import { mountGame } from 'pixin'
 *   import 'pixin/styles.css'
 *   const game = mountGame(myDoc, document.getElementById('game')!)
 *   // …later: game.destroy()
 */
export function mountGame(doc: GameDoc, container: HTMLElement): GameHandle {
  const prepared = seedWeatherPresets(seedBuiltinSounds(migrateSounds(doc)))
  setActiveDoc(prepared)
  setSoundLibrary(prepared.sounds)

  const root: Root = createRoot(container)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  return { destroy: () => root.unmount() }
}
