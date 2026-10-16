import type { Metadata } from "next";

import { ContentList, type ContentRow } from "@/components/admin/content-list";
import { deleteProject, setProjectPublished } from "@/lib/actions/projects";
import { editorPage } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";

export const metadata: Metadata = { title: "Projects" };

const STATUS = { proposed: "Proposed", in_progress: "In progress", completed: "Completed", archived: "Archived" } as const;

export default async function ProjectsAdmin({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const me = await editorPage("/admin/projects");
  if (!me) return null;
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, ref, slug, title, status, term, published, cover:media!projects_cover_media_id_fkey(path, thumb_path)")
    .order("sort_order")
    .order("ref");
  if (error) throw new Error(error.message);

  const rows: ContentRow[] = data.map((p) => ({
    id: p.id,
    title: p.title,
    href: `/admin/projects/${p.id}`,
    meta: [p.ref, STATUS[p.status], p.term].join(" · "),
    thumb: p.cover ? publicUrl(p.cover.thumb_path ?? p.cover.path) : null,
    published: p.published,
    tags: [p.status],
    search: `${p.title} ${p.ref} ${p.slug} ${p.term}`.toLowerCase(),
    siteHref: p.status === "proposed" ? undefined : "/projects",
    deleteNote: "Removes the project, its board, tasks and activity. Its images are deleted too.",
    confirmText: p.ref,
  }));

  return (
    <ContentList
      noun="project"
      title="Projects"
      plural="projects"
      purpose="Club projects on /projects. Member requests arrive here as Proposed."
      newHref="/admin/projects/new"
      rows={rows}
      extraFilters={[
        { key: "proposed", label: "Proposed" },
        { key: "in_progress", label: "In progress" },
        { key: "completed", label: "Completed" },
        { key: "archived", label: "Archived" },
      ]}
      notice={notice}
      publishAction={setProjectPublished}
      deleteAction={deleteProject}
    />
  );
}
