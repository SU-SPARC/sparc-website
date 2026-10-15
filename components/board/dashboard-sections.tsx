/* The project sections of /dashboard (docs/DESIGN-BRIEF.md §6): My tasks,
 * My projects, My requests. Server component; data from getMyDashboard().
 * Declined requests appear once, with the reason (MarkDeclinedSeen). */

import Link from "next/link";

import { TimeAgo } from "@/components/forms/time-ago";
import { MicroLabel } from "@/components/ui/micro-label";
import { formatInstant } from "@/lib/data/dates";
import type { MyRequest, MyTask, ProjectCardData } from "@/lib/data/pm";
import { cn } from "@/lib/utils";

import { dueState, shortDate, todayDateOnly } from "./board-utils";
import { PriorityGlyph, StatusChip, TaskProgress } from "./meta";
import { MarkDeclinedSeen } from "./seen-declined";

const linkClass = "text-ink underline underline-offset-4 hover:text-accent-text";

export function MyTasksSection({ tasks, more, showingAll }: { tasks: MyTask[]; more: boolean; showingAll: boolean }) {
  const today = todayDateOnly();
  return (
    <section aria-labelledby="my-tasks" className="flex flex-col gap-3">
      <MicroLabel as="h2" id="my-tasks">
        My tasks
      </MicroLabel>
      {tasks.length === 0 ? (
        <p className="text-sm text-ink-muted">Nothing assigned to you.</p>
      ) : (
        <ul className="flex flex-col">
          {tasks.map((t) => {
            const due = t.dueOn ? dueState(t.dueOn, today, false) : null;
            return (
              <li key={t.id} className="flex items-start gap-3 border-t border-line py-3 last:border-b">
                <span className="pt-0.5 text-ink-muted">
                  <PriorityGlyph priority={t.priority} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <Link
                    href={`/dashboard/projects/${t.projectId}?task=${t.id}`}
                    className="text-sm font-medium text-ink underline-offset-4 [overflow-wrap:anywhere] hover:underline"
                  >
                    {t.title}
                  </Link>
                  <span className="text-xs text-ink-muted">
                    {t.projectRef} · {t.columnName}
                  </span>
                </div>
                {t.dueOn ? (
                  <span
                    className={cn(
                      "flex-none pt-0.5 text-xs tabular-nums",
                      due === "overdue" ? "font-medium text-danger" : due === "soon" ? "text-warning" : "text-ink-muted",
                    )}
                  >
                    {due === "overdue" ? "Overdue · " : <span className="sr-only">Due </span>}
                    {shortDate(t.dueOn)}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {more ? (
        <p className="text-sm">
          <Link href="/dashboard?tasks=all" className={linkClass}>
            All my tasks
          </Link>
        </p>
      ) : showingAll ? (
        <p className="text-sm">
          <Link href="/dashboard" className={linkClass}>
            Show the first 5
          </Link>
        </p>
      ) : null}
    </section>
  );
}

export function MyProjectsSection({ projects }: { projects: ProjectCardData[] }) {
  return (
    <section aria-labelledby="my-projects" className="flex flex-col gap-3">
      <MicroLabel as="h2" id="my-projects">
        My projects
      </MicroLabel>
      {projects.length === 0 ? (
        <>
          <p className="text-sm text-ink-muted">You&apos;re not on a project yet.</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <Link href="/dashboard/projects" className={linkClass}>
              Browse projects
            </Link>
            <Link href="/dashboard/projects/new" className={linkClass}>
              Request a project
            </Link>
          </p>
        </>
      ) : (
        <ul className="flex flex-col">
          {projects.map((p) => (
            <li
              key={p.id}
              className="relative grid gap-x-4 gap-y-2 border-t border-line py-3 last:border-b sm:grid-cols-[1fr_auto_9rem] sm:items-center"
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <MicroLabel>{p.ref}</MicroLabel>
                <Link
                  href={`/dashboard/projects/${p.id}`}
                  className="text-sm font-medium text-ink underline-offset-4 [overflow-wrap:anywhere] after:absolute after:inset-0 after:content-[''] hover:underline"
                >
                  {p.title}
                </Link>
              </div>
              <div className="flex items-center gap-3">
                <StatusChip status={p.status} />
                <span className="text-xs text-ink-muted">
                  <TimeAgo date={p.lastActivity} />
                </span>
              </div>
              <TaskProgress done={p.done} total={p.total} completed={p.status === "completed"} compact />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Pending requests, plus declined ones not yet shown. Omitted when empty. */
export function MyRequestsSection({ requests, seen }: { requests: MyRequest[]; seen: string[] }) {
  const declined = requests.filter((r) => r.declinedAt && !seen.includes(r.id));
  const pending = requests.filter((r) => !r.declinedAt);
  if (pending.length === 0 && declined.length === 0) return null;
  return (
    <section aria-labelledby="my-requests" className="flex flex-col gap-3">
      <MicroLabel as="h2" id="my-requests">
        My requests
      </MicroLabel>
      <ul className="flex flex-col">
        {pending.map((r) => (
          <li key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line py-3 last:border-b">
            <div className="flex min-w-0 flex-col gap-0.5">
              <Link
                href={`/dashboard/projects/new?edit=${r.id}`}
                className="text-sm font-medium text-ink underline-offset-4 [overflow-wrap:anywhere] hover:underline"
              >
                {r.title}
              </Link>
              <span className="text-xs text-ink-muted">Waiting for e-board review</span>
            </div>
            <span className="text-xs text-ink-muted">
              Sent{" "}
              <time dateTime={r.createdAt}>{formatInstant(new Date(r.createdAt), { month: "short", day: "numeric" })}</time>
            </span>
          </li>
        ))}
        {declined.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 border-t border-line py-3 last:border-b">
            <span className="flex flex-wrap items-baseline gap-x-3 text-sm font-medium text-ink">
              {r.title}
              <span className="text-xs font-normal text-ink-muted">Declined</span>
            </span>
            <span className="text-sm text-ink-muted">
              {r.declineReason ? <>Reason: {r.declineReason}</> : "The e-board declined this request."}
            </span>
          </li>
        ))}
      </ul>
      <MarkDeclinedSeen ids={declined.map((r) => r.id)} seen={seen} />
    </section>
  );
}
