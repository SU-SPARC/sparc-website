import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DangerZone } from "@/components/admin/edit-client";
import { EditHeader } from "@/components/admin/edit-layout";
import { ProjectForm } from "@/components/admin/forms/project-form";
import { StatusBanner } from "@/components/forms/status-banner";
import { nextRef } from "@/lib/actions/content-helpers";
import { deleteProject } from "@/lib/actions/projects";
import { editorPage, MEDIA_COLS, toExistingImage, type MediaCols } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditProject({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const me = await editorPage(`/admin/projects/${id}`);
  if (!me) return null;
  const supabase = await createClient();
  const [{ data: p }, { data: gallery }, { data: refs }, { data: members }] = await Promise.all([
    supabase.from("projects").select(`*, cover:media!projects_cover_media_id_fkey(${MEDIA_COLS})`).eq("id", id).maybeSingle(),
    supabase
      .from("project_gallery")
      .select(`sort_order, media:media!project_gallery_media_id_fkey(${MEDIA_COLS})`)
      .eq("project_id", id)
      .order("sort_order"),
    supabase.from("projects").select("ref"),
    supabase.from("members").select("id, name").order("name"),
  ]);
  if (!p) notFound();
  let requester: string | null = null;
  if (p.requested_by) {
    const { data } = await supabase.from("people").select("display_name").eq("id", p.requested_by).maybeSingle();
    requester = data?.display_name ?? "a member";
  }

  return (
    <>
      {notice ? <StatusBanner clearParam="notice" className="mb-6">{notice}</StatusBanner> : null}
      <EditHeader
        section="Projects"
        sectionHref="/admin/projects"
        title={p.title}
        siteHref={p.published && p.status !== "proposed" ? "/projects" : null}
      />
      <ProjectForm
        proposedRef={nextRef((refs ?? []).map((r) => r.ref), "SP-", 3).slice(3)}
        members={members ?? []}
        d={{
          id: p.id,
          ref: p.ref.replace(/^SP-/, ""),
          slug: p.slug,
          title: p.title,
          kind: p.kind,
          status: p.status,
          term: p.term,
          summary: p.summary ?? "",
          highlights: p.highlights,
          methodology: p.methodology,
          supervisor_kind: p.supervisor_kind ?? "none",
          supervisor_member_id: p.supervisor_member_id ?? "",
          supervisor_name: p.supervisor_name ?? "",
          repo_url: p.repo_url ?? "",
          live_url: p.live_url ?? "",
          published: p.published,
          cover: toExistingImage(p.cover as MediaCols | null),
          gallery: (gallery ?? []).flatMap((g) => {
            const img = toExistingImage(g.media as MediaCols | null);
            return img ? [img] : [];
          }),
          created_at: p.created_at,
          updated_at: p.updated_at,
          requested_by: requester,
        }}
      />
      <DangerZone
        noun="project"
        itemName={p.title}
        confirmText={p.ref}
        description="Removes the project, its board, tasks and activity. Its images are deleted too."
        deleteAction={deleteProject.bind(null, p.id)}
      />
    </>
  );
}
