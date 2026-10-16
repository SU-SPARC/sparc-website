/* Upload a processed image straight from the browser to Storage (bucket
 * `media`), with the signed-in user's session; RLS decides who may write
 * where. Image bytes never pass through a server action (Vercel caps those
 * bodies at 4.5 MB).
 *
 * Paths: <kind>/<slug>-<8 hex>.<ext> and <kind>/<slug>-<8 hex>.thumb.<ext>.
 * Never overwritten (upsert: false, fresh suffix), cached for a year.
 *
 * The result is what the form posts back (inside ImageUpload's hidden JSON
 * field); the form's server action inserts the `media` row with it plus
 * the alt text (lib/actions/media-helpers.ts → resolveImageField). */

import { createClient } from "@/lib/supabase/client";
import { MEDIA_BUCKET } from "@/lib/supabase/storage";

import type { ProcessedImage } from "./encode";

export type MediaKind = "members" | "projects" | "events" | "news" | "photos";

export type UploadResult = {
  path: string;
  thumb_path: string;
  width: number;
  height: number;
  /** Bytes of the full variant. */
  bytes: number;
  mime: string;
  blur_data_url: string;
  original_name: string;
};

export function slugify(input: string, fallback = "image"): string {
  const s = input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,5}$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/, "");
  return s || fallback;
}

function hex8(): string {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
}

export async function uploadImage(
  img: ProcessedImage,
  opts: { kind: MediaKind; slug?: string },
): Promise<UploadResult> {
  const supabase = createClient();
  const base = `${opts.kind}/${slugify(opts.slug ?? img.originalName)}-${hex8()}`;
  const path = `${base}.${img.full.ext}`;
  const thumbPath = `${base}.thumb.${img.thumb.ext}`;
  const bucket = supabase.storage.from(MEDIA_BUCKET);

  const full = await bucket.upload(path, img.full.blob, {
    contentType: img.full.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (full.error) throw new Error(full.error.message);

  const thumb = await bucket.upload(thumbPath, img.thumb.blob, {
    contentType: img.thumb.mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (thumb.error) {
    // Don't leave the full image behind (editors can delete; a member's
    // orphan is swept by the discard action's server-side check).
    await bucket.remove([path]).catch(() => {});
    throw new Error(thumb.error.message);
  }

  return {
    path,
    thumb_path: thumbPath,
    width: img.full.width,
    height: img.full.height,
    bytes: img.full.blob.size,
    mime: img.full.mime,
    blur_data_url: img.blurDataUrl,
    original_name: img.originalName,
  };
}
