import { useEffect } from 'react'
import { sequenceStore } from '../state/sequence'
import { useSequence } from './use-sequence'

/**
 * The cutscene chrome (M8): cinematic letterbox bars + a **Skip** affordance while a
 * sequence plays. Input to the world is already blocked in the scene (`sequenceStore`);
 * this only frames the cutscene and lets the player fast-forward it (button or Esc).
 */
export function CutsceneOverlay() {
  const active = useSequence((s) => s.active)
  const skipping = useSequence((s) => s.skipping)

  // Esc skips the cutscene (only while one is playing).
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        sequenceStore.getState().skip()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  if (!active) return null
  return (
    <div className="cutscene">
      <div className="cutscene__bar cutscene__bar--top" />
      <div className="cutscene__bar cutscene__bar--bottom" />
      <button
        type="button"
        className="cutscene__skip"
        disabled={skipping}
        onClick={() => sequenceStore.getState().skip()}
      >
        {skipping ? 'Skipping…' : 'Skip ⏭'}
      </button>
    </div>
  )
}
