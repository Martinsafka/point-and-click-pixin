/**
 * Resolve an asset reference from a `GameDoc` to a URL the loader can fetch.
 *
 * The editor embeds uploaded art/audio as `data:` URLs in its working draft. The
 * `scripts/build-assets.mjs` step externalizes those into `public/assets/baked/…` and
 * rewrites the doc to **relative** paths (e.g. `assets/baked/img/<hash>.webp`). A relative
 * path must be resolved against Vite's `BASE_URL` so it works both at the dev root (`/`)
 * and under the sub-path Pages build (the game ships at `/<repo>/play/`). `data:`, `blob:`
 * and absolute URLs are already loadable and pass through unchanged.
 */
export function assetUrl(ref: string): string {
  if (/^(?:data:|blob:|https?:\/\/|\/\/)/i.test(ref)) return ref
  const base = import.meta.env.BASE_URL // '/' in dev, '/<repo>/play/' in the Pages build
  return base.replace(/\/$/, '') + '/' + ref.replace(/^\//, '')
}
