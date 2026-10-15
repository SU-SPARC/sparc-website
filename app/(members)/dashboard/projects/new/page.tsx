/* Request a project (docs/DESIGN-BRIEF.md §7). `?edit=<id>` edits one of my
 * own requests while it is still proposed. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RequestForm, type RequestValues } from "@/components/board/request-form";
import { requireUser } from "@/lib/auth";
import { getOwnPendingRequest, listMemberCards } from "@/lib/data/pm";

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
  await requireUser("/dashboard/projects/new");
  const { edit } = await searchParams;
  const cards = await listMemberCards();

  let initial = EMPTY;
  if (edit) {
    const r = await getOwnPendingRequest(edit);
    if (!r) notFound();
    initial = {
      id: r.id,
      title: r.title,
      summary: r.summary ?? "",
      description: r.highlights.join("\n"),
      kind: r.kind,
      methodology: r.methodology,
      supervisorKind: r.supervisorKind ?? "faculty",
      supervisorMemberId: r.supervisorMemberId ?? "",
      supervisorName: r.supervisorName ?? "",
      repoUrl: r.repoUrl ?? "",
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
