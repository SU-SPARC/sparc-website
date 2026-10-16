"use client";

/* Task detail (docs/DESIGN-BRIEF.md §8): a right-side <dialog> sheet, 30rem,
 * full screen ≤640px. Every field saves on its own (selects on change, text
 * on blur / Enter) with an inline "Saved" next to its label. The task's own
 * activity sits at the bottom. Delete asks inline (no dialog on a dialog).
 * Read-only viewers get the same layout with disabled controls. */

import { CircleAlert, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { Input, Select, Textarea } from "@/components/forms/input";
import { loadTaskActivity, type TaskFieldInput } from "@/lib/actions/projects-pm";
import type { ActivityItem, BoardColumn, BoardSprint, BoardTask, PersonRef } from "@/lib/data/pm";
import type { Methodology } from "@/lib/data/types";
import { cn } from "@/lib/utils";

import { ActivityLine } from "./activity";
import { sprintNoun } from "./board-utils";
import { PRIORITY_LABEL } from "./meta";

export type FieldSave = (patch: TaskFieldInput) => Promise<{ ok: boolean; error?: string }>;

type FieldName = TaskFieldInput["field"];
type Status = { state: "saving" | "saved" | "error"; message?: string };

export interface TaskSheetProps {
  projectId: string;
  task: BoardTask | null;
  columns: BoardColumn[];
  sprints: BoardSprint[] | null;
  people: PersonRef[];
  memberIds: Set<string>;
  methodology: Methodology;
  canEdit: boolean;
  onClose: () => void;
  onSave: FieldSave;
  onDelete: () => Promise<{ ok: boolean; error?: string }>;
}

export function TaskSheet(props: TaskSheetProps) {
  const { task, onClose } = props;
  const ref = React.useRef<HTMLDialogElement>(null);
  const returnFocus = React.useRef<HTMLElement | null>(null);
  const open = task !== null;

  React.useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      d.showModal();
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="task-sheet-title"
      onClose={() => {
        onClose();
        const t = returnFocus.current;
        if (t?.isConnected) setTimeout(() => t.focus(), 0);
      }}
      onClick={(e) => {
        // Click on the backdrop (the dialog box itself, outside the panel).
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className={cn(
        "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-dvh w-full max-w-full border-l border-line bg-surface p-0 text-ink shadow-xl",
        "sm:w-[30rem]",
        "backdrop:bg-ink/40 dark:backdrop:bg-surface/75",
        "transition-transform duration-200 ease-out starting:open:translate-x-8 motion-reduce:transition-none",
      )}
    >
      {task ? <SheetBody key={task.id} {...props} task={task} close={() => ref.current?.close()} /> : null}
    </dialog>
  );
}

function SheetBody({
  projectId,
  task,
  columns,
  sprints,
  people,
  memberIds,
  methodology,
  canEdit,
  onSave,
  onDelete,
  close,
}: TaskSheetProps & { task: BoardTask; close: () => void }) {
  const [status, setStatus] = React.useState<Partial<Record<FieldName, Status>>>({});
  const [activity, setActivity] = React.useState<ActivityItem[] | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const isTemp = task.id.startsWith("temp-");

  const refreshActivity = React.useCallback(() => {
    if (isTemp) return;
    void loadTaskActivity(projectId, task.id).then(setActivity);
  }, [projectId, task.id, isTemp]);

  React.useEffect(() => {
    refreshActivity();
  }, [refreshActivity]);

  const save = async (patch: TaskFieldInput) => {
    setStatus((s) => ({ ...s, [patch.field]: { state: "saving" } }));
    const r = await onSave(patch);
    setStatus((s) => ({ ...s, [patch.field]: r.ok ? { state: "saved" } : { state: "error", message: r.error } }));
    if (r.ok) refreshActivity();
  };

  const disabled = !canEdit || isTemp;
  const noun = sprintNoun(methodology);
  const members = people.filter((p) => memberIds.has(p.id));
  const others = people.filter((p) => !memberIds.has(p.id));

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 id="task-sheet-title" className="sr-only">
            {task.title}
          </h2>
          <SheetField label="Title" field="title" status={status.title}>
            {(id) => (
              <Textarea
                id={id}
                data-autofocus
                rows={2}
                defaultValue={task.title}
                disabled={disabled}
                className="text-base font-medium"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim();
                  if (v && v !== task.title) void save({ field: "title", value: v });
                  else e.currentTarget.value = task.title;
                }}
              />
            )}
          </SheetField>
        </div>
        <button
          type="button"
          aria-label="Close task"
          onClick={close}
          className="-mr-2 grid size-11 flex-none place-items-center rounded-control text-ink-muted hover:bg-surface-2 hover:text-ink sm:size-8"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {!canEdit ? (
          <p className="mb-4 text-sm text-ink-muted">You can view this task. Only project members can edit it.</p>
        ) : null}
        <div className="grid grid-cols-2 gap-4">
          <SheetField label="Column" field="columnId" status={status.columnId}>
            {(id) => (
              <Select
                id={id}
                value={task.columnId}
                disabled={disabled}
                onChange={(e) => void save({ field: "columnId", value: e.target.value })}
              >
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            )}
          </SheetField>
          {sprints ? (
            <SheetField label={noun} field="sprintId" status={status.sprintId}>
              {(id) => (
                <Select
                  id={id}
                  value={task.sprintId ?? ""}
                  disabled={disabled}
                  onChange={(e) => void save({ field: "sprintId", value: e.target.value || null })}
                >
                  <option value="">No {noun.toLowerCase()}</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              )}
            </SheetField>
          ) : null}
          <SheetField label="Priority" field="priority" status={status.priority}>
            {(id) => (
              <Select
                id={id}
                value={task.priority}
                disabled={disabled}
                onChange={(e) => void save({ field: "priority", value: e.target.value as BoardTask["priority"] })}
              >
                {(["low", "medium", "high", "urgent"] as const).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABEL[p]}
                  </option>
                ))}
              </Select>
            )}
          </SheetField>
          <SheetField label="Points" field="points" status={status.points}>
            {(id) => (
              <Input
                id={id}
                key={`pts-${task.points}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                defaultValue={task.points ?? ""}
                disabled={disabled}
                onBlur={(e) => {
                  const raw = e.currentTarget.value;
                  const next = raw === "" ? null : Number(raw);
                  if (next !== task.points) void save({ field: "points", value: next });
                }}
              />
            )}
          </SheetField>
          <SheetField label="Assignee" field="assigneeId" status={status.assigneeId} className="col-span-2">
            {(id) => (
              <Select
                id={id}
                value={task.assigneeId ?? ""}
                disabled={disabled}
                onChange={(e) => void save({ field: "assigneeId", value: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {members.length ? (
                  <optgroup label="Project members">
                    {members.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                ) : null}
                <optgroup label={members.length ? "Everyone else" : "Everyone"}>
                  {others.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </optgroup>
              </Select>
            )}
          </SheetField>
          <SheetField label="Due date" field="dueOn" status={status.dueOn}>
            {(id) => (
              <Input
                id={id}
                key={`due-${task.dueOn}`}
                type="date"
                defaultValue={task.dueOn ?? ""}
                disabled={disabled}
                onBlur={(e) => {
                  const v = e.currentTarget.value || null;
                  if (v !== task.dueOn) void save({ field: "dueOn", value: v });
                }}
              />
            )}
          </SheetField>
          <SheetField label="GitHub URL" field="githubUrl" status={status.githubUrl} className="col-span-2">
            {(id) => (
              <Input
                id={id}
                key={`gh-${task.githubUrl}`}
                type="url"
                inputMode="url"
                placeholder="https://github.com/…/issues/12"
                defaultValue={task.githubUrl ?? ""}
                disabled={disabled}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim() || null;
                  if (v !== task.githubUrl) void save({ field: "githubUrl", value: v });
                }}
              />
            )}
          </SheetField>
          <SheetField label="Description" field="description" status={status.description} className="col-span-2">
            {(id) => (
              <Textarea
                id={id}
                key={`desc-${task.description}`}
                rows={6}
                defaultValue={task.description ?? ""}
                disabled={disabled}
                onBlur={(e) => {
                  const v = e.currentTarget.value.trim() || null;
                  if (v !== task.description) void save({ field: "description", value: v });
                }}
              />
            )}
          </SheetField>
        </div>

        <section aria-labelledby="task-activity" className="mt-8 flex flex-col gap-1">
          <h3 id="task-activity" className="text-label text-ink-muted uppercase">
            Activity
          </h3>
          {activity === null ? (
            <p className="py-2 text-sm text-ink-muted">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="py-2 text-sm text-ink-muted">Nothing yet.</p>
          ) : (
            <ul className="flex flex-col">
              {activity.map((a) => (
                <ActivityLine key={a.id} item={a} methodology={methodology} />
              ))}
            </ul>
          )}
        </section>

        {canEdit && !isTemp ? (
          <section className="mt-8 border-t border-line pt-4">
            {confirmDelete ? (
              <div role="group" aria-labelledby="task-delete-q" className="flex flex-col gap-3 rounded-card border border-danger p-4">
                <p id="task-delete-q" className="text-sm text-ink">
                  Delete <span className="font-medium">{task.title}</span>? It leaves the board for good; the activity keeps a line
                  saying it was deleted.
                </p>
                {deleteError ? (
                  <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
                    <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 flex-none" />
                    {deleteError}
                  </p>
                ) : null}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" onClick={() => setConfirmDelete(false)} autoFocus>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    pending={deleting}
                    pendingLabel="Deleting…"
                    onClick={async () => {
                      setDeleting(true);
                      const r = await onDelete();
                      setDeleting(false);
                      if (r.ok) close();
                      else setDeleteError(r.error ?? "Couldn't delete the task.");
                    }}
                  >
                    Delete task
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="danger-outline" onClick={() => setConfirmDelete(true)}>
                Delete task…
              </Button>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SheetField({
  label,
  field,
  status,
  className,
  children,
}: {
  label: string;
  field: FieldName;
  status?: Status;
  className?: string;
  children: (id: string) => React.ReactNode;
}) {
  const id = `task-${field}`;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={cn("text-sm font-medium text-ink", field === "title" && "sr-only")}>
          {label}
        </label>
        <span aria-live="polite" className="text-xs">
          {status?.state === "saving" ? (
            <span className="text-ink-muted">Saving…</span>
          ) : status?.state === "saved" ? (
            <span className="text-success">Saved</span>
          ) : null}
        </span>
      </div>
      {children(id)}
      {status?.state === "error" ? (
        <p role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 flex-none" />
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
