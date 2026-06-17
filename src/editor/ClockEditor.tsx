import type { ClockConfig } from '../data/schema'
import { editorStore } from './editor-store'
import { Slider } from './Slider'
import { minutesToHHMM, hhmmToMinutes } from './time-format'

const DEFAULT_CLOCK: ClockConfig = { dayLengthSec: 120, startMinutes: 480 }

/**
 * The Game logic tab's **Clock** section (M12c time scheduler). Enables a game clock — a
 * time-of-day that advances over real time — and sets its day length + start time. A routine
 * transition can then gate on a time window (authored on the edge in the NPC routine graph).
 */
export function ClockEditor({ clock }: { clock: ClockConfig | undefined }) {
  const set = (patch: Partial<ClockConfig>) =>
    editorStore.getState().setClock({ ...(clock ?? DEFAULT_CLOCK), ...patch })

  return (
    <>
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!clock}
          onChange={(e) =>
            editorStore.getState().setClock(e.target.checked ? DEFAULT_CLOCK : undefined)
          }
        />
        game clock (time-of-day)
      </label>
      {clock && (
        <>
          <Slider
            label="day length (s)"
            value={clock.dayLengthSec}
            min={10}
            max={1440}
            step={5}
            onChange={(dayLengthSec) => set({ dayLengthSec })}
          />
          <div className="intr-form__field">
            <span>start time</span>
            <input
              type="time"
              className="logic__in"
              value={minutesToHHMM(clock.startMinutes ?? 0)}
              onChange={(e) => set({ startMinutes: hhmmToMinutes(e.target.value) ?? 0 })}
            />
          </div>
          <p className="intr-form__note">
            One in-game day passes every {clock.dayLengthSec}s. Gate a routine transition on a time
            window (NPC routine → edge → from/to time). Scrub the live time in the{' '}
            <strong>World</strong> window.
          </p>
        </>
      )}
    </>
  )
}
