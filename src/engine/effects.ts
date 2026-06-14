import type { Effect } from '../data/schema'
import type { Character } from '../entities/character'

/**
 * The live characters in a scene, addressable by id — `'player'` for the
 * protagonist, the cast id for each NPC. Engine effects (`playAnim` / `wait`)
 * resolve their target actor through this map. The scene owns it; the dialogue
 * runtime (4b) will share the same registry so a dialog's effects reach the cast.
 */
export type ActorRegistry = ReadonlyMap<string, Character>

/** The slice of the story store engine effects forward state effects to. */
interface EffectStore {
  getState(): { run(effects: readonly Effect[]): void }
}

/**
 * Runs a batch of Effects from a trigger, a click, or (later) a dialogue node.
 * Engine effects act on the scene's live actors:
 *   - `playSound` plays an audio clip;
 *   - `playAnim` plays a one-shot on its `target` (default the player);
 *   - `wait` lingers the **subject** — the actor the batch is "about" (a trigger's
 *     enterer, a dialogue partner) — for `ms`, optionally looping `anim`. The player
 *     is never paused (its subject id is `'player'`).
 * Every effect is also forwarded to the story store, where the engine kinds are
 * no-ops and the state effects (flags / inventory / scene) apply. Keeping transient
 * engine actions out of the discrete state is deliberate (see architecture.md).
 */
export function runEffects(
  effects: readonly Effect[],
  actors: ActorRegistry,
  store: EffectStore,
  subject = 'player',
): void {
  for (const e of effects) {
    if (e.kind === 'playSound') {
      void import('../audio/audio').then((m) => m.playClip(e.sound))
    } else if (e.kind === 'playAnim') {
      actors.get(e.target ?? 'player')?.playOnce(e.action)
    } else if (e.kind === 'wait') {
      if (subject !== 'player') actors.get(subject)?.pauseFor(e.ms, e.anim)
    } else if (e.kind === 'setStance') {
      actors.get(e.target ?? 'player')?.setStance(e.action)
    }
  }
  store.getState().run(effects)
}
