import { useEffect, useState } from 'react'
import { GameCanvas } from './GameCanvas'
import { Inventory } from './Inventory'
import { Menu } from './Menu'
import { TitleScreen } from './TitleScreen'
import { useStory } from './use-story'
import { gameDoc } from '../data/game'
import { hasDocDraft } from '../data/doc-draft'
import { storyStore } from '../state/story'
import { loadGame } from '../state/storage'

/**
 * App shell with two phases: the title screen, and the running game. New game /
 * Continue set up the story store then enter the game (which mounts the Pixi
 * world); Exit to title leaves it (tearing the world down). The Pixi world only
 * exists while playing.
 */
export function App() {
  const [playing, setPlaying] = useState(false)
  const sceneId = useStory((s) => s.currentScene)
  const visited = useStory((s) => s.visited.length)
  const narration = useStory((s) => s.narration)

  // The narration line ("look at" text) auto-clears after a few seconds.
  useEffect(() => {
    if (!narration) return
    const t = setTimeout(() => storyStore.getState().say(null), 4000)
    return () => clearTimeout(t)
  }, [narration])

  const newGame = () => {
    storyStore.getState().reset(gameDoc)
    setPlaying(true)
  }

  const continueGame = async () => {
    const state = await loadGame()
    if (state && gameDoc.scenes[state.currentScene]) {
      storyStore.getState().load(state)
      setPlaying(true)
    }
  }

  if (!playing) {
    return <TitleScreen onNewGame={newGame} onContinue={() => void continueGame()} />
  }

  const sceneName = gameDoc.scenes[sceneId]?.name ?? sceneId

  return (
    <div className="app-root">
      <GameCanvas />
      <div className="overlay">
        <header className="overlay__title">
          Point &amp; Click Adventure
          {hasDocDraft() && <span className="overlay__badge">dev draft</span>}
        </header>
        <p className="overlay__hint">
          Scene: {sceneName} · visited {visited} — click to walk. Pick up items, combine them in the
          bar, and use a selected item on objects.
        </p>
        {narration && <p className="overlay__narration">{narration}</p>}
        <Inventory />
        <Menu onExit={() => setPlaying(false)} />
      </div>
    </div>
  )
}
