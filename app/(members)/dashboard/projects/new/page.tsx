/* Request a project (docs/DESIGN-BRIEF.md §7). `?edit=<id>` edits one of my
 * own requests while it is still proposed. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RequestForm, type RequestValues } from "@/components/board/request-form";
import { requireUser } from "@/lib/auth";
import { listMemberCards } from "@/lib/data/pm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Request a project" };

const EMPTY: RequestValues = {
  title: "",
  summary: "",
  description: "",
  kind: "team",
  methodology: "kanban",
  supervisorKind: "faculty",
  supervisorMemberId: "",
  supervisorName: "",
  repoUrl: "",
};

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const current = await requireUser("/dashboard/projects/new");
  const { edit } = await searchParams;
  const cards = await listMemberCards();

  let initial = EMPTY;
  if (edit) {
    const supabase = await createClient();
    const { data } = /^[0-9a-f-]{36}$/i.test(edit)
      ? await supabase
          .from("projects")
          .select("id, title, summary, highlights, kind, methodology, supervisor_kind, supervisor_member_id, supervisor_name, repo_url, status, requested_by")
          .eq("id", edit)
          .maybeSingle()
      : { data: null };
    if (!data || data.requested_by !== current.user.id || data.status !== "proposed") notFound();
    initial = {
      id: data.id,
      title: data.title,
      summary: data.summary ?? "",
      description: data.highlights.join("\n"),
      kind: data.kind,
      methodology: data.methodology,
      supervisorKind: data.supervisor_kind ?? "faculty",
      supervisorMemberId: data.supervisor_member_id ?? "",
      supervisorName: data.supervisor_name ?? "",
      repoUrl: data.repo_url ?? "",
    };
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">
          <Link href="/dashboard/projects" className="underline-offset-4 hover:text-ink hover:underline">
            Projects
          </Link>{" "}
          / {edit ? "Edit request" : "New request"}
        </p>
        <h1 className="text-2xl font-medium text-ink">{edit ? initial.title : "Request a project"}</h1>
        <p className="max-w-text text-sm text-ink-muted">
          The e-board reviews requests. Once approved, the project gets a ref and a board, and you become its lead.
        </p>
      </header>
      <RequestForm initial={initial} cards={cards} />
    </div>
  );
}
