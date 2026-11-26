/**
 * Make a picked photo light before it's uploaded.
 *
 * Phone photos are often 4–12 MB. Shrunk to at most 2560 px on the long side
 * and saved as WebP (or JPEG where the browser can't write WebP, as on older
 * Safari), they are usually 200–600 KB and look the same on screen. Every page
 * that shows the work then loads several times faster.
 *
 * GIFs (may move), SVGs and anything that fails to decode go up unchanged, and
 * the original is kept whenever the new file wouldn't be smaller.
 */
const MAX_SIDE = 2560;

export async function prepareImage(file: File, maxSide = MAX_SIDE): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();

    let blob = await toBlob(canvas, "image/webp", 0.86);
    // Browsers that can't write WebP hand back a PNG instead.
    if (!blob || blob.type !== "image/webp") blob = await toBlob(canvas, "image/jpeg", 0.88);
    if (!blob || (blob.size >= file.size && scale === 1)) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

/** Uploaded files get new names every time, so browsers may keep them for a year. */
export const IMAGE_CACHE_SECONDS = "31536000";
