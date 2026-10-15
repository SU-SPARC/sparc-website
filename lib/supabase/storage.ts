/* Public URLs for the `media` bucket. Pure string building — no request —
 * so it is safe on the server and in the browser. */

import type { ImageRef } from "@/lib/data/types";

import type { Tables } from "./database.types";
import { supabaseUrl } from "./env";

export const MEDIA_BUCKET = "media";

/** Public URL of an object path in the `media` bucket. */
export function publicUrl(path: string): string {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  return `${supabaseUrl()}/storage/v1/object/public/${MEDIA_BUCKET}/${encoded}`;
}

export type MediaRow = Tables<"media">;

/** The subset of a `media` row needed to render it. */
export type MediaLike = Pick<MediaRow, "path" | "thumb_path" | "width" | "height" | "blur_data_url" | "alt">;

/** A `media` row → ImageRef for next/image. */
export function mediaToImageRef(row: MediaLike): ImageRef {
  return {
    src: publicUrl(row.path),
    thumb: publicUrl(row.thumb_path ?? row.path),
    width: row.width,
    height: row.height,
    blur: row.blur_data_url,
    alt: row.alt,
  };
}
