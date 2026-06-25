import { type ChangeEvent } from 'react'

/**
 * Read a picked file as a data-URL (stored inline in the document so it survives export),
 * fixing the SVG mime so Pixi detects it even when the browser gives the file a wrong/empty
 * type. Shared by every asset uploader — see {@link AssetSwap}.
 */
function readAssetFile(file: File, onLoad: (src: string) => void): void {
  const reader = new FileReader()
  reader.onload = () => {
    let src = String(reader.result)
    if (/\.svg$/i.test(file.name) && !src.startsWith('data:image/svg+xml')) {
      src = src.replace(/^data:[^,;]*/, 'data:image/svg+xml')
    }
    onLoad(src)
  }
  reader.readAsDataURL(file)
}

/**
 * A file-picker button used everywhere an asset (image / audio / atlas) is uploaded **or
 * swapped in place**. Click → OS file dialog → reads the file as a data-URL → `onPick(src)`.
 * The same control does the first upload and replaces an existing asset's source — replacing
 * keeps the asset's id + every reference to it (a sound id, a layer, an item icon), so swapping
 * art / audio never breaks the rest of the doc.
 */
export function AssetSwap({
  accept,
  onPick,
  label = '⇄ Swap',
  title,
  className = 'editor__import',
}: {
  accept: string
  onPick: (src: string) => void
  /** Button text — e.g. `+ Image` for an empty slot, `⇄ Swap` to replace (the default). */
  label?: string
  title?: string
  className?: string
}) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-picking the same file
    if (file) readAssetFile(file, onPick)
  }
  return (
    <label className={className} title={title}>
      {label}
      <input type="file" accept={accept} hidden onChange={onChange} />
    </label>
  )
}
