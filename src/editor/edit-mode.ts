/**
 * The editor is dev-only and opt-in via `?edit`. In a production build
 * `import.meta.env.DEV` is statically false, so this is always false there.
 * (Fully excluding the editor bundle from the player build is a packaging task.)
 */
export function isEditMode(): boolean {
  return import.meta.env.DEV && new URLSearchParams(window.location.search).has('edit')
}
