/* Browser image compression (client only). No dependency.
 *
 * processImage(file):
 *   1. rejects HEIC/HEIF (by MIME or extension) before decoding;
 *   2. decodes once with createImageBitmap(…, { imageOrientation: 'from-image' })
 *      so phone photos come out upright;
 *   3. encodes on an OffscreenCanvas (falls back to <canvas>):
 *        full  long edge ≤ 2000px, quality 0.82
 *        thumb long edge ≤ 640px,  quality 0.80
 *        blur  24px wide data: URL (~0.5 KB)
 *      Each tries WebP first and checks blob.type: Safari silently returns
 *      PNG for WebP, so it falls back to JPEG at the same quality. The mime
 *      and extension returned are what was actually produced.
 * Never upscales. Throws ImageError with a user-facing message. */

export type ImageExt = "webp" | "jpg";

export type EncodedVariant = {
  blob: Blob;
  width: number;
  height: number;
  mime: "image/webp" | "image/jpeg";
  ext: ImageExt;
};

export type ProcessedImage = {
  full: EncodedVariant;
  thumb: EncodedVariant;
  blurDataUrl: string;
  /** Size of the file the user picked, for "4.2 MB → 286 KB". */
  originalBytes: number;
  originalName: string;
};

export class ImageError extends Error {
  constructor(
    message: string,
    readonly code: "heic" | "unreadable" | "type",
  ) {
    super(message);
    this.name = "ImageError";
  }
}

export const HEIC_MESSAGE =
  "HEIC photos can't be read by browsers. Export as JPEG first (on iPhone: Share → Save as JPEG, or Settings → Camera → Formats → Most Compatible).";
export const UNREADABLE_MESSAGE = "Couldn't read this file. Try a JPEG or PNG.";

export const FULL_EDGE = 2000;
export const THUMB_EDGE = 640;
export const BLUR_WIDTH = 24;

export function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

type Canvas = OffscreenCanvas | HTMLCanvasElement;

function makeCanvas(w: number, h: number): Canvas {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function toBlob(canvas: Canvas, type: string, quality: number): Promise<Blob> {
  if ("convertToBlob" in canvas) return canvas.convertToBlob({ type, quality });
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), type, quality),
  );
}

function draw(bmp: ImageBitmap, w: number, h: number): Canvas {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
  if (!ctx) throw new ImageError(UNREADABLE_MESSAGE, "unreadable");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas;
}

async function encodeCanvas(canvas: Canvas, w: number, h: number, quality: number): Promise<EncodedVariant> {
  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp.type === "image/webp") return { blob: webp, width: w, height: h, mime: "image/webp", ext: "webp" };
  // Safari: WebP encoding unsupported, it handed back PNG. Use JPEG.
  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  return { blob: jpeg, width: w, height: h, mime: "image/jpeg", ext: "jpg" };
}

function fit(w: number, h: number, maxEdge: number): [number, number] {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** Decode once, then produce full, thumb and blur. */
export async function processImage(file: File): Promise<ProcessedImage> {
  if (isHeic(file)) throw new ImageError(HEIC_MESSAGE, "heic");
  if (file.type && !file.type.startsWith("image/")) throw new ImageError(UNREADABLE_MESSAGE, "type");

  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new ImageError(UNREADABLE_MESSAGE, "unreadable");
  }

  try {
    const [fw, fh] = fit(bmp.width, bmp.height, FULL_EDGE);
    const full = await encodeCanvas(draw(bmp, fw, fh), fw, fh, 0.82);
    const [tw, th] = fit(bmp.width, bmp.height, THUMB_EDGE);
    const thumb = await encodeCanvas(draw(bmp, tw, th), tw, th, 0.8);
    const bw = BLUR_WIDTH;
    const bh = Math.max(1, Math.round((bmp.height / bmp.width) * BLUR_WIDTH));
    const tiny = await encodeCanvas(draw(bmp, bw, bh), bw, bh, 0.5);
    const blurDataUrl = await blobToDataUrl(tiny.blob);
    return { full, thumb, blurDataUrl, originalBytes: file.size, originalName: file.name };
  } finally {
    bmp.close();
  }
}

/** "4.2 MB", "286 KB", "812 B". */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}
