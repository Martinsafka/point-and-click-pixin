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
          Click to walk — the cube stays on the road. Head up the side street to shrink with depth;
          it hides behind the lampposts and the foreground bushes.
        </p>
      </div>
    </div>
  )
}
