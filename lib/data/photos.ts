import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import { toPhoto } from "./mappers";
import type { Photo } from "./types";

const SELECT = "*, image:media!photos_media_id_fkey(id, path, thumb_path, width, height, blur_data_url, alt)";

/** The published gallery, by sort_order. The About page photo is the first
 *  with featured = true (fall back to the first photo): see featuredPhoto(). */
export async function getPhotos(): Promise<Photo[]> {
  const { data, error } = await createPublicClient()
    .from("photos")
    .select(SELECT)
    .eq("published", true)
    .order("sort_order")
    .order("created_at");
  if (error) throw new Error(`getPhotos: ${error.message}`);
  return data.flatMap((row) => {
    const photo = toPhoto(row);
    return photo ? [photo] : [];
  });
}

/** First featured photo, else the first photo, else null. Pure. */
export function featuredPhoto(photos: Photo[]): Photo | null {
  return photos.find((p) => p.featured) ?? photos[0] ?? null;
}
