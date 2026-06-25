/** A sprite-sheet (atlas) + its frame grid — what an `animated` layer needs. */
export interface Atlas {
  src: string
  frameWidth: number
  frameHeight: number
  columns: number
  frames: number
}

/** Load a File as an HTMLImageElement (via a transient object URL). */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Could not load image: ${file.name}`))
    }
    img.src = url
  })
}

/**
 * Stitch several frame images into ONE sprite-sheet (atlas) data-URL + its frame grid, so the
 * developer can upload individual frames instead of hand-making a sheet. Files are sorted by name
 * (`frame_1`, `frame_2`, … `frame_10` numeric-aware), each frame gets the same cell (the max
 * width / height across frames, smaller ones centred), laid out in a near-square grid read
 * left→right, top→bottom — exactly how the engine slices it. Nearest-neighbour (crisp pixel art),
 * PNG output stored inline in the document.
 */
export async function packFrames(files: File[]): Promise<Atlas> {
  const sorted = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true }),
  )
  const images = await Promise.all(sorted.map(loadImage))
  const frameWidth = Math.max(...images.map((i) => i.naturalWidth))
  const frameHeight = Math.max(...images.map((i) => i.naturalHeight))
  const frames = images.length
  const columns = Math.ceil(Math.sqrt(frames))
  const rows = Math.ceil(frames / columns)

  const canvas = document.createElement('canvas')
  canvas.width = columns * frameWidth
  canvas.height = rows * frameHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No 2D canvas context')
  ctx.imageSmoothingEnabled = false // keep pixel art crisp

  images.forEach((img, i) => {
    const col = i % columns
    const row = Math.floor(i / columns)
    // Centre a smaller frame in its cell (floored so pixels stay aligned).
    const dx = col * frameWidth + Math.floor((frameWidth - img.naturalWidth) / 2)
    const dy = row * frameHeight + Math.floor((frameHeight - img.naturalHeight) / 2)
    ctx.drawImage(img, dx, dy)
  })

  return { src: canvas.toDataURL('image/png'), frameWidth, frameHeight, columns, frames }
}
