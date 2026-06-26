// Client-side image downscaling for profile-photo uploads. Photos are served
// from a tiny per-person store (api/profile-photo.ts), so we shrink them hard
// before upload: a circular avatar renders at ≤128px, so ~320px is ample even
// on retina, and we cap the encoded size so the store stays small and fast.

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Could not read the file'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('That file does not look like an image'))
    img.src = src
  })
}

/**
 * Downscale an image File to a square-ish JPEG data URL, ≤ maxDim on its long
 * edge and ≤ maxBytes encoded (dropping quality until it fits). Throws on a
 * non-image / undecodable file (e.g. HEIC on some browsers).
 */
export async function resizeImageToDataUrl(
  file: File,
  maxDim = 320,
  maxBytes = 90_000,
): Promise<string> {
  const img = await loadImage(await readAsDataUrl(file))
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not process the image')
  // White matte so transparent PNGs don't turn black when flattened to JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  let quality = 0.85
  let out = canvas.toDataURL('image/jpeg', quality)
  while (out.length > maxBytes && quality > 0.4) {
    quality -= 0.12
    out = canvas.toDataURL('image/jpeg', quality)
  }
  return out
}
