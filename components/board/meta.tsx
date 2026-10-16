/* Small display pieces shared by the projects index, the board and the
 * dashboard: status chip, methodology pill, supervisor line, avatars,
 * progress bar, priority glyph, GitHub link. Server-safe (no hooks), so
 * client components can import them too. */

import { Github, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { initials } from "@/components/forms/avatar";
import { MicroLabel } from "@/components/ui/micro-label";
import { Pill } from "@/components/ui/pill";
import type { Methodology, ProjectStatus, SupervisorKind } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  proposed: "Proposed",
  in_progress: "In progress",
  completed: "Completed",
  archived: "Archived",
};

const STATUS_DOT: Record<ProjectStatus, string> = {
  proposed: "bg-warning",
  in_progress: "bg-accent",
  completed: "bg-success",
  archived: "bg-ink-faint",
};

export const METHODOLOGY_LABEL: Record<Methodology, string> = {
  kanban: "Kanban",
  scrumban: "Scrumban",
  scrum: "Scrum",
  safe: "SAFe",
};

export const METHODOLOGY_LINE: Record<Methodology, string> = {
  kanban: "Continuous flow, WIP limits, no sprints",
  scrumban: "Flow with optional sprints",
  scrum: "Fixed sprints with a goal",
  safe: "Iterations grouped into PIs, for larger teams",
};

export const KIND_LABEL: Record<SupervisorKind, string> = { faculty: "Faculty", student: "Student" };

/** Status as a word with a 6px dot (the dot is never the only signal). */
export function StatusChip({ status }: { status: ProjectStatus }) {
  return (
    <Pill className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className={cn("size-1.5 flex-none rounded-pill", STATUS_DOT[status])} />
      {STATUS_LABEL[status]}
    </Pill>
  );
}

export function MethodologyPill({ methodology }: { methodology: Methodology }) {
  return <Pill className="whitespace-nowrap uppercase">{METHODOLOGY_LABEL[methodology]}</Pill>;
}

export function KindChip({ kind }: { kind: SupervisorKind }) {
  return <Pill className="whitespace-nowrap uppercase">{KIND_LABEL[kind]}</Pill>;
}

/** "Supervisor  Dr. Ada Lovelace  FACULTY" */
export function SupervisorLine({
  supervisor,
}: {
  supervisor: { kind: SupervisorKind; name: string } | null;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
      <MicroLabel>Supervisor</MicroLabel>
      {supervisor ? (
        <>
          <span className="min-w-0 text-sm text-ink [overflow-wrap:anywhere]">{supervisor.name}</span>
          <KindChip kind={supervisor.kind} />
        </>
      ) : (
        <span className="text-sm text-ink-muted">Not set</span>
      )}
    </div>
  );
}

const AVATAR_PX = { 20: "size-5", 24: "size-6", 32: "size-8" } as const;

/** Initials on bg-surface-2 or a photo. 13px text at every size: two
 *  initials from 24px up, one below. */
export function PersonAvatar({
  name,
  photo,
  size = 24,
  className,
}: {
  name: string;
  photo?: string | null;
  size?: 20 | 24 | 32;
  className?: string;
}) {
  const text = initials(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid flex-none place-items-center overflow-hidden rounded-pill bg-surface-2 text-label leading-none tracking-normal text-ink-muted",
        AVATAR_PX[size],
        className,
      )}
    >
      {photo ? (
        <Image src={photo} alt="" width={size} height={size} className="size-full object-cover" />
      ) : size < 24 ? (
        text.slice(0, 1)
      ) : (
        text
      )}
    </span>
  );
}

/** Dashed empty circle for an unassigned task. */
export function EmptyAvatar({ size = 24 }: { size?: 20 | 24 }) {
  return (
    <span className="inline-flex flex-none">
      <span
        aria-hidden="true"
        className={cn("rounded-pill border border-dashed border-line-strong", AVATAR_PX[size])}
      />
      <span className="sr-only">Unassigned</span>
    </span>
  );
}

/** Up to `max` overlapping 24px avatars + "+2"; names in title and sr-only. */
export function AvatarStack({
  people,
  max = 4,
}: {
  people: Array<{ id: string; name: string; photo: string | null }>;
  max?: number;
}) {
  if (people.length === 0) return null;
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  const names = people.map((p) => p.name).join(", ");
  return (
    <div className="flex items-center" title={names}>
      <span className="sr-only">Members: {names}</span>
      {shown.map((p, i) => (
        <PersonAvatar key={p.id} name={p.name} photo={p.photo} className={cn("ring-2 ring-surface-1", i > 0 && "-ml-1.5")} />
      ))}
      {rest > 0 ? (
        <span aria-hidden="true" className="ml-1 text-label text-ink-muted tabular-nums">
          +{rest}
        </span>
      ) : null}
    </div>
  );
}

/** 4px bar + "7/12 tasks"; "No tasks yet" with no bar when empty. */
export function TaskProgress({
  done,
  total,
  completed,
  compact,
}: {
  done: number;
  total: number;
  completed?: boolean;
  compact?: boolean;
}) {
  if (total === 0) return <p className="text-xs text-ink-muted">No tasks yet</p>;
  const pct = Math.round((done / total) * 100);
  return (
    <div className={cn("flex items-center gap-3", compact ? "min-w-[8rem]" : "w-full")}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        aria-valuetext={`${done} of ${total} tasks done`}
        aria-label="Progress"
        className="h-1 min-w-0 flex-1 overflow-hidden rounded-pill bg-line"
      >
        <div className={cn("h-full rounded-pill", completed ? "bg-success" : "bg-ink")} style={{ width: `${pct}%` }} />
      </div>
      <span className="flex-none text-xs text-ink-muted tabular-nums">
        {done}/{total}
        {compact ? "" : " tasks"}
      </span>
    </div>
  );
}

export const PRIORITY_LABEL = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" } as const;

/** Signal bars for low/medium/high, a filled danger alert for urgent. */
export function PriorityGlyph({ priority }: { priority: keyof typeof PRIORITY_LABEL }) {
  const icon =
    priority === "urgent" ? (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 text-danger">
        <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="currentColor" />
        <path d="M8 4.5v4.25" stroke="var(--color-surface)" strokeWidth="1.75" strokeLinecap="round" />
        <circle cx="8" cy="11.25" r="1" fill="var(--color-surface)" />
      </svg>
    ) : priority === "high" ? (
      <SignalHigh aria-hidden="true" className="size-4" />
    ) : priority === "medium" ? (
      <SignalMedium aria-hidden="true" className="size-4" />
    ) : (
      <SignalLow aria-hidden="true" className="size-4" />
    );
  return (
    <span className="inline-flex items-center">
      {icon}
      <span className="sr-only">Priority: {PRIORITY_LABEL[priority].toLowerCase()}</span>
    </span>
  );
}

/** GitHub icon link with a 44px target, above any stretched card link. */
export function GithubLink({ href, label, className }: { href: string; label: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className={cn(
        "relative z-10 -m-2.5 grid size-11 flex-none place-items-center rounded-control text-ink-muted hover:bg-surface-2 hover:text-ink",
        className,
      )}
    >
      <Github aria-hidden="true" className="size-4" />
    </a>
  );
}
