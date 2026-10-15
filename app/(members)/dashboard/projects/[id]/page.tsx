/* Project board (docs/DESIGN-BRIEF.md §8). Tabs are links:
 * ?view=board (default) | activity | members | sprints ("Iterations" for
 * SAFe; only when the methodology uses them). Board filters live in
 * ?sprint=<id|all>&assignee=me, an open task in ?task=<id>. The Board tab
 * breaks out of max-w-page to the full viewport width. */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ActivityLine, groupByDay } from "@/components/board/activity";
import { BoardView } from "@/components/board/board-view";
import { sprintNoun, usesSprints } from "@/components/board/board-utils";
import { DetailsDialog } from "@/components/board/details-dialog";
import { MembersPanel } from "@/components/board/members-panel";
import { GithubLink, MethodologyPill, StatusChip, SupervisorLine } from "@/components/board/meta";
import { SprintsPanel } from "@/components/board/sprints-panel";
import { ButtonLink } from "@/components/forms/button";
import { MicroLabel } from "@/components/ui/micro-label";
import { requireUser } from "@/lib/auth";
import { getActivity, getBoard } from "@/lib/data/pm";
import { cn } from "@/lib/utils";

type Search = { view?: string; sprint?: string; assignee?: string; task?: string; before?: string };

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const board = await getBoard(id);
  return { title: board ? `${board.project.ref} ${board.project.title}` : "Project" };
}

export default async function ProjectBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Search>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const current = await requireUser(`/dashboard/projects/${id}`);
  const board = await getBoard(id);
  if (!board) notFound();
  const { project } = board;

  const sprintsOn = usesSprints(project.methodology);
  const views = ["board", "activity", "members", ...(sprintsOn ? ["sprints"] : [])] as const;
  const view = (views as readonly string[]).includes(sp.view ?? "") ? (sp.view as (typeof views)[number]) : "board";
  const label: Record<string, string> = {
    board: "Board",
    activity: "Activity",
    members: "Members",
    sprints: sprintNoun(project.methodology, true),
  };

  const header = (
    <header className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <MicroLabel>{project.ref}</MicroLabel>
        <StatusChip status={project.status} />
        <MethodologyPill methodology={project.methodology} />
      </div>
      <h1 className="text-2xl font-medium text-ink [overflow-wrap:anywhere]">{project.title}</h1>
      {project.summary ? <p className="max-w-text text-sm text-ink-muted">{project.summary}</p> : null}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <SupervisorLine supervisor={project.supervisor} />
        {project.repoUrl ? (
          <span className="flex items-center gap-1">
            <GithubLink href={project.repoUrl} label={`${project.ref} on GitHub`} className="m-0" />
            <span className="text-sm text-ink-muted">{project.repoUrl.replace(/^https:\/\/github\.com\//, "")}</span>
          </span>
        ) : null}
        {board.canEdit ? (
          <span className="flex items-center gap-2">
            <DetailsDialog
              projectId={project.id}
              title={project.title}
              summary={project.summary}
              highlights={project.highlights}
              repoUrl={project.repoUrl}
              liveUrl={project.liveUrl}
            />
          </span>
        ) : null}
      </div>
    </header>
  );

  // A pending request has no board yet.
  if (project.status === "proposed") {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-ink-muted">
          <Link href="/dashboard/projects" className="underline-offset-4 hover:text-ink hover:underline">
            Projects
          </Link>{" "}
          / {project.ref}
        </p>
        {header}
        <div className="flex max-w-text flex-col items-start gap-3 rounded-card border border-line p-5">
          <p className="text-sm font-medium text-ink">Waiting for e-board review.</p>
          <p className="text-sm text-ink-muted">
            The board is created when the request is approved, from the {project.methodology === "safe" ? "SAFe" : project.methodology} template.
          </p>
          {current.user.id === project.requestedBy ? (
            <ButtonLink href={`/dashboard/projects/new?edit=${project.id}`} variant="outline">
              Edit request
            </ButtonLink>
          ) : null}
        </div>
      </div>
    );
  }

  const activity = view === "activity" ? await getActivity(project.id, { before: sp.before, limit: 50 }) : null;
  const sprintCounts: Record<string, { done: number; total: number }> = {};
  if (view === "sprints") {
    const done = new Set(board.columns.filter((c) => c.isDone).map((c) => c.id));
    for (const t of board.tasks) {
      if (!t.sprintId) continue;
      const c = (sprintCounts[t.sprintId] ??= { done: 0, total: 0 });
      c.total += 1;
      if (done.has(t.columnId)) c.done += 1;
    }
  }
  const taskHref = (taskId: string) => `/dashboard/projects/${project.id}?view=board&task=${taskId}`;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-ink-muted">
        <Link href="/dashboard/projects" className="underline-offset-4 hover:text-ink hover:underline">
          Projects
        </Link>{" "}
        / {project.ref}
      </p>
      {header}
      {!board.canEdit ? (
        <p className="text-sm text-ink-muted">You can view this board. Only project members can edit it.</p>
      ) : null}

      <nav aria-label="Project views" className="sticky top-14 z-20 -mx-gutter border-b border-line bg-surface px-gutter">
        <ul className="relative flex overflow-x-auto [scrollbar-width:none]">
          {views.map((v) => (
            <li key={v} className="flex-none">
              <Link
                href={v === "board" ? `/dashboard/projects/${project.id}` : `/dashboard/projects/${project.id}?view=${v}`}
                aria-current={view === v ? "page" : undefined}
                scroll={false}
                className={cn(
                  "-mb-px flex min-h-12 items-center border-b-2 px-2.5 text-sm transition-colors sm:px-3",
                  view === v ? "border-accent font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {label[v]}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {view === "board" ? (
        <div className="-mt-2 ml-[calc(50%-50vw)] w-screen">
          <BoardView
            key={project.id}
            board={board}
            initialSprint={sp.sprint ?? null}
            initialAssignee={sp.assignee === "me" ? "me" : "all"}
            initialTaskId={sp.task && board.tasks.some((t) => t.id === sp.task) ? sp.task : null}
          />
        </div>
      ) : null}

      {view === "activity" && activity ? (
        <section aria-label="Activity" className="flex max-w-text flex-col gap-6">
          {activity.items.length === 0 ? <p className="text-sm text-ink-muted">Nothing has happened here yet.</p> : null}
          {groupByDay(activity.items).map((g) => (
            <section key={g.label} aria-labelledby={`day-${g.label}`} className="flex flex-col">
              <MicroLabel as="h2" id={`day-${g.label}`} className="border-b border-line pb-2">
                {g.label}
              </MicroLabel>
              <ul className="flex flex-col">
                {g.items.map((it) => (
                  <ActivityLine key={it.id} item={it} methodology={project.methodology} href={taskHref} />
                ))}
              </ul>
            </section>
          ))}
          {activity.hasMore ? (
            <div>
              <ButtonLink
                variant="outline"
                href={`/dashboard/projects/${project.id}?view=activity&before=${encodeURIComponent(
                  activity.items[activity.items.length - 1].createdAt,
                )}`}
              >
                Show older
              </ButtonLink>
            </div>
          ) : null}
          {sp.before ? (
            <Link href={`/dashboard/projects/${project.id}?view=activity`} className="text-sm text-ink underline underline-offset-4">
              Back to newest
            </Link>
          ) : null}
        </section>
      ) : null}

      {view === "members" ? (
        <MembersPanel
          projectId={project.id}
          projectTitle={project.title}
          supervisor={project.supervisor}
          members={board.members}
          people={board.people}
          canManage={board.canManageMembers}
          me={board.me}
        />
      ) : null}

      {view === "sprints" ? (
        <SprintsPanel
          projectId={project.id}
          methodology={project.methodology}
          sprints={board.sprints}
          counts={sprintCounts}
          canEdit={board.canEdit}
        />
      ) : null}
    </div>
  );
}
