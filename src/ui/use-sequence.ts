import { useStore } from 'zustand'
import { sequenceStore, type SequenceStore } from '../state/sequence'

/** React binding for the cutscene store — select cutscene state into a component. */
export function useSequence<T>(selector: (state: SequenceStore) => T): T {
  return useStore(sequenceStore, selector)
}
