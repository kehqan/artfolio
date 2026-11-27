/**
 * Make a picked photo light before it's uploaded.
 *
 * Phone photos are often 4–12 MB. Shrunk to at most 2560 px on the long side
 * and saved as WebP (or JPEG where the browser can't write WebP, as on older
 * Safari), they are usually 200–600 KB and look the same on screen. Every page
 * that shows the work then loads several times faster.
 *
 * Redrawing the photo also drops its hidden details (EXIF): where it was
 * taken (GPS), the phone, the date. Artists often shoot work at home, so a
 * photo must never carry its location onto a public page. The original is
 * only kept when the new file wouldn't be smaller AND the original has no
 * such details. A JPEG that can't be redrawn has its details cut out instead.
 * GIFs (may move) go up as they are; they don't carry GPS.
 *
 * The storage buckets themselves only take JPEG, PNG, WebP, GIF and AVIF up
 * to 10 MB (database/migrations/20261124_phase1_contracts_storage.sql), so a
 * wrong file is refused even if this step is skipped.
 */
const MAX_SIDE = 2560;

/** iPhone "High Efficiency" photos. Windows and some browsers give them no type at all. */
export function isHeic(file: File): boolean {
  return /^image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/** Is this a picture we can try? Files with no type (HEIC on Windows) are judged by their name. */
export function isPicture(file: File): boolean {
  return file.type.startsWith("image/") || isHeic(file) || (!file.type && /\.(jpe?g|png|webp|gif|avif)$/i.test(file.name));
}

/** What to tell someone when a photo couldn't be used. */
export function photoProblem(file: File): string {
  if (isHeic(file)) return "This browser can't open iPhone HEIC photos. Pick the photo on your iPhone (it converts by itself), open this page in Safari, or save the photo as JPEG first.";
  if (file.size > 40 * 1024 * 1024) return "That photo is very large. Try one under 40 MB.";
  return "That photo didn't upload. Try a JPG or PNG.";
}

// Big phone photos are decoded one at a time. Several 48-megapixel photos
// decoded at once is enough to make an older iPhone reload the page.
let queue: Promise<unknown> = Promise.resolve();

export function prepareImage(file: File, maxSide = MAX_SIDE): Promise<File> {
  const run = queue.then(() => prepareOne(file, maxSide), () => prepareOne(file, maxSide));
  queue = run.catch(() => null);
  return run;
}

/** The file after prepareImage: can the storage take it? (JPEG, PNG, WebP, GIF, AVIF.) */
export function uploadable(file: File): boolean {
  return /^image\/(jpeg|png|webp|gif|avif)$/.test(file.type);
}

async function prepareOne(file: File, maxSide: number): Promise<File> {
  if (typeof window === "undefined" || !isPicture(file)) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  let meta = true;
  try { meta = await hasHiddenDetails(file); } catch { /* assume it has some */ }
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
    if (!blob) return meta ? await stripJpeg(file) : file;
    if (blob.size >= file.size && scale === 1 && !meta && uploadable(file)) return file;

    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}.${ext}`, { type: blob.type, lastModified: Date.now() });
  } catch {
    return meta ? await stripJpeg(file) : file;
  }
}

/** True when the file looks like it carries EXIF or XMP details (maybe GPS). */
async function hasHiddenDetails(file: File): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
  let s = "";
  for (let i = 0; i < head.length; i++) s += String.fromCharCode(head[i]);
  return /Exif\0|eXIf|EXIF|<x:xmpmeta|XMP |iTXt|tEXt|zTXt/.test(s);
}

/**
 * Cut the EXIF/XMP (APP1) and Photoshop/IPTC (APP13) blocks out of a JPEG,
 * leaving the picture untouched. Anything that isn't a JPEG comes back as is.
 */
async function stripJpeg(file: File): Promise<File> {
  if (file.type !== "image/jpeg") return file;
  try {
    const b = new Uint8Array(await file.arrayBuffer());
    if (b[0] !== 0xff || b[1] !== 0xd8) return file;
    const parts: Uint8Array[] = [b.subarray(0, 2)];
    let i = 2;
    while (i + 4 <= b.length && b[i] === 0xff) {
      const marker = b[i + 1];
      if (marker === 0xda) break; // start of the picture data: keep the rest
      const len = (b[i + 2] << 8) | b[i + 3];
      if (marker !== 0xe1 && marker !== 0xed) parts.push(b.subarray(i, i + 2 + len));
      i += 2 + len;
    }
    parts.push(b.subarray(i));
    return new File(parts as BlobPart[], file.name, { type: file.type, lastModified: Date.now() });
  } catch {
    return file;
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, type, quality));
}

/** Uploaded files get new names every time, so browsers may keep them for a year. */
export const IMAGE_CACHE_SECONDS = "31536000";

/** The file ending for an upload, from its type (names can be anything). */
export function imageExt(file: File): string {
  const byType: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
  return byType[file.type] || "jpg";
}
