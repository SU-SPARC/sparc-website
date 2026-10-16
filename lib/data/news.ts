import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import { toNews } from "./mappers";
import type { News } from "./types";

const SELECT = "*, image:media!news_media_id_fkey(id, path, thumb_path, width, height, blur_data_url, alt)";

/** Published news, newest first (by published_on). */
export async function getNews(): Promise<News[]> {
  const { data, error } = await createPublicClient()
    .from("news")
    .select(SELECT)
    .eq("published", true)
    .order("published_on", { ascending: false })
    .order("title");
  if (error) throw new Error(`getNews: ${error.message}`);
  return data.flatMap((row) => {
    const item = toNews(row);
    return item ? [item] : [];
  });
}
