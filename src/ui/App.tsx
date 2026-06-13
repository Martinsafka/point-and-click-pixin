import { GameCanvas } from './GameCanvas'
import { useStory } from './use-story'
import { gameDoc } from '../data/game'

/**
 * Root of the React overlay. The Pixi world sits underneath (GameCanvas);
 * everything rendered here is DOM chrome layered on top — the "world in Pixi,
 * chrome in React" split from agent_docs/architecture.md.
 *
 * Scene name + visited count are read from the story store via `useStory` —
 * proof the overlay is bound to the same discrete state the engine drives, and
 * that state persists across scene transitions.
 */
export function App() {
  const sceneId = useStory((s) => s.currentScene)
  const visited = useStory((s) => s.visited.length)
  const sceneName = gameDoc.scenes[sceneId]?.name ?? sceneId

  return (
    <div className="app-root">
      <GameCanvas />
      <div className="overlay">
        <header className="overlay__title">Point &amp; Click Adventure</header>
        <p className="overlay__hint">
          Scene: {sceneName} · visited {visited} — click to walk; click the lit door to change
          scene. The cube stays on the road, and progress persists across scenes.
        </p>
      </div>
    </div>
  )
}
