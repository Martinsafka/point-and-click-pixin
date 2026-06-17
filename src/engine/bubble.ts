/**
 * World-space **speech bubbles** (M12.5 #6 / #18) — a typewriter line shown over a character,
 * following it. Driven by the `say` effect (one-shots) and per-NPC ambient monologues.
 *
 * Rendered in the **DOM** (ui/SpeechBubbles), not Pixi: Pixi v8's `Text` clipped the right edge
 * of lines no matter the padding / wrap settings, so the engine just runs the typewriter + tracks
 * each character's feet position and publishes it through `bubbleBridge`; the React overlay maps
 * those design-space positions to the screen (via `cameraOffset`) and lets the browser lay out +
 * wrap the text (which never clips). One bubble per actor id (a new line replaces the old).
 */

/** A live bubble as the DOM overlay needs it: the revealed text + the character's feet position
 *  in **design-space px** (the overlay maps it to the screen via the camera). */
export interface BubbleView {
  id: string
  text: string
  /** Feet position in design-space px. */
  wx: number
  wy: number
}

/** Engine → DOM bridge (a module singleton, like `cameraOffset`); the overlay reads it each frame. */
export const bubbleBridge: { items: BubbleView[] } = { items: [] }

const TYPE_CPS = 42 // characters revealed per second (matches the dialogue box feel)

interface Bubble {
  full: string
  revealed: number
  ttl: number
  getPos: () => { x: number; y: number }
}

export interface BubbleSystem {
  /** Show (or replace) the bubble for `id`, typed out then held for `ms`. `getPos` returns the
   *  character's current feet position (design px) each frame. */
  show(id: string, text: string, ms: number, getPos: () => { x: number; y: number }): void
  update(deltaMs: number): void
  destroy(): void
}

export function createBubbleSystem(): BubbleSystem {
  const bubbles = new Map<string, Bubble>()

  const publish = (): void => {
    const items: BubbleView[] = []
    for (const [id, b] of bubbles) {
      const p = b.getPos()
      items.push({ id, text: b.full.slice(0, Math.ceil(b.revealed)), wx: p.x, wy: p.y })
    }
    bubbleBridge.items = items
  }

  return {
    show(id, text, ms, getPos) {
      const existing = bubbles.get(id)
      if (existing) {
        existing.ttl = ms
        existing.getPos = getPos
        // Same line re-fired (e.g. a vision `approach` re-detecting the player): keep it alive,
        // don't restart the typewriter (it would stutter and never finish).
        if (existing.full === text) return
        existing.full = text
        existing.revealed = 0
      } else {
        bubbles.set(id, { full: text, revealed: 0, ttl: ms, getPos })
      }
      publish()
    },
    update(deltaMs) {
      for (const [id, b] of bubbles) {
        if (b.revealed < b.full.length) {
          b.revealed = Math.min(b.full.length, b.revealed + (TYPE_CPS * deltaMs) / 1000)
        } else {
          b.ttl -= deltaMs
          if (b.ttl <= 0) bubbles.delete(id)
        }
      }
      // Positions move every frame, so republish each tick.
      publish()
    },
    destroy() {
      bubbles.clear()
      bubbleBridge.items = []
    },
  }
}
