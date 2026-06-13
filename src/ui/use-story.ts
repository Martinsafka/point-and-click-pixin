import { useStore } from 'zustand'
import { storyStore } from '../state/story'
import type { StoryStore } from '../state/story'

/** React binding for the story store — select discrete state into a component. */
export function useStory<T>(selector: (state: StoryStore) => T): T {
  return useStore(storyStore, selector)
}
