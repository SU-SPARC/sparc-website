"use client";

/* Filters + card grid for /dashboard/projects.
 * Mine / All (default Mine when I have any), then status chips with counts
 * (single select; pressing the active one clears it). Sorted by last
 * activity upstream. */

import * as React from "react";

import { Button, ButtonLink } from "@/components/forms/button";
import { EmptyState } from "@/components/forms/empty-state";
import { FilterChip } from "@/components/ui/filter-chip";
import type { ProjectCardData } from "@/lib/data/pm";
import type { ProjectStatus } from "@/lib/data/types";

import { STATUS_LABEL } from "./meta";
import { ProjectCard } from "./project-card";

const STATUSES: ProjectStatus[] = ["proposed", "in_progress", "completed", "archived"];

export function ProjectsIndex({ projects }: { projects: ProjectCardData[] }) {
  const hasMine = projects.some((p) => p.isMine);
  const [scope, setScope] = React.useState<"mine" | "all">(hasMine ? "mine" : "all");
  const [status, setStatus] = React.useState<ProjectStatus | null>(null);

  const inScope = scope === "mine" ? projects.filter((p) => p.isMine) : projects;
  const shown = status ? inScope.filter((p) => p.status === status) : inScope;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter projects">
        <FilterChip pressed={scope === "mine"} onPressedChange={() => setScope("mine")}>
          Mine
        </FilterChip>
        <FilterChip pressed={scope === "all"} onPressedChange={() => setScope("all")}>
          All
        </FilterChip>
        <span aria-hidden="true" className="mx-1 h-5 border-l border-line" />
        {STATUSES.map((s) => {
          const count = inScope.filter((p) => p.status === s).length;
          return (
            <FilterChip
              key={s}
              pressed={status === s}
              count={count}
              onPressedChange={(on) => setStatus(on ? s : null)}
            >
              {STATUS_LABEL[s]}
            </FilterChip>
          );
        })}
      </div>

      {shown.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id} className="flex">
              <ProjectCard project={p} />
            </li>
          ))}
        </ul>
      ) : status ? (
        <EmptyState
          title={`No ${STATUS_LABEL[status].toLowerCase()} projects${scope === "mine" ? " of yours" : ""}.`}
          action={
            <Button variant="text" onClick={() => setStatus(null)}>
              Clear filters
            </Button>
          }
        />
      ) : scope === "mine" ? (
        <EmptyState
          title="You're not on a project."
          action={
            <Button variant="outline" onClick={() => setScope("all")}>
              Show all projects
            </Button>
          }
        />
      ) : (
        <EmptyState
          title="No projects yet."
          action={
            <ButtonLink href="/dashboard/projects/new" variant="outline">
              Request a project
            </ButtonLink>
          }
        />
      )}
    </div>
  );
}
