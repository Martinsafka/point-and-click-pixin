import { createStore } from 'zustand/vanilla'
import type { StoryStoreApi } from '../state/story'

/**
 * Bridges the editor's **live preview** story store to the editor UI (ME.5). When the preview
 * runs the real world (`ScenePreview` in **Live** mode), it publishes that scene-host's story
 * store here; the **World** launcher window reads it to drive the world — set flags, give /
 * take items, jump scenes — and the live world reacts where it already does (gated layers /
 * NPCs / lights, scene swaps). `null` when the preview is in the static **Edit** mode.
 */
export const previewBridge = createStore<{ store: StoryStoreApi | null }>(() => ({ store: null }))

export function setPreviewStore(store: StoryStoreApi | null): void {
  previewBridge.setState({ store })
}
