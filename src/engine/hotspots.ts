import type { CursorKind } from '../data/schema'

/**
 * A tiny bridge (like `cameraOffset`) the mounted scene publishes so the DOM cursor —
 * which can't see moving entities — can ask which clickable NPC (if any) is under a
 * viewport point, and show the matching icon (e.g. `talk`). `kindAt` returns the
 * cursor kind for the top NPC at the point, or null (no scene / no NPC there).
 */
export const sceneHit: {
  kindAt: ((clientX: number, clientY: number) => CursorKind | null) | null
} = { kindAt: null }
