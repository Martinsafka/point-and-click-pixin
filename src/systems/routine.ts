// The per-NPC routine runner (M7 step 6). A routine is a small state machine that
// moves ONE NPC between scenes (and along in-scene paths) as story state + time
// advance. It runs **globally** — independent of which scene is mounted — so an NPC
// can travel while the player is elsewhere. The active node per NPC lives in story
// state (`npcNode`); the mounted scene reads it to pick the NPC's in-scene path and to
// show/hide the NPC by its synced `npcScene` location.
//
// Scope: transitions are condition- and/or time-driven (`when` / `after` ms in node).
// The full time-of-day scheduler stays M12.

import { checkCondition, inTimeWindow, type StoryState, type StoryStore } from './conditions'
import type { NpcDef, NpcId, Routine, RoutineNode } from '../data/schema'

/** Find a routine node by id (undefined id / missing node → undefined). */
export function routineNode(routine: Routine, id: string | undefined): RoutineNode | undefined {
  return id ? routine.nodes.find((n) => n.id === id) : undefined
}

/**
 * The first transition out of `from` that is eligible now: its `when` passes (if set),
 * `after` ms have elapsed in the node (if set), (`onArrive`) the node's path has finished
 * (`arrived`), and its time-of-day window contains `state.clockMinutes` (if set). Dangling
 * edges (unknown `to`) are skipped. Returns the target node id, or null when the NPC stays put.
 */
export function nextRoutineNode(
  routine: Routine,
  from: string,
  elapsedMs: number,
  state: StoryState,
  arrived: boolean,
): string | null {
  for (const e of routine.edges) {
    if (e.from !== from) continue
    if (e.onArrive && !arrived) continue
    if (e.after !== undefined && elapsedMs < e.after) continue
    if (!inTimeWindow(state.clockMinutes, e.fromTime, e.toTime)) continue
    if (e.when && !checkCondition(state, e.when)) continue
    if (!routine.nodes.some((n) => n.id === e.to)) continue
    return e.to
  }
  return null
}

/**
 * The bridge from the mounted scene (which drives NPC movement) to the global routine
 * runner: the scene calls `notify(npcId)` when a routine NPC finishes a `once` path, and
 * the active runner records it so an `onArrive` edge can fire. A module singleton (like
 * `sceneHit` / `cameraOffset`) since the scene and the runner don't reference each other.
 */
export const routineArrival: { notify: (npcId: NpcId) => void } = { notify: () => {} }

/** The store surface the runner needs (the full story store, read + the routine actions). */
export interface RoutineStore {
  getState(): StoryStore
}

/** Timing of an NPC's current node `once` path — so the runner can complete an `onArrive`
 *  edge by the path's estimated walk time even off-scene (persistent routines). */
export interface RoutinePathInfo {
  /** ms to walk the current node's `once` path at the NPC's speed. */
  durationMs: number
  /** Is the node's scene currently mounted? On-scene the visual walk fires arrival (precise),
   *  so the runner only times it out off-scene. */
  onScene: boolean
}

/** A running routine engine; `tick` each frame, `destroy` on teardown. */
export interface RoutineRunner {
  tick(deltaMs: number): void
  /** Progress 0..1 along the NPC's current `once` path (0 when none) — the mounted scene
   *  seeds the NPC mid-path so it isn't restarted from the start. */
  progressOf(npc: NpcId): number
  destroy(): void
}

/** Guard against an infinite chain of instant (no-`when`, no-`after`) transitions. */
const MAX_HOPS = 32

/**
 * Drive every cast NPC that has a routine. On creation it **seeds** each routine NPC's
 * active node to the routine's `start` (unless already set — e.g. from a loaded save),
 * syncing its scene + running the start node's `onEnter`. Then each `tick` advances any
 * NPC whose active node has an eligible outgoing transition.
 */
export function createRoutineRunner(
  cast: Record<NpcId, NpcDef>,
  store: RoutineStore,
  /** True while `npc` is busy (e.g. mid-dialogue) — its routine is frozen, so a timed /
   *  conditional transition can't move it away during a conversation. */
  isBusy: (npc: NpcId) => boolean = () => false,
  /** Timing of the NPC's current `once` path (null = no finite path). Lets an `onArrive`
   *  edge complete by the estimated walk time when the scene isn't mounted, so routines run
   *  off-scene; also drives `progressOf` for mid-path render seeding. */
  pathInfo: (npc: NpcId) => RoutinePathInfo | null = () => null,
): RoutineRunner {
  // NPCs with a routine, paired with it; ms elapsed in each one's current node; whether
  // the current node's path has finished (set via `routineArrival.notify` from the scene).
  const driven = Object.values(cast).filter((n): n is NpcDef & { routine: Routine } => !!n.routine)
  const elapsed = new Map<NpcId, number>()
  const arrived = new Set<NpcId>()
  routineArrival.notify = (npc) => arrived.add(npc)

  /** Move an NPC into a node: set its active node + synced scene, run `onEnter` (state
   *  effects), reset the in-node timer + arrival flag. */
  const enter = (npc: NpcId, node: RoutineNode) => {
    store.getState().enterRoutine(npc, node.id, node.scene)
    if (node.onEnter?.length) store.getState().run(node.onEnter)
    elapsed.set(npc, 0)
    arrived.delete(npc)
  }

  // Seed: enter the start node for any routine NPC not already positioned (fresh game);
  // a loaded save keeps its `npcNode`, so we only restart the timer there.
  for (const npc of driven) {
    const state = store.getState()
    const current = state.npcNode?.[npc.id]
    const node = routineNode(npc.routine, current)
    if (!node) {
      const start = routineNode(npc.routine, npc.routine.start)
      if (start) enter(npc.id, start)
    } else {
      elapsed.set(npc.id, 0)
    }
  }

  return {
    tick(deltaMs) {
      for (const npc of driven) {
        // Frozen while busy (mid-dialogue): don't accrue node time or take transitions,
        // so talking to an NPC can't be cut short by its own schedule moving it away.
        if (isBusy(npc.id)) continue
        const e = (elapsed.get(npc.id) ?? 0) + deltaMs
        elapsed.set(npc.id, e)
        // Off-scene path arrival: a `once` path completes after its estimated walk time even
        // when its scene isn't mounted, so `onArrive` routines progress without the player
        // present. On-scene the mounted scene's visual walk fires arrival instead (precise).
        if (!arrived.has(npc.id)) {
          const info = pathInfo(npc.id)
          if (info && !info.onScene && e >= info.durationMs) arrived.add(npc.id)
        }
        // Advance through any chain of eligible transitions this frame (instant edges
        // resolve immediately; capped so a cycle can't hang the loop).
        for (let hop = 0; hop < MAX_HOPS; hop += 1) {
          const state = store.getState()
          const current = state.npcNode?.[npc.id]
          if (current === undefined) break
          const to = nextRoutineNode(
            npc.routine,
            current,
            elapsed.get(npc.id) ?? 0,
            state,
            arrived.has(npc.id),
          )
          if (to === null) break
          const node = routineNode(npc.routine, to)
          if (!node) break
          enter(npc.id, node)
        }
      }
    },
    progressOf(npc) {
      const info = pathInfo(npc)
      if (!info || info.durationMs <= 0) return 0
      return Math.min(1, (elapsed.get(npc) ?? 0) / info.durationMs)
    },
    destroy() {
      elapsed.clear()
      arrived.clear()
      routineArrival.notify = () => {}
    },
  }
}
