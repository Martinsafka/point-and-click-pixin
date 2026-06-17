import { useEffect, useState } from 'react'
import { GameCanvas } from './GameCanvas'
import { Inventory } from './Inventory'
import { Menu } from './Menu'
import { DialogueBox } from './DialogueBox'
import { CutsceneOverlay } from './CutsceneOverlay'
import { GameCursor } from './GameCursor'
import { TitleScreen } from './TitleScreen'
import { LoadingScreen, TextScreen, CreditsScreen, FinalScreen } from './GameScreens'
import { useStory } from './use-story'
import { gameDoc } from '../data/game'
import { hasDocDraft } from '../data/doc-draft'
import { storyStore } from '../state/story'
import { loadGame } from '../state/storage'
import { applySettings } from '../state/settings'

/** A loading screen runs once per device, on the first visit (then this flag is stored). */
const LOADED_KEY = 'pixin-loaded'

/**
 * App shell — a screen flow (M11): **loading** (first visit only) → **title** → **playing**,
 * and from playing the `gameOver` effect → **game over** (retry / title) or the `endGame`
 * effect → **end** → **credits** → **final** → title. The Pixi world only exists while playing.
 */
type Phase = 'loading' | 'title' | 'playing' | 'gameover' | 'end' | 'credits' | 'final'

export function App() {
  const screens = gameDoc.screens
  const firstVisit = (() => {
    try {
      return !localStorage.getItem(LOADED_KEY)
    } catch {
      return false
    }
  })()
  const [phase, setPhase] = useState<Phase>(firstVisit ? 'loading' : 'title')
  const sceneId = useStory((s) => s.currentScene)
  const visited = useStory((s) => s.visited.length)
  const narration = useStory((s) => s.narration)

  // Apply player settings (font size + volume) + the doc's UI font once on boot.
  useEffect(() => {
    applySettings()
    if (gameDoc.font) document.documentElement.style.setProperty('--game-font', gameDoc.font)
  }, [])

  // A `gameOver` / `endGame` effect (run from dialogue / a trigger) sets `story.screen`; react
  // to it via a store subscription (an event), switching phase + clearing the request.
  useEffect(() => {
    return storyStore.subscribe(() => {
      const sc = storyStore.getState().screen
      if (!sc) return
      setPhase(sc === 'gameOver' ? 'gameover' : 'end')
      storyStore.getState().setScreen(null)
    })
  }, [])

  // The narration line ("look at" text) auto-clears after a few seconds.
  useEffect(() => {
    if (!narration) return
    const t = setTimeout(() => storyStore.getState().say(null), 4000)
    return () => clearTimeout(t)
  }, [narration])

  const newGame = () => {
    storyStore.getState().reset(gameDoc)
    setPhase('playing')
  }
  const continueGame = async () => {
    const state = await loadGame()
    if (state && gameDoc.scenes[state.currentScene]) {
      storyStore.getState().load(state)
      setPhase('playing')
    }
  }
  const retry = async () => {
    const state = await loadGame()
    if (state && gameDoc.scenes[state.currentScene]) {
      storyStore.getState().load(state)
      setPhase('playing')
    } else {
      newGame()
    }
  }

  if (phase === 'loading') {
    return (
      <LoadingScreen
        cfg={screens?.loading}
        onDone={() => {
          try {
            localStorage.setItem(LOADED_KEY, '1')
          } catch {
            // ignore (private mode) — the loading screen just shows again next time
          }
          setPhase('title')
        }}
      />
    )
  }
  if (phase === 'title') {
    return (
      <TitleScreen
        cfg={screens?.title}
        onNewGame={newGame}
        onContinue={() => void continueGame()}
      />
    )
  }
  if (phase === 'gameover') {
    return (
      <TextScreen
        cfg={screens?.gameOver}
        fallback="Game over"
        actions={
          <>
            <button type="button" className="screen__btn" onClick={() => void retry()}>
              Retry
            </button>
            <button type="button" className="screen__btn" onClick={() => setPhase('title')}>
              Title
            </button>
          </>
        }
      />
    )
  }
  if (phase === 'end') {
    return (
      <TextScreen
        cfg={screens?.end}
        fallback="The End"
        actions={
          <button type="button" className="screen__btn" onClick={() => setPhase('credits')}>
            Continue
          </button>
        }
      />
    )
  }
  if (phase === 'credits') {
    return <CreditsScreen cfg={screens?.credits} onDone={() => setPhase('final')} />
  }
  if (phase === 'final') {
    return <FinalScreen onDone={() => setPhase('title')} />
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
        <DialogueBox />
        <CutsceneOverlay />
        <Menu onExit={() => setPhase('title')} />
      </div>
      <GameCursor />
    </div>
  )
}
