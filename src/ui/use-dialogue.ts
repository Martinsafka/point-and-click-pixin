import { useStore } from 'zustand'
import { dialogueStore, type DialogueStore } from '../state/dialogue'

/** React binding for the dialogue store — select conversation state into a component. */
export function useDialogue<T>(selector: (state: DialogueStore) => T): T {
  return useStore(dialogueStore, selector)
}
