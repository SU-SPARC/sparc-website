"use server";

/* Admin project CRUD. Changing status here does NOT create board columns:
 * agent G's approve action (lib/actions/projects-pm.ts) builds the board
 * from the methodology template when a request is approved. */

import { redirect } from "next/navigation";
import { z } from "zod";

import type { TablesInsert } from "@/lib/supabase/database.types";

import { editorSession, revalidateSite, takenBy } from "./content-helpers";
import { ok, withNotice, zodFail, zOptText, zOptUrl, zText } from "./form-data";
import type { FormState } from "./form-state";
import {
  cleanupMedia,
  imageFieldError,
  readGalleryField,
  readImageField,
  resolveImageField,
  resolveImageItem,
} from "./media-helpers";

const ProjectShape = z.object({
  ref: z
    .string()
    .transform((v) => v.trim().toUpperCase().replace(/^SP-/, ""))
    .pipe(z.string().regex(/^\d{1,4}$/, { error: "Use digits, e.g. 014." })),
  slug: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Lowercase letters, digits and dashes only." })),
  title: zText("a title", 160),
  kind: z.enum(["team", "personal"], { error: "Pick team or personal." }),
  status: z.enum(["proposed", "in_progress", "completed", "archived"], { error: "Pick a status." }),
  term: zText("a term like Spring 2026", 40),
  summary: zOptText.pipe(z.string().max(2000).nullable()),
  highlights: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  methodology: z.enum(["kanban", "scrumban", "scrum", "safe"], { error: "Pick a methodology." }),
  supervisor_kind: z.enum(["faculty", "student", "none"]).default("none"),
  supervisor_member_id: zOptText,
  supervisor_name: zOptText,
  repo_url: zOptUrl.pipe(
    z
      .string()
      .regex(/^https:\/\/github\.com\/[^/]+(\/[^/]+)?\/?$/, { error: "Use a GitHub link like https://github.com/SU-SPARC/repo." })
      .nullable(),
  ),
  live_url: zOptUrl,
  published: z.string().optional().transform((v) => v === "true" || v === "on"),
});

export async function saveProject(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, current } = await editorSession();
  const id = (fd.get("id") as string | null) || null;
  const parsed = ProjectShape.safeParse(Object.fromEntries(fd));
  const cover = readImageField(fd, "cover");
  const gallery = readGalleryField(fd, "gallery");
  const extra: Record<string, string[]> = {};
  const coverError = imageFieldError(cover, false);
  if (coverError) extra.cover = [coverError];
  if (gallery === "invalid") extra.gallery = ["An image didn't upload properly. Remove it and try again."];
  else if (gallery?.some((g) => !g.alt.trim())) extra.gallery = ["Every gallery image needs alt text."];
  if (!parsed.success) return zodFail(parsed.error, extra);
  const v = parsed.data;

  // Supervisor: faculty → free name; student → a member card or a name.
  if (v.supervisor_kind === "faculty" && !v.supervisor_name) extra.supervisor_name = ["Enter the supervisor's name."];
  if (v.supervisor_kind === "student" && !v.supervisor_member_id && !v.supervisor_name) {
    extra.supervisor_member_id = ["Pick a member or type a name."];
  }
  if (Object.keys(extra).length) return { fieldErrors: extra };

  const ref = `SP-${v.ref.padStart(3, "0")}`;
  const [refTaken, slugTaken] = await Promise.all([
    takenBy(supabase, "projects", "ref", ref, id, (r) => String(r.title)),
    takenBy(supabase, "projects", "slug", v.slug, id, (r) => String(r.title)),
  ]);
  if (refTaken || slugTaken) {
    return { fieldErrors: { ...(refTaken ? { ref: [refTaken] } : {}), ...(slugTaken ? { slug: [slugTaken] } : {}) } };
  }

  let old: { cover_media_id: string | null; status: string; approved_at: string | null } | null = null;
  let oldGallery: string[] = [];
  if (id) {
    const { data } = await supabase.from("projects").select("cover_media_id, status, approved_at").eq("id", id).maybeSingle();
    old = data;
    const { data: g } = await supabase.from("project_gallery").select("media_id").eq("project_id", id);
    oldGallery = (g ?? []).map((x) => x.media_id);
  }

  const media =
    cover === undefined || cover === "invalid"
      ? { id: old?.cover_media_id ?? null }
      : await resolveImageField(supabase, cover, "projects", { updateExistingAlt: true });
  if ("error" in media) return { fieldErrors: { cover: [media.error] } };

  const supervisor: {
    supervisor_kind: "faculty" | "student" | null;
    supervisor_member_id: string | null;
    supervisor_name: string | null;
  } =
    v.supervisor_kind === "none"
      ? { supervisor_kind: null, supervisor_member_id: null, supervisor_name: null }
      : v.supervisor_kind === "faculty"
        ? { supervisor_kind: "faculty" as const, supervisor_member_id: null, supervisor_name: v.supervisor_name }
        : {
            supervisor_kind: "student" as const,
            supervisor_member_id: v.supervisor_member_id,
            supervisor_name: v.supervisor_member_id ? null : v.supervisor_name,
          };

  const row: TablesInsert<"projects"> = {
    ref,
    slug: v.slug,
    title: v.title,
    kind: v.kind,
    status: v.status,
    term: v.term,
    summary: v.summary,
    highlights: v.highlights,
    methodology: v.methodology,
    ...supervisor,
    repo_url: v.repo_url,
    live_url: v.live_url,
    cover_media_id: media.id,
    published: v.published,
    // An editor moving a project out of "proposed" by hand counts as the
    // approval timestamp (no board is created here; see the file header).
    ...(v.status !== "proposed" && !old?.approved_at
      ? { approved_by: current.user.id, approved_at: new Date().toISOString() }
      : {}),
  };

  let projectId = id;
  if (id) {
    const { error } = await supabase.from("projects").update(row).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
  } else {
    const { data, error } = await supabase.from("projects").insert(row).select("id").single();
    if (error) return { error: `Couldn't create the project: ${error.message}` };
    projectId = data.id;
  }

  // Gallery: resolve every item to a media id, then rewrite the ordered rows.
  if (gallery !== undefined && gallery !== "invalid" && projectId) {
    const ids: string[] = [];
    for (const item of gallery) {
      const r = await resolveImageItem(supabase, item, "projects", { updateExistingAlt: true });
      if ("error" in r) return { fieldErrors: { gallery: [r.error] } };
      ids.push(r.id);
    }
    const unique = [...new Set(ids)];
    const { error: delErr } = await supabase.from("project_gallery").delete().eq("project_id", projectId);
    if (delErr) return { error: `Couldn't save the gallery: ${delErr.message}` };
    if (unique.length) {
      const { error: insErr } = await supabase
        .from("project_gallery")
        .insert(unique.map((media_id, i) => ({ project_id: projectId as string, media_id, sort_order: (i + 1) * 10 })));
      if (insErr) return { error: `Couldn't save the gallery: ${insErr.message}` };
    }
    await cleanupMedia(supabase, oldGallery.filter((m) => !unique.includes(m)));
  }
  if (old?.cover_media_id && old.cover_media_id !== media.id) await cleanupMedia(supabase, [old.cover_media_id]);

  revalidateSite();
  if (!id) redirect(withNotice(`/admin/projects/${projectId}`, `Created '${v.title}'.`));
  return ok();
}

export async function setProjectPublished(id: string, published: boolean): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("projects").update({ published }).eq("id", id);
  revalidateSite();
}

export async function deleteProject(id: string): Promise<void> {
  const { supabase } = await editorSession();
  const { data } = await supabase.from("projects").select("title, cover_media_id").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/projects");
  const { data: g } = await supabase.from("project_gallery").select("media_id").eq("project_id", id);
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) redirect(withNotice(`/admin/projects/${id}`, `Couldn't delete: ${error.message}`));
  await cleanupMedia(supabase, [data.cover_media_id, ...(g ?? []).map((x) => x.media_id)]);
  revalidateSite();
  redirect(withNotice("/admin/projects", `Deleted '${data.title}'.`));
}
