import { type ChangeEvent } from 'react'
import { packFrames, type Atlas } from './pack-frames'

/**
 * Multi-file picker that **stitches** the chosen frame images into one sprite-sheet (atlas) and
 * hands it to `onPack` — so a developer can upload individual frames instead of making a sheet.
 * Used to create an `animated` layer from frames, or to re-stitch an existing one's atlas.
 */
export function FramesUpload({
  onPack,
  label = '+ Frames',
}: {
  onPack: (atlas: Atlas) => void
  label?: string
}) {
  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = '' // allow re-picking the same files
    if (files.length) onPack(await packFrames(files))
  }
  return (
    <label
      className="editor__import"
      title="Upload individual frame images — the editor stitches them into a sprite sheet (ordered by file name)."
    >
      {label}
      <input type="file" accept="image/*,.svg" multiple hidden onChange={onChange} />
    </label>
  )
}
