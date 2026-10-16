import type { Metadata } from "next";

import { EditHeader } from "@/components/admin/edit-layout";
import { ProjectForm } from "@/components/admin/forms/project-form";
import { nextRef } from "@/lib/actions/content-helpers";
import { editorPage } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New project" };

function currentTerm(): string {
  const d = new Date();
  return `${d.getMonth() < 6 ? "Spring" : "Fall"} ${d.getFullYear()}`;
}

export default async function NewProject() {
  const me = await editorPage("/admin/projects/new");
  if (!me) return null;
  const supabase = await createClient();
  const [{ data: refs }, { data: members }] = await Promise.all([
    supabase.from("projects").select("ref"),
    supabase.from("members").select("id, name").order("name"),
  ]);
  const proposed = nextRef((refs ?? []).map((r) => r.ref), "SP-", 3).slice(3);

  return (
    <>
      <EditHeader section="Projects" sectionHref="/admin/projects" title="New project" />
      <ProjectForm
        proposedRef={proposed}
        members={members ?? []}
        d={{
          id: null,
          ref: proposed,
          slug: "",
          title: "",
          kind: "team",
          status: "in_progress",
          term: currentTerm(),
          summary: "",
          highlights: [],
          methodology: "kanban",
          supervisor_kind: "none",
          supervisor_member_id: "",
          supervisor_name: "",
          repo_url: "",
          live_url: "",
          published: false,
          cover: null,
          gallery: [],
          created_at: null,
          updated_at: null,
          requested_by: null,
        }}
      />
    </>
  );
}
