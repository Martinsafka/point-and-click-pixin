import { createStore } from 'zustand/vanilla'
import type { Condition, Dialog, DialogNodeId, Effect, VoiceConfig } from '../data/schema'

/** A reply offered at a choice node (`index` points into the node's original `choices`). */
export interface DialogueChoiceView {
  text: string
  index: number
}

/** The dialogue view-model the UI renders. */
export interface DialogueState {
  active: boolean
  /** Display name of the current speaker (resolved), or null for none. */
  speaker: string | null
  /** Full text of the current line (the UI types it out). */
  line: string
  /** Replies at a choice node, or null for a click-to-continue line. */
  choices: DialogueChoiceView[] | null
  /** The current speaker's voice (blips played while the line types), or null. */
  voice: VoiceConfig | null
  /** The conversation partner's actor id (the NPC being talked to), or null. Lets the
   *  routine runner pause that NPC's schedule while it's mid-dialogue. */
  partner: string | null
}

/**
 * Scene-supplied context for a running conversation — how the dialogue reaches the
 * world (effects over the actor registry, conditions, names) and what to do on end.
 * The scene fills this in when it starts a dialogue (click an NPC / `startDialog`).
 */
export interface DialogueDeps {
  dialog: Dialog
  /** Run a node / choice's effects (engine + state) — the scene's `run`. */
  run: (effects: readonly Effect[], subject?: string) => void
  /** Evaluate a `when` (branch / choice gating) against the live story state. */
  check: (cond: Condition) => boolean
  /** Resolve a `speaker` id (or undefined → the partner) to a display name. */
  nameOf: (speaker: string | undefined) => string
  /** Resolve a `speaker` id (or undefined → the partner) to its voice (or none). */
  voiceOf: (speaker: string | undefined) => VoiceConfig | undefined
  /** The conversation partner's actor id — the effect subject + default speaker. */
  subject: string
  /** Called once when the conversation ends (e.g. the scene resumes the NPC). */
  onEnd: () => void
}

export interface DialogueStore extends DialogueState {
  /** Start a conversation (ending any active one first). */
  begin(deps: DialogueDeps): void
  /** Advance a click-to-continue line (no-op at a choice node). */
  advance(): void
  /** Pick a reply by its original index. */
  choose(index: number): void
  /** End the conversation (runs the partner's resume via `onEnd`). */
  end(): void
}

const IDLE: DialogueState = {
  active: false,
  speaker: null,
  line: '',
  choices: null,
  voice: null,
  partner: null,
}
const MAX_HOPS = 50 // guards branch / passthrough redirect loops

export function createDialogueStore() {
  // Per-conversation context + cursor, kept out of the reactive snapshot.
  let deps: DialogueDeps | null = null
  let nodeId: DialogNodeId | null = null

  return createStore<DialogueStore>((set) => {
    const finish = (): void => {
      const d = deps
      deps = null
      nodeId = null
      set({ ...IDLE })
      d?.onEnd()
    }

    /** Enter a node: run its effects, follow any branch redirect, then present its
     *  line + choices (or fall through a pure router / effects node). */
    const present = (id: DialogNodeId, hops: number): void => {
      const d = deps
      if (!d || hops > MAX_HOPS) {
        finish()
        return
      }
      const node = d.dialog.nodes[id]
      if (!node) {
        finish()
        return
      }
      nodeId = id
      // Conditional router first (state-driven openings) — evaluated against the
      // *incoming* state, so a node can route before its own effects run. The first
      // matching branch redirects, skipping this node's effects / text.
      if (node.branch) {
        for (const b of node.branch) {
          if (!b.when || d.check(b.when)) {
            present(b.to, hops + 1)
            return
          }
        }
      }
      if (node.effects) d.run(node.effects, d.subject)
      // Nothing to show (a pure router / effects node) → fall through.
      if (!node.text && !node.choices) {
        if (node.next) present(node.next, hops + 1)
        else finish()
        return
      }
      const choices = node.choices
        ? node.choices
            .map((c, index) => ({ c, index }))
            .filter(({ c }) => !c.when || d.check(c.when))
            .map(({ c, index }) => ({ text: c.text, index }))
        : null
      set({
        active: true,
        speaker: d.nameOf(node.speaker),
        line: node.text ?? '',
        choices,
        voice: d.voiceOf(node.speaker) ?? null,
        partner: d.subject,
      })
    }

    return {
      ...IDLE,
      begin(d) {
        if (deps) finish() // end any active conversation first (resumes its NPC)
        deps = d
        present(d.dialog.start, 0)
      },
      advance() {
        if (!deps || nodeId === null) return
        const node = deps.dialog.nodes[nodeId]
        if (node?.choices) return // a choice node only advances via choose()
        if (node?.next) present(node.next, 0)
        else finish()
      },
      choose(index) {
        if (!deps || nodeId === null) return
        const choice = deps.dialog.nodes[nodeId]?.choices?.[index]
        if (!choice) return
        if (choice.effects) deps.run(choice.effects, deps.subject)
        if (choice.next) present(choice.next, 0)
        else finish()
      },
      end() {
        if (deps) finish()
      },
    }
  })
}

/** The app's single dialogue store (driven by the scene, rendered by the DialogueBox). */
export const dialogueStore = createDialogueStore()
