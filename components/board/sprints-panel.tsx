"use client";

/* Sprints / Iterations tab (docs/DESIGN-BRIEF.md §8). Scrum and Scrumban list
 * sprints under Current / Upcoming / Past; SAFe lists PIs as sections, each
 * with its iterations as rows (name, dates, goal, done/total). Project
 * members create, edit (inline) and delete them. */

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/forms/input";
import { MicroLabel } from "@/components/ui/micro-label";
import { createSprint, deleteSprint, updateSprint } from "@/lib/actions/projects-pm";
import type { BoardSprint } from "@/lib/data/pm";
import type { Methodology } from "@/lib/data/types";

import { groupSprints, nextSprintName, sprintDates, sprintNoun, sprintPhase, todayDateOnly } from "./board-utils";

type Draft = { name: string; goal: string; startsOn: string; endsOn: string };

export function SprintsPanel({
  projectId,
  methodology,
  sprints,
  counts,
  canEdit,
}: {
  projectId: string;
  methodology: Methodology;
  sprints: BoardSprint[];
  counts: Record<string, { done: number; total: number }>;
  canEdit: boolean;
}) {
  const router = useRouter();
  const noun = sprintNoun(methodology);
  const today = React.useMemo(() => todayDateOnly(), []);
  const [editing, setEditing] = React.useState<string | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<BoardSprint | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const groups = groupSprints(sprints, methodology, today);

  return (
    <div className="flex max-w-text flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {methodology === "safe"
            ? "Iterations are named “PI 2 · Iteration 3” and grouped by PI."
            : methodology === "scrumban"
              ? "Sprints are optional on a Scrumban board."
              : "Each sprint has dates and a goal."}
        </p>
        {canEdit && editing !== "new" ? (
          <Button variant="outline" onClick={() => setEditing("new")}>
            New {noun.toLowerCase()}
          </Button>
        ) : null}
      </div>

      {message ? (
        <p role="status" className="text-sm text-success">
          {message}
        </p>
      ) : null}

      {editing === "new" ? (
        <SprintForm
          noun={noun}
          initial={{ name: nextSprintName(sprints, methodology), goal: "", startsOn: "", endsOn: "" }}
          submitLabel={`Create ${noun.toLowerCase()}`}
          onCancel={() => setEditing(null)}
          onSubmit={async (d) => {
            const r = await createSprint({ projectId, ...d });
            if (r.ok) {
              setEditing(null);
              setMessage(`Created ${d.name}.`);
              router.refresh();
            }
            return r;
          }}
        />
      ) : null}

      {sprints.length === 0 && editing !== "new" ? (
        <p className="text-sm text-ink-muted">No {noun.toLowerCase()}s yet.</p>
      ) : null}

      {groups.map((g) => (
        <section key={g.label} aria-labelledby={`sg-${g.label}`} className="flex flex-col gap-2">
          <MicroLabel as="h2" id={`sg-${g.label}`}>
            {g.label}
          </MicroLabel>
          <ul className="flex flex-col">
            {g.sprints.map((s) => {
              const c = counts[s.id] ?? { done: 0, total: 0 };
              return (
                <li key={s.id} className="border-t border-line py-3 last:border-b">
                  {editing === s.id ? (
                    <SprintForm
                      noun={noun}
                      initial={{ name: s.name, goal: s.goal ?? "", startsOn: s.startsOn ?? "", endsOn: s.endsOn ?? "" }}
                      submitLabel="Save"
                      onCancel={() => setEditing(null)}
                      onSubmit={async (d) => {
                        const r = await updateSprint({ id: s.id, ...d });
                        if (r.ok) {
                          setEditing(null);
                          setMessage(`Saved ${d.name}.`);
                          router.refresh();
                        }
                        return r;
                      }}
                    />
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-baseline gap-x-3 text-sm font-medium text-ink">
                          {s.name}
                          <span className="text-xs font-normal text-ink-muted">{sprintDates(s)}</span>
                          {sprintPhase(s, today) === "current" ? <span className="text-xs font-normal text-accent-text">Current</span> : null}
                        </span>
                        {s.goal ? <span className="text-sm text-ink-muted">{s.goal}</span> : null}
                      </div>
                      <span className="flex-none pt-0.5 text-xs text-ink-muted tabular-nums">
                        {c.done}/{c.total} done
                      </span>
                      {canEdit ? (
                        <div className="flex flex-none gap-1">
                          <Button size="sm" variant="text" onClick={() => setEditing(s.id)} aria-label={`Edit ${s.name}`}>
                            Edit
                          </Button>
                          <Button size="sm" variant="text" onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}>
                            Delete…
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting ? `Delete ${deleting.name}?` : ""}
        confirmLabel={`Delete ${noun.toLowerCase()}`}
        pendingLabel="Deleting…"
        onConfirm={async () => {
          if (!deleting) return;
          const r = await deleteSprint(deleting.id);
          if (r.ok) {
            setMessage(`Deleted ${deleting.name}.`);
            router.refresh();
          } else setMessage(r.error);
          setDeleting(null);
        }}
      >
        <p>Its tasks stay on the board with no {noun.toLowerCase()}.</p>
      </ConfirmDialog>
    </div>
  );
}

function SprintForm({
  noun,
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  noun: string;
  initial: Draft;
  submitLabel: string;
  onSubmit: (d: Draft) => Promise<{ ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }>;
  onCancel: () => void;
}) {
  const [d, setD] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement>) => setD((x) => ({ ...x, [k]: e.target.value }));

  return (
    <form
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await onSubmit(d);
        setBusy(false);
        if (!r.ok) {
          setErrors(r.fieldErrors ?? {});
          setError(r.fieldErrors && Object.keys(r.fieldErrors).length ? null : (r.error ?? null));
        }
      }}
      className="flex flex-col gap-4 rounded-card border border-line bg-surface-1 p-4"
    >
      <Field label="Name" error={errors.name?.[0]}>
        <Input value={d.name} onChange={set("name")} maxLength={80} autoFocus />
      </Field>
      <Field label="Goal" optional error={errors.goal?.[0]}>
        <Input value={d.goal} onChange={set("goal")} maxLength={300} placeholder={`What this ${noun.toLowerCase()} should deliver`} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Starts" optional error={errors.startsOn?.[0]}>
          <Input type="date" value={d.startsOn} onChange={set("startsOn")} />
        </Field>
        <Field label="Ends" optional error={errors.endsOn?.[0]}>
          <Input type="date" value={d.endsOn} onChange={set("endsOn")} />
        </Field>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="text" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="outline" pending={busy} pendingLabel="Saving…">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
