import { GameCanvas } from './GameCanvas'
import { Inventory } from './Inventory'
import { Menu } from './Menu'
import { useStory } from './use-story'
import { gameDoc } from '../data/game'

/**
 * Root of the React overlay. The Pixi world sits underneath (GameCanvas);
 * everything rendered here is DOM chrome layered on top — the "world in Pixi,
 * chrome in React" split from agent_docs/architecture.md.
 *
 * Scene name, visited count, the inventory and the menu are all driven by the
 * story store via `useStory` / direct store access.
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
          Scene: {sceneName} · visited {visited} — click to walk. Pick up items, combine them in the
          bar, and use a selected item on objects.
        </p>
        <Inventory />
        <Menu />
      </div>
    </div>
  )
}
