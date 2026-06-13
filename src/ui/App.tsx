import { GameCanvas } from './GameCanvas'

/**
 * Root of the React overlay. The Pixi world sits underneath (GameCanvas);
 * everything rendered here is DOM chrome layered on top — the "world in Pixi,
 * chrome in React" split from agent_docs/architecture.md.
 *
 * Right now it's just a placeholder HUD that proves the layering works.
 */
export function App() {
  return (
    <div className="app-root">
      <GameCanvas />
      <div className="overlay">
        <header className="overlay__title">Point &amp; Click Adventure</header>
        <p className="overlay__hint">
          Dev environment ready — PixiJS v8 world + React overlay. The placeholder cube renders in
          the canvas below this chrome.
        </p>
      </div>
    </div>
  )
}
