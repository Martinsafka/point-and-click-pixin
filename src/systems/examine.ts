import { checkCondition, type StoryState } from './conditions'
import type { ExamineLine } from '../data/schema'

/**
 * Resolve the "look at" text to show (M12.5 #1b): the first conditional `ExamineLine` whose
 * `when` passes wins, else the plain `base`. Returns undefined when nothing applies.
 */
export function resolveExamine(
  base: string | undefined,
  rules: ExamineLine[] | undefined,
  state: StoryState,
): string | undefined {
  if (rules) {
    for (const r of rules) {
      if (!r.when || checkCondition(state, r.when)) return r.text
    }
  }
  return base
}
