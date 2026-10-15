import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import { toRecording } from "./mappers";
import type { Recording } from "./types";

/** Published recordings, by sort_order then recorded_on (oldest first). */
export async function getRecordings(): Promise<Recording[]> {
  const { data, error } = await createPublicClient()
    .from("recordings")
    .select("*")
    .eq("published", true)
    .order("sort_order")
    .order("recorded_on");
  if (error) throw new Error(`getRecordings: ${error.message}`);
  return data.map(toRecording);
}
