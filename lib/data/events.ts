import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import { toEvent } from "./mappers";
import type { SparcEvent } from "./types";

const SELECT = "*, cover:media!events_cover_media_id_fkey(id, path, thumb_path, width, height, blur_data_url, alt)";

/** Published events, oldest first (by starts_at). starts_at is a Date. */
export async function getEvents(): Promise<SparcEvent[]> {
  const { data, error } = await createPublicClient()
    .from("events")
    .select(SELECT)
    .eq("published", true)
    .order("starts_at");
  if (error) throw new Error(`getEvents: ${error.message}`);
  return data.map(toEvent);
}
