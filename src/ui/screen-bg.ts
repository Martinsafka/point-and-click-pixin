import type { CSSProperties } from 'react'
import type { ScreenBg } from '../data/schema'

/** Background style for a game screen (M11) — an `image` (cover) wins over a solid `color`. */
export function screenBg(bg?: ScreenBg): CSSProperties {
  if (bg?.image)
    return {
      backgroundImage: `url(${bg.image})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }
  if (bg?.color) return { background: bg.color }
  return {}
}
