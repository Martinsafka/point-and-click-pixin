import { GameCanvas } from './GameCanvas'
import { useStory } from './use-story'
import { gameDoc } from '../data/game'

/**
 * Root of the React overlay. The Pixi world sits underneath (GameCanvas);
 * everything rendered here is DOM chrome layered on top — the "world in Pixi,
 * chrome in React" split from agent_docs/architecture.md.
 *
 * The scene name is read from the story store via `useStory` — proof the React
 * overlay is bound to the same discrete state the engine reads.
 */
export function App() {
  const sceneId = useStory((s) => s.currentScene)
  const sceneName = gameDoc.scenes[sceneId]?.name ?? sceneId

  return (
    <div className="app-root">
      <GameCanvas />
      <div className="overlay">
        <header className="overlay__title">Point &amp; Click Adventure</header>
        <p className="overlay__hint">
          Scene: {sceneName} — click to walk. The cube stays on the road, scales with depth, and
          hides behind the lampposts and foreground bushes.
        </p>
      </div>
    </div>
  )
}
