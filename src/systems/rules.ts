// The global rules engine (M12a). A rule is a game-wide reactive `when → then`, evaluated
// on **every** story-state change rather than attached to one object — the cross-cutting
// "event graph" that orchestrates logic / NPCs (e.g. has all three keys → open the gate →
// move the guard away). It sits above the per-NPC routines (systems/routine.ts) and shares
// the same flag / condition / effect vocabulary.
//
// Scope: `then` are **state** effects (run via `store.run`); engine effects are inert in the
// pure evaluator, so they're a follow-up (they need the mounted scene's dispatch).

import { checkCondition, type StoryState, type StoryStore } from './conditions'
import type { GameRule } from '../data/schema'

/** The store surface the runner needs: read the state + run effects, and react to changes. */
export interface RulesStore {
  getState(): StoryStore
  subscribe(listener: () => void): () => void
}

/** A running rules engine; `destroy` on teardown. */
export interface RulesRunner {
  destroy(): void
}

/** Guard against a cycle of rules that keep flipping state (mirrors the routine runner). */
const MAX_HOPS = 32

/** A cheap signature of the discrete state — used only to detect a fixpoint (no more changes)
 *  within an evaluation pass, so an always-true idempotent rule doesn't burn every hop. */
function stateSig(s: StoryState): string {
  return JSON.stringify([
    s.currentScene,
    s.flags,
    s.inventory,
    s.visited,
    s.npcScene,
    s.npcNode,
    s.screen,
  ])
}

/**
 * Drive the game-wide rules. On creation it evaluates once (rules whose `when` already
 * holds fire), then re-evaluates on every story-state change (a store subscription). Each
 * evaluation runs a full pass of all eligible rules and repeats until the state stops
 * changing (a fixpoint), capped by `MAX_HOPS` so a flip-flopping cycle can't hang. `once`
 * rules fire at most once (tracked in a Set). Returns a `destroy` that unsubscribes.
 */
export function createRulesRunner(rules: readonly GameRule[], store: RulesStore): RulesRunner {
  if (rules.length === 0) return { destroy: () => {} }

  const fired = new Set<GameRule>() // rules with `once` that have already fired
  // Re-entrancy guard: running a rule's `then` calls `store.run`, which fires our own
  // subscription — we ignore that nested call and let the outer pass loop instead.
  let running = false

  const evaluate = () => {
    if (running) return
    running = true
    try {
      for (let hop = 0; hop < MAX_HOPS; hop += 1) {
        const before = stateSig(store.getState())
        for (const rule of rules) {
          if (rule.once && fired.has(rule)) continue
          if (!checkCondition(store.getState(), rule.when)) continue
          if (rule.then.length) store.getState().run(rule.then)
          if (rule.once) fired.add(rule)
        }
        // No rule changed the state this pass → we've reached a fixpoint, stop.
        if (stateSig(store.getState()) === before) break
      }
    } finally {
      running = false
    }
  }

  evaluate() // seed: fire any rule already satisfied at startup
  const unsubscribe = store.subscribe(evaluate)

  return {
    destroy() {
      unsubscribe()
      fired.clear()
    },
  }
}
