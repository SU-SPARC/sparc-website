/* Seed image pipeline (Node, sharp). The same policy as the browser encoder in
 * lib/images/: EXIF auto-orient, full ≤ 2000 px long edge WebP q82, thumb
 * ≤ 640 px WebP q80, a ~24 px blur placeholder as a data: URL. Metadata (EXIF,
 * GPS) is stripped because sharp drops it unless asked to keep it. */

import { existsSync, statSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

/** Source photos for the seed (moved out of public/ once the site stopped
 * serving them). Originals at the top level, re-exports under images/. */
export const ASSETS_DIR = path.resolve(process.cwd(), "scripts/seed/assets");

const ORIGINAL_EXTS = [".jpg", ".jpeg", ".png"] as const;

export type EncodedImage = {
  /** absolute path of the file actually read */
  source: string;
  /** file name recorded as media.original_name */
  originalName: string;
  originalBytes: number;
  width: number;
  height: number;
  full: Buffer;
  thumb: Buffer;
  blurDataUrl: string;
};

/**
 * Pick the input file for an image basename (e.g. "kanan", "sparc-vc-4").
 * Prefers an original in scripts/seed/assets/ (.jpg/.jpeg/.png) over the
 * re-export in scripts/seed/assets/images/<base>.webp. When several originals share the basename
 * (mo.jpeg 400 px and mo.jpg 2316×3088), the largest file wins: it is the one
 * the .webp re-export was made from. Missing everywhere = hard error.
 */
export function resolveSource(base: string): string {
  const originals = ORIGINAL_EXTS.map((ext) => path.join(ASSETS_DIR, `${base}${ext}`))
    .filter((p) => existsSync(p))
    .sort((a, b) => statSync(b).size - statSync(a).size);
  if (originals.length > 0) return originals[0];
  const webp = path.join(ASSETS_DIR, "images", `${base}.webp`);
  if (existsSync(webp)) return webp;
  throw new Error(`No source image for "${base}" (looked for scripts/seed/assets/${base}.{jpg,jpeg,png} and scripts/seed/assets/images/${base}.webp)`);
}

/** "/images/kanan.webp" → "kanan" */
export function basenameOf(publicPath: string): string {
  return path.basename(publicPath, path.extname(publicPath));
}

export async function encodeImage(base: string): Promise<EncodedImage> {
  const source = resolveSource(base);
  try {
    // sharp sniffs content, so the mislabelled assets/images/*.webp files
    // (really JPEG/PNG) decode fine. limitInputPixels: false for bex.jpg (16 MB).
    const pipeline = sharp(source, { limitInputPixels: false }).rotate();
    const box = { fit: "inside" as const, withoutEnlargement: true };

    const full = await pipeline
      .clone()
      .resize({ width: 2000, height: 2000, ...box })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await pipeline
      .clone()
      .resize({ width: 640, height: 640, ...box })
      .webp({ quality: 80 })
      .toBuffer();
    const tiny = await pipeline.clone().resize({ width: 24, height: 24, ...box }).webp({ quality: 50 }).toBuffer();

    return {
      source,
      originalName: path.basename(source),
      originalBytes: statSync(source).size,
      width: full.info.width,
      height: full.info.height,
      full: full.data,
      thumb,
      blurDataUrl: `data:image/webp;base64,${tiny.toString("base64")}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Could not encode ${path.relative(process.cwd(), source)}: ${msg}`);
  }
}
