import { createStore } from 'zustand/vanilla'

/**
 * The cutscene view-model + control surface (M8). A scene drives it: when a
 * `startSequence` effect fires, the scene calls `begin(onSkip)` (input is blocked while
 * `active`), runs the steps, then `end()`. The UI overlay (letterbox + Skip) reads
 * `active` and calls `skip()`, which invokes the scene's fast-forward handler.
 *
 * Minimal + reactive on purpose — the per-step playback lives in the scene (it needs the
 * actor registry + camera), here we only hold the active flag + the skip hook.
 */
export interface SequenceStore {
  active: boolean
  /** True once the cutscene is in its skip/fast-forward (the UI disables the button). */
  skipping: boolean
  /** Start a cutscene: block input, remember how to fast-forward it. */
  begin(onSkip: () => void): void
  /** Fast-forward the running cutscene (button / Esc) — runs the scene's skip handler. */
  skip(): void
  /** End a cutscene: restore input. */
  end(): void
}

export function createSequenceStore() {
  let onSkip: (() => void) | null = null
  return createStore<SequenceStore>((set, get) => ({
    active: false,
    skipping: false,
    begin: (skipHandler) => {
      onSkip = skipHandler
      set({ active: true, skipping: false })
    },
    skip: () => {
      if (!get().active || get().skipping) return
      set({ skipping: true })
      onSkip?.()
    },
    end: () => {
      onSkip = null
      set({ active: false, skipping: false })
    },
  }))
}

/** The app's single cutscene store (driven by the scene, rendered by the CutsceneOverlay). */
export const sequenceStore = createSequenceStore()
