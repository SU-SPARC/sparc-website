"use server";

/* Media server actions callable from the uploader components. */

import { getCurrentUser, isEditorRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET } from "@/lib/supabase/storage";

const PATH = /^(members|projects|events|news|photos)\/[a-z0-9._-]+$/;

/** Delete objects of an upload that was removed or replaced before the form
 *  was saved (no media row points at them yet). Editors delete with their
 *  own session; a linked member may discard their own unsaved upload under
 *  members/ (checked here, then done with the admin client, because RLS
 *  gives members no delete on storage). Paths with a media row are kept. */
export async function discardUploads(paths: string[]): Promise<void> {
  const current = await getCurrentUser();
  if (!current) return;
  const clean = [...new Set(paths)].filter((p) => typeof p === "string" && PATH.test(p)).slice(0, 20);
  if (clean.length === 0) return;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("media")
    .select("path, thumb_path")
    .or(clean.map((p) => `path.eq.${p},thumb_path.eq.${p}`).join(","));
  const referenced = new Set((rows ?? []).flatMap((r) => [r.path, r.thumb_path]));
  const orphans = clean.filter((p) => !referenced.has(p));
  if (orphans.length === 0) return;

  if (isEditorRole(current.profile.role)) {
    await supabase.storage.from(MEDIA_BUCKET).remove(orphans);
    return;
  }
  if (current.profile.member_id) {
    const own = orphans.filter((p) => p.startsWith("members/"));
    if (own.length) await createAdminClient().storage.from(MEDIA_BUCKET).remove(own);
  }
}
