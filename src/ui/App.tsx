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
          Click to walk. The cube scales with depth, sorts in front of / behind the crate by its
          feet, and hides behind the foreground pillar.
        </p>
      </div>
    </div>
  )
}
