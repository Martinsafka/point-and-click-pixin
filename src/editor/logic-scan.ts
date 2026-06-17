import type { Condition, Effect, GameDoc } from '../data/schema'

/**
 * The logic-overview graph (M12b) is **auto-generated** by scanning the whole `GameDoc` for
 * everything that touches a flag — the "flag web". This module is the pure scanner: it
 * produces a list of **logic elements** (rules / interactables / dialogues / cutscenes / NPCs
 * / scene gates), each tagged with the flags it **reads** (in a `Condition`) and **writes**
 * (a `setFlag` effect). `LogicGraph.tsx` lays this out as flag nodes wired to their writers /
 * readers. Read-only — it never mutates the doc.
 */

export type LogicKind =
  | 'rule'
  | 'interactable'
  | 'trigger'
  | 'exit'
  | 'dialog'
  | 'cutscene'
  | 'npc'
  | 'scene'
  | 'gate'

/** One element of game logic that reads and/or writes flags. */
export interface LogicElement {
  /** Stable unique node id. */
  key: string
  /** Display label. */
  label: string
  kind: LogicKind
  /** Flags gated on (in a `Condition`). */
  reads: string[]
  /** Flags set (a `setFlag` effect). */
  writes: string[]
}

export interface LogicScan {
  /** Logic elements that touch ≥ 1 flag. */
  elements: LogicElement[]
  /** Every flag id seen anywhere (writes / reads / `initialFlags`), sorted. */
  flags: string[]
}

/** Collect the flags a Condition gates on (recursing all / any / not). */
function condFlags(c: Condition | undefined, out: Set<string>): void {
  if (!c) return
  if (c.kind === 'flag') {
    if (c.flag) out.add(c.flag)
  } else if (c.kind === 'all' || c.kind === 'any') {
    c.of.forEach((x) => condFlags(x, out))
  } else if (c.kind === 'not') {
    condFlags(c.of, out)
  }
}

/** The flags a list of effects sets. */
function setFlags(effects: Effect[] | undefined): string[] {
  return (effects ?? []).flatMap((e) => (e.kind === 'setFlag' && e.flag ? [e.flag] : []))
}

/** Scan the whole document into the flag web (pure; safe to call on every render). */
export function scanLogic(doc: GameDoc): LogicScan {
  const flags = new Set<string>()
  const elements: LogicElement[] = []

  const reads = (conds: (Condition | undefined)[]): string[] => {
    const out = new Set<string>()
    conds.forEach((c) => condFlags(c, out))
    return [...out]
  }
  const add = (key: string, label: string, kind: LogicKind, r: string[], w: string[]): void => {
    const rs = [...new Set(r.filter(Boolean))]
    const ws = [...new Set(w.filter(Boolean))]
    rs.forEach((f) => flags.add(f))
    ws.forEach((f) => flags.add(f))
    if (rs.length || ws.length) elements.push({ key, label, kind, reads: rs, writes: ws })
  }

  Object.keys(doc.initialFlags ?? {}).forEach((f) => flags.add(f))

  // Global rules (M12a)
  ;(doc.rules ?? []).forEach((rule, i) => {
    const id = rule.id ?? `#${i + 1}`
    add(`rule:${rule.id ?? i}`, `rule ${id}`, 'rule', reads([rule.when]), setFlags(rule.then))
  })

  // Per-scene: interactables / triggers / exits, the scene's gated visuals + onEnter, placements
  for (const [sid, sc] of Object.entries(doc.scenes)) {
    sc.interactables.forEach((it) => {
      const r = reads([it.when])
      const w: string[] = []
      if ('effects' in it) w.push(...setFlags(it.effects))
      if ('uses' in it) (it.uses ?? []).forEach((u) => w.push(...setFlags(u.effects)))
      if (it.kind === 'trigger') w.push(...setFlags(it.exitEffects))
      const kind: LogicKind =
        it.kind === 'trigger' ? 'trigger' : it.kind === 'exit' ? 'exit' : 'interactable'
      add(`it:${sid}:${it.id}`, `${sid}/${it.id}`, kind, r, w)
    })

    add(`scene:${sid}`, `${sid}: scene`, 'scene', reads([sc.ambient?.when]), setFlags(sc.onEnter))

    const gate = reads([
      ...(sc.weather ?? []).map((w) => w.when),
      ...(sc.lights ?? []).map((l) => l.when),
      ...(sc.emitters ?? []).map((e) => e.when),
      ...sc.layers.map((l) => l.when),
      sc.lightning?.when,
    ])
    add(`gate:${sid}`, `${sid}: visuals`, 'gate', gate, [])
    ;(sc.npcs ?? []).forEach((p) => {
      const r = reads([p.when, p.path?.when, ...(p.paths ?? []).map((pa) => pa.when)])
      add(`place:${sid}:${p.npc}`, `${sid}: ${p.npc}`, 'npc', r, [])
    })
  }

  // Dialogue trees (aggregated per dialog)
  for (const [did, dlg] of Object.entries(doc.dialogs ?? {})) {
    const r: string[] = []
    const w: string[] = []
    for (const node of Object.values(dlg.nodes)) {
      w.push(...setFlags(node.effects))
      ;(node.branch ?? []).forEach((b) => r.push(...reads([b.when])))
      ;(node.choices ?? []).forEach((c) => {
        r.push(...reads([c.when]))
        w.push(...setFlags(c.effects))
      })
    }
    add(`dialog:${did}`, `dialog ${did}`, 'dialog', r, w)
  }

  // Cutscenes (effects steps only set flags)
  for (const [seqId, seq] of Object.entries(doc.sequences ?? {})) {
    const w = seq.steps.flatMap((st) => (st.kind === 'effects' ? setFlags(st.effects) : []))
    add(`seq:${seqId}`, `cutscene ${seqId}`, 'cutscene', [], w)
  }

  // NPC definitions: vision / dialog gate / routine
  for (const [nid, npc] of Object.entries(doc.npcs ?? {})) {
    const r = reads([
      npc.dialogWhen,
      npc.vision?.unless,
      ...(npc.routine?.edges ?? []).map((e) => e.when),
    ])
    const w = [
      ...setFlags(npc.vision?.effects),
      ...(npc.routine?.nodes ?? []).flatMap((n) => setFlags(n.onEnter)),
    ]
    add(`npc:${nid}`, `npc ${nid}`, 'npc', r, w)
  }

  return { elements, flags: [...flags].sort() }
}
