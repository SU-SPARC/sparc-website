/* Project card for /dashboard/projects (docs/DESIGN-BRIEF.md §7). The whole
 * card is clickable through a stretched title link; the GitHub link sits
 * above it (relative z-10). Server-safe. */

import Link from "next/link";

import { TimeAgo } from "@/components/forms/time-ago";
import { MicroLabel } from "@/components/ui/micro-label";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { ProjectCardData } from "@/lib/data/pm";

import { AvatarStack, GithubLink, MethodologyPill, StatusChip, SupervisorLine, TaskProgress } from "./meta";

export function ProjectCard({ project }: { project: ProjectCardData }) {
  const p = project;
  return (
    <SurfaceCard as="article" className="relative flex w-full min-w-0 flex-col gap-3 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <MicroLabel>{p.ref}</MicroLabel>
        <StatusChip status={p.status} />
      </div>
      <h2 className="line-clamp-2 text-lg font-medium text-ink">
        <Link
          href={`/dashboard/projects/${p.id}`}
          className="rounded-control after:absolute after:inset-0 after:rounded-card after:content-['']"
        >
          {p.title}
        </Link>
      </h2>
      <div>
        <MethodologyPill methodology={p.methodology} />
      </div>
      <SupervisorLine supervisor={p.supervisor} />
      <TaskProgress done={p.done} total={p.total} completed={p.status === "completed"} />
      <div className="mt-auto flex min-h-11 items-center justify-between gap-3 pt-1">
        <AvatarStack people={p.members} />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-ink-muted">
            Updated <TimeAgo date={p.lastActivity} />
          </span>
          {p.repoUrl ? <GithubLink href={p.repoUrl} label={`${p.ref} on GitHub`} /> : null}
        </div>
      </div>
    </SurfaceCard>
  );
}
