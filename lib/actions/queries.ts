/* Server-only reads for the signed-in screens (dashboard, profile, admin).
 * Public pages use lib/data/*; these need the session (or, for one's own
 * hidden card, a checked admin read). Not a "use server" module. */

import "server-only";

import type { ExistingImage } from "@/components/forms/image-upload";
import type { CurrentUser } from "@/lib/auth";
import { toMember } from "@/lib/data/mappers";
import type { Member } from "@/lib/data/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/lib/supabase/database.types";
import { publicUrl, type MediaLike } from "@/lib/supabase/storage";

export const MEDIA_COLS = "id, path, thumb_path, width, height, blur_data_url, alt, bytes, original_name";
export type MediaCols = MediaLike & { id: string; bytes: number | null; original_name: string | null };

/** A media row → the uploader's `initial` value (thumb for display). */
export function toExistingImage(m: MediaCols | null | undefined): ExistingImage | null {
  if (!m) return null;
  return {
    id: m.id,
    alt: m.alt,
    src: publicUrl(m.thumb_path ?? m.path),
    width: m.width,
    height: m.height,
    bytes: m.bytes,
    original_name: m.original_name,
  };
}

export type OwnCard = {
  row: Tables<"members">;
  photo: MediaCols | null;
  member: Member;
};

/** The signed-in user's own member card, including when it is hidden
 *  (members cannot SELECT unpublished cards, so this reads with the admin
 *  client, scoped to the caller's own profiles.member_id). */
export async function getOwnCard(current: CurrentUser): Promise<OwnCard | null> {
  const id = current.profile.member_id;
  if (!id) return null;
  const { data } = await createAdminClient()
    .from("members")
    .select(`*, photo:media!members_photo_media_id_fkey(${MEDIA_COLS})`)
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const photo = (data.photo as MediaCols | null) ?? null;
  return { row: data, photo, member: toMember({ ...data, photo }) };
}
