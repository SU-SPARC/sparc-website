import "server-only";

import { createPublicClient } from "@/lib/supabase/public";

import { toProject } from "./mappers";
import type { Project } from "./types";

const SELECT =
  "*, cover:media!projects_cover_media_id_fkey(id, path, thumb_path, width, height, blur_data_url, alt), gallery:project_gallery(sort_order, media(id, path, thumb_path, width, height, blur_data_url, alt)), supervisor_member:members!projects_supervisor_member_id_fkey(name)";

/** The public set: published and not a pending request, by sort_order then ref.
 *  Gallery images are ordered by project_gallery.sort_order. */
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await createPublicClient()
    .from("projects")
    .select(SELECT)
    .eq("published", true)
    .neq("status", "proposed")
    .order("sort_order")
    .order("ref");
  if (error) throw new Error(`getProjects: ${error.message}`);
  return data.map(toProject);
}
