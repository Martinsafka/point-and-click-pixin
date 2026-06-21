import type {
  CreditsScreenConfig,
  ScreenBg,
  ScreensConfig,
  TextAlign,
  TextScreenConfig,
  TitleButton,
} from '../data/schema'
import { editorStore } from './editor-store'
import { AssetSwap } from './AssetSwap'
import { Slider } from './Slider'

const DEFAULT_LOADING = { minMs: 5000 }
const DEFAULT_TITLE = {}
const DEFAULT_GAMEOVER: TextScreenConfig = {
  text: 'Game over',
  size: 34,
  color: '#e06b6b',
  align: 'center',
}
const DEFAULT_END: TextScreenConfig = {
  text: 'The End',
  size: 32,
  color: '#cdd6f4',
  align: 'center',
}
const DEFAULT_CREDITS: CreditsScreenConfig = {
  text: 'Made with the pixin editor\n\nThanks for playing!',
  size: 24,
  color: '#e6ebf2',
  align: 'center',
  scrollSpeed: 45,
}

function ImageField({
  label,
  value,
  onChange,
}: {
  label: string
  value?: string
  onChange: (v: string | undefined) => void
}) {
  return (
    <div className="intr-form__field">
      <span>{label}</span>
      {value && <img className="screens-thumb" src={value} alt="" />}
      <AssetSwap
        accept="image/*,.svg"
        label={value ? '⇄ Swap' : '+ Image'}
        onPick={(src) => onChange(src)}
      />
      {value && (
        <button type="button" className="logic__del" onClick={() => onChange(undefined)}>
          ✕
        </button>
      )}
    </div>
  )
}

function BgFields({
  bg,
  onChange,
}: {
  bg?: ScreenBg
  onChange: (bg: ScreenBg | undefined) => void
}) {
  const set = (patch: Partial<ScreenBg>) => {
    const next = { ...(bg ?? {}), ...patch }
    onChange(next.color || next.image ? next : undefined)
  }
  return (
    <>
      <div className="intr-form__field">
        <span>bg colour</span>
        <input
          type="color"
          value={bg?.color ?? '#0b0d12'}
          onChange={(e) => set({ color: e.target.value })}
        />
        {bg?.color && (
          <button type="button" className="logic__del" onClick={() => set({ color: undefined })}>
            ✕
          </button>
        )}
      </div>
      <ImageField label="bg image" value={bg?.image} onChange={(image) => set({ image })} />
    </>
  )
}

function TextFields({
  v,
  onChange,
  credits,
}: {
  v: TextScreenConfig | CreditsScreenConfig
  onChange: (patch: Partial<CreditsScreenConfig>) => void
  credits?: boolean
}) {
  return (
    <>
      <div className="intr-form__field intr-form__field--col">
        <span>text</span>
        <textarea
          className="logic__in"
          rows={credits ? 6 : 2}
          value={v.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
      <div className="intr-form__field">
        <span>colour</span>
        <input type="color" value={v.color} onChange={(e) => onChange({ color: e.target.value })} />
        <select
          className="logic__in"
          value={v.align}
          onChange={(e) => onChange({ align: e.target.value as TextAlign })}
        >
          <option value="left">left</option>
          <option value="center">center</option>
          <option value="right">right</option>
        </select>
      </div>
      <Slider
        label="size"
        value={v.size}
        min={12}
        max={96}
        onChange={(size) => onChange({ size })}
      />
      {credits && (
        <Slider
          label="scroll /s"
          value={(v as CreditsScreenConfig).scrollSpeed}
          min={10}
          max={150}
          onChange={(scrollSpeed) => onChange({ scrollSpeed })}
        />
      )}
    </>
  )
}

function ButtonFields({
  label,
  b,
  onChange,
}: {
  label: string
  b?: TitleButton
  onChange: (b: TitleButton) => void
}) {
  const set = (patch: Partial<TitleButton>) => onChange({ ...(b ?? {}), ...patch })
  const mode = b?.mode ?? 'text'
  return (
    <>
      <div className="intr-form__field">
        <span>{label}</span>
        <select
          className="logic__in"
          value={mode}
          onChange={(e) => set({ mode: e.target.value as 'text' | 'image' })}
        >
          <option value="text">text</option>
          <option value="image">image</option>
        </select>
      </div>
      {mode === 'text' ? (
        <div className="intr-form__field">
          <span>label</span>
          <input
            className="logic__in"
            placeholder={label}
            value={b?.text ?? ''}
            onChange={(e) => set({ text: e.target.value || undefined })}
          />
        </div>
      ) : (
        <ImageField label="button image" value={b?.image} onChange={(image) => set({ image })} />
      )}
    </>
  )
}

/**
 * The Project tab's **Screens** section (M11 4b) — author the full-screen game screens:
 * loading / title / game-over / end / credits. Each has an enable toggle; backgrounds take a
 * colour or an uploaded image; the title's buttons are styled text or an uploaded image.
 */
export function ScreensEditor({ screens }: { screens: ScreensConfig | undefined }) {
  const sc = screens ?? {}
  const set = <K extends keyof ScreensConfig>(key: K, value: ScreensConfig[K] | undefined) =>
    editorStore.getState().setScreens({ ...sc, [key]: value })
  const toggle =
    <K extends keyof ScreensConfig>(key: K, def: ScreensConfig[K]) =>
    (on: boolean) =>
      set(key, on ? def : undefined)

  const title = sc.title
  const patchTitle = (patch: Partial<NonNullable<ScreensConfig['title']>>) =>
    set('title', { ...(title ?? {}), ...patch })

  return (
    <div className="screens-editor">
      {/* Loading */}
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!sc.loading}
          onChange={(e) => toggle('loading', DEFAULT_LOADING)(e.target.checked)}
        />
        loading screen (first visit only)
      </label>
      {sc.loading && (
        <>
          <BgFields bg={sc.loading.bg} onChange={(bg) => set('loading', { ...sc.loading, bg })} />
          <ImageField
            label="logo"
            value={sc.loading.logo}
            onChange={(logo) => set('loading', { ...sc.loading, logo })}
          />
          <Slider
            label="min sec"
            value={(sc.loading.minMs ?? 5000) / 1000}
            min={0}
            max={12}
            step={0.5}
            onChange={(s) => set('loading', { ...sc.loading, minMs: s * 1000 })}
          />
        </>
      )}

      {/* Title */}
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!title}
          onChange={(e) => toggle('title', DEFAULT_TITLE)(e.target.checked)}
        />
        title screen
      </label>
      {title && (
        <>
          <BgFields bg={title.bg} onChange={(bg) => patchTitle({ bg })} />
          <ImageField label="logo" value={title.logo} onChange={(logo) => patchTitle({ logo })} />
          <div className="intr-form__field">
            <span>heading</span>
            <input
              className="logic__in"
              placeholder="game name (or use a logo)"
              value={title.heading ?? ''}
              onChange={(e) => patchTitle({ heading: e.target.value || undefined })}
            />
            <input
              type="color"
              value={title.headingColor ?? '#e8b552'}
              onChange={(e) => patchTitle({ headingColor: e.target.value })}
            />
          </div>
          <Slider
            label="heading px"
            value={title.headingSize ?? 32}
            min={16}
            max={96}
            onChange={(headingSize) => patchTitle({ headingSize })}
          />
          <div className="intr-form__field">
            <span>tagline</span>
            <input
              className="logic__in"
              value={title.tagline ?? ''}
              onChange={(e) => patchTitle({ tagline: e.target.value || undefined })}
            />
          </div>
          <div className="intr-form__field">
            <span>buttons</span>
            <input
              type="color"
              value={title.buttonColor ?? '#cdd6f4'}
              onChange={(e) => patchTitle({ buttonColor: e.target.value })}
            />
          </div>
          <Slider
            label="button px"
            value={title.buttonFontSize ?? 14}
            min={10}
            max={48}
            onChange={(buttonFontSize) => patchTitle({ buttonFontSize })}
          />
          <ButtonFields
            label="New game"
            b={title.newGame}
            onChange={(b) => patchTitle({ newGame: b })}
          />
          <ButtonFields
            label="Continue"
            b={title.continue}
            onChange={(b) => patchTitle({ continue: b })}
          />
        </>
      )}

      {/* Game over */}
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!sc.gameOver}
          onChange={(e) => toggle('gameOver', DEFAULT_GAMEOVER)(e.target.checked)}
        />
        game over screen
      </label>
      {sc.gameOver && (
        <>
          <BgFields
            bg={sc.gameOver.bg}
            onChange={(bg) => set('gameOver', { ...sc.gameOver!, bg })}
          />
          <TextFields
            v={sc.gameOver}
            onChange={(patch) => set('gameOver', { ...sc.gameOver!, ...patch })}
          />
        </>
      )}

      {/* End */}
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!sc.end}
          onChange={(e) => toggle('end', DEFAULT_END)(e.target.checked)}
        />
        end screen
      </label>
      {sc.end && (
        <>
          <BgFields bg={sc.end.bg} onChange={(bg) => set('end', { ...sc.end!, bg })} />
          <TextFields v={sc.end} onChange={(patch) => set('end', { ...sc.end!, ...patch })} />
        </>
      )}

      {/* Credits */}
      <label className="logic__chk">
        <input
          type="checkbox"
          checked={!!sc.credits}
          onChange={(e) => toggle('credits', DEFAULT_CREDITS)(e.target.checked)}
        />
        credits screen
      </label>
      {sc.credits && (
        <>
          <BgFields bg={sc.credits.bg} onChange={(bg) => set('credits', { ...sc.credits!, bg })} />
          <TextFields
            v={sc.credits}
            credits
            onChange={(patch) => set('credits', { ...sc.credits!, ...patch })}
          />
        </>
      )}

      <p className="intr-form__note">
        Trigger game over / end from a dialogue or trigger with the <strong>gameOver</strong> /{' '}
        <strong>endGame</strong> effect. The final &quot;made with&quot; logo is fixed (added at
        release).
      </p>
    </div>
  )
}
