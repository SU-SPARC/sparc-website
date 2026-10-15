/* Server-side handling of image fields posted by ImageUpload / GalleryUpload.
 *
 * Contract (the hidden input named after the field holds JSON):
 *   null                                   no image (removed)
 *   { "id": "<media uuid>", "alt": "…" }   an existing media row
 *   { "upload": UploadResult, "alt": "…" } a fresh upload; the row is
 *                                          inserted here, at save time
 * Gallery fields hold an ordered JSON array of the two non-null shapes.
 *
 * Old images are removed only after the owning row has been updated, and
 * only when nothing else references them (cleanupMedia). */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { MediaKind, UploadResult } from "@/lib/images/upload";
import type { Database } from "@/lib/supabase/database.types";
import { MEDIA_BUCKET } from "@/lib/supabase/storage";

type Client = SupabaseClient<Database>;

const UploadShape = z.object({
  path: z.string().min(1).max(300),
  thumb_path: z.string().min(1).max(300),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  bytes: z.number().int().nonnegative(),
  mime: z.enum(["image/webp", "image/jpeg", "image/png", "image/avif"]),
  blur_data_url: z.string().max(8000).startsWith("data:image/"),
  original_name: z.string().max(300),
});

const Existing = z.object({ id: z.uuid(), alt: z.string().max(1000) });
const Fresh = z.object({ upload: UploadShape, alt: z.string().max(1000) });
const ItemShape = z.union([Existing, Fresh]);

export type ImageItem = { id: string; alt: string } | { upload: UploadResult; alt: string };
export type ImageFieldValue = ImageItem | null;

/** Parse the field. `undefined` = the field was not in the form at all. */
export function readImageField(fd: FormData, name: string): ImageFieldValue | undefined | "invalid" {
  const raw = fd.get(name);
  if (raw === null) return undefined;
  if (typeof raw !== "string" || raw === "" || raw === "null") return null;
  try {
    const parsed = ItemShape.safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as ImageItem) : "invalid";
  } catch {
    return "invalid";
  }
}

export function readGalleryField(fd: FormData, name: string): ImageItem[] | undefined | "invalid" {
  const raw = fd.get(name);
  if (raw === null) return undefined;
  if (typeof raw !== "string" || raw === "") return [];
  try {
    const parsed = z.array(ItemShape).max(40).safeParse(JSON.parse(raw));
    return parsed.success ? (parsed.data as ImageItem[]) : "invalid";
  } catch {
    return "invalid";
  }
}

/** Field error for an image value, or undefined. */
export function imageFieldError(value: ImageFieldValue | undefined | "invalid", required: boolean): string | undefined {
  if (value === "invalid") return "That image didn't upload properly. Remove it and try again.";
  if (!value) return required ? "Add an image." : undefined;
  if (!value.alt.trim()) return "Add alt text.";
  return undefined;
}

function validPath(path: string, kind: MediaKind): boolean {
  return path.startsWith(`${kind}/`) && !path.includes("..") && !path.includes("//") && /^[a-z0-9/._-]+$/.test(path);
}

/** Insert the media row for a fresh upload, or update alt on an existing
 *  one (when allowed). Returns the media id. */
export async function resolveImageItem(
  supabase: Client,
  item: ImageItem,
  kind: MediaKind,
  opts: { updateExistingAlt: boolean },
): Promise<{ id: string } | { error: string }> {
  if ("id" in item) {
    if (opts.updateExistingAlt) {
      const { error } = await supabase.from("media").update({ alt: item.alt.trim() }).eq("id", item.id);
      if (error) return { error: `Couldn't update the alt text: ${error.message}` };
    }
    return { id: item.id };
  }
  const u = item.upload;
  if (!validPath(u.path, kind) || !validPath(u.thumb_path, kind)) {
    return { error: "That image was uploaded to the wrong folder. Remove it and upload again." };
  }
  const { data, error } = await supabase
    .from("media")
    .insert({
      path: u.path,
      thumb_path: u.thumb_path,
      width: u.width,
      height: u.height,
      bytes: u.bytes,
      mime: u.mime,
      blur_data_url: u.blur_data_url,
      alt: item.alt.trim(),
      original_name: u.original_name,
    })
    .select("id")
    .single();
  if (error) return { error: `Couldn't save the image: ${error.message}` };
  return { id: data.id };
}

/** Field value → media id (null when removed). */
export async function resolveImageField(
  supabase: Client,
  value: ImageFieldValue,
  kind: MediaKind,
  opts: { updateExistingAlt: boolean },
): Promise<{ id: string | null } | { error: string }> {
  if (!value) return { id: null };
  return resolveImageItem(supabase, value, kind, opts);
}

/** Every column that references a media row. */
async function referenceCount(supabase: Client, id: string): Promise<number> {
  const counts = await Promise.all([
    supabase.from("members").select("id", { count: "exact", head: true }).eq("photo_media_id", id),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("cover_media_id", id),
    supabase.from("events").select("id", { count: "exact", head: true }).eq("cover_media_id", id),
    supabase.from("news").select("id", { count: "exact", head: true }).eq("media_id", id),
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("media_id", id),
    supabase.from("project_gallery").select("media_id", { count: "exact", head: true }).eq("media_id", id),
  ]);
  if (counts.some((c) => c.error)) return Number.POSITIVE_INFINITY; // unsure → keep
  return counts.reduce((n, c) => n + (c.count ?? 0), 0);
}

/** Delete media rows (and their objects) that nothing references any more.
 *  `supabase` must be able to read every referencing table and delete media
 *  (an editor's session client, or the admin client after the caller has
 *  been checked). Failures are swallowed: a leftover file is harmless. */
export async function cleanupMedia(supabase: Client, ids: Array<string | null | undefined>): Promise<void> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  for (const id of unique) {
    if ((await referenceCount(supabase, id)) > 0) continue;
    const { data: row } = await supabase.from("media").select("path, thumb_path").eq("id", id).maybeSingle();
    if (!row) continue;
    const { error } = await supabase.from("media").delete().eq("id", id);
    if (error) continue;
    const paths = [row.path, row.thumb_path].filter((p): p is string => Boolean(p));
    await supabase.storage.from(MEDIA_BUCKET).remove(paths);
  }
}

/** Storage paths of fresh uploads in a value (for discarding on failure). */
export function uploadPaths(items: Array<ImageFieldValue | undefined>): string[] {
  return items.flatMap((v) => (v && "upload" in v ? [v.upload.path, v.upload.thumb_path] : []));
}
