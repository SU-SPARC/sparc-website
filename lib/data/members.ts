import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import { toMember } from "./mappers";
import type { Member } from "./types";

const SELECT = "*, photo:media!members_photo_media_id_fkey(id, path, thumb_path, width, height, blur_data_url, alt)";

/** Published member cards, by sort_order then name. */
export async function getMembers(): Promise<Member[]> {
  const { data, error } = await createPublicClient()
    .from("members")
    .select(SELECT)
    .eq("published", true)
    .order("sort_order")
    .order("name");
  if (error) throw new Error(`getMembers: ${error.message}`);
  return data.map(toMember);
}
