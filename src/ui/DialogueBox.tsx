import { useEffect, useState } from 'react'
import { dialogueStore } from '../state/dialogue'
import { useDialogue } from './use-dialogue'
import { speakBlip } from '../audio/voice'

/** Chars per second the typewriter reveals a line at. */
const TYPE_CPS = 55

/**
 * The dialogue panel (DOM overlay over the canvas). Types the current line out;
 * clicking the box completes the reveal, then either advances a click-to-continue
 * line or waits for a choice. Choices appear once the line is fully revealed. The
 * conversation state + flow live in `dialogueStore`; this only renders + reveals.
 */
export function DialogueBox() {
  const active = useDialogue((s) => s.active)
  const speaker = useDialogue((s) => s.speaker)
  const line = useDialogue((s) => s.line)
  const choices = useDialogue((s) => s.choices)
  const voice = useDialogue((s) => s.voice)
  const [revealed, setRevealed] = useState(0)
  const [typing, setTyping] = useState(line)
  // Reset the reveal when the line changes — a render-phase adjustment (React re-runs
  // before committing, so there's no stale flash), not a setState inside an effect.
  if (typing !== line) {
    setTyping(line)
    setRevealed(0)
  }

  // Reveal the line one char at a time at a steady rate.
  useEffect(() => {
    if (!line) return
    const id = setInterval(() => {
      setRevealed((n) => {
        if (n >= line.length) {
          clearInterval(id)
          return n
        }
        return n + 1
      })
    }, 1000 / TYPE_CPS)
    return () => clearInterval(id)
  }, [line])

  // Blip the voice as each (non-space) character is revealed — throttled in speakBlip.
  useEffect(() => {
    if (!active) return
    const ch = line[revealed - 1]
    if (ch && !/\s/.test(ch)) speakBlip(voice ?? undefined)
  }, [revealed, active, line, voice])

  if (!active) return null
  const done = revealed >= line.length

  const onBoxClick = () => {
    if (!done) {
      setRevealed(line.length) // first click completes the reveal
      return
    }
    if (!choices) dialogueStore.getState().advance() // click-to-continue
  }

  return (
    <div className="dialogue" onClick={onBoxClick}>
      <button
        type="button"
        className="dialogue__skip"
        title="Skip conversation"
        onClick={(e) => {
          e.stopPropagation()
          dialogueStore.getState().end()
        }}
      >
        Skip ⏭
      </button>
      {speaker && <div className="dialogue__speaker">{speaker}</div>}
      <p className="dialogue__line">{line.slice(0, revealed)}</p>
      {done && choices && choices.length > 0 && (
        <ul className="dialogue__choices">
          {choices.map((c) => (
            <li key={c.index}>
              <button
                type="button"
                className="dialogue__choice"
                onClick={(e) => {
                  e.stopPropagation()
                  dialogueStore.getState().choose(c.index)
                }}
              >
                {c.text}
              </button>
            </li>
          ))}
        </ul>
      )}
      {done && !choices && <div className="dialogue__continue">▶</div>}
    </div>
  )
}
