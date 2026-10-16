"use client";

/* One board column (docs/DESIGN-BRIEF.md §8). 18rem wide (85vw snap
 * columns ≤640px), bg-surface-1, header with a done check, name, count
 * ("2/3" with a WIP limit; over the limit: text-warning, a 2px warning top
 * border and the words "Over WIP limit"), a ⋯ menu for editors (rename,
 * WIP limit), the card list (scrolls inside a max height) and "+ Add task". */

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CircleCheck, Plus } from "lucide-react";
import * as React from "react";

import { ActionMenu } from "@/components/forms/action-menu";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/forms/input";
import { updateColumn } from "@/lib/actions/projects-pm";
import type { BoardColumn } from "@/lib/data/pm";
import { cn } from "@/lib/utils";

export interface BoardColumnProps {
  column: BoardColumn;
  taskIds: string[];
  canEdit: boolean;
  /** First column of a board with no tasks at all ("Add the first task."). */
  isFirst: boolean;
  isOver: boolean;
  adding: boolean;
  onAddingChange: (open: boolean) => void;
  onCreate: (title: string) => void;
  children: React.ReactNode;
}

export function BoardColumnView({
  column,
  taskIds,
  canEdit,
  isFirst,
  isOver,
  adding,
  onAddingChange,
  onCreate,
  children,
}: BoardColumnProps) {
  const { setNodeRef } = useDroppable({ id: column.id, data: { type: "column" } });
  const count = taskIds.length;
  const over = column.wipLimit !== null && count > column.wipLimit;
  const headingId = `col-${column.id}`;

  return (
    <section
      id={`column-${column.id}`}
      data-column-id={column.id}
      aria-labelledby={headingId}
      className={cn(
        "relative flex w-[85vw] flex-none snap-start flex-col rounded-card border-t-2 p-2 transition-colors sm:w-[18rem]",
        isOver ? "bg-surface-2" : "bg-surface-1",
        over ? "border-t-warning" : "border-t-transparent",
      )}
    >
      <header className="flex items-start gap-2 px-1 pt-0.5 pb-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <h2 id={headingId} className="flex min-h-8 items-center gap-1.5 text-sm font-medium text-ink">
            {column.isDone ? <CircleCheck aria-hidden="true" className="size-4 flex-none text-success" /> : null}
            <span className="truncate">{column.name}</span>
            <span className={cn("ml-1 text-label tabular-nums", over ? "text-warning" : "text-ink-muted")}>
              {column.wipLimit !== null ? `${count}/${column.wipLimit}` : count}
              <span className="sr-only">
                {column.wipLimit !== null ? ` tasks, WIP limit ${column.wipLimit}` : count === 1 ? " task" : " tasks"}
                {column.isDone ? ", done column" : ""}
              </span>
            </span>
          </h2>
          {over ? <p className="text-xs text-warning">Over WIP limit</p> : null}
        </div>
        {canEdit ? <ColumnMenu column={column} /> : null}
      </header>

      <SortableContext id={column.id} items={taskIds} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          aria-labelledby={headingId}
          className="relative flex max-h-[calc(100dvh-17rem)] min-h-12 flex-col gap-2 overflow-y-auto rounded-control p-0.5"
        >
          {children}
        </ul>
      </SortableContext>

      {count === 0 && isFirst && canEdit && !adding ? (
        <p className="px-1 pt-1 text-xs text-ink-muted">Add the first task.</p>
      ) : null}

      {canEdit ? (
        <AddTask column={column} open={adding} onOpenChange={onAddingChange} onCreate={onCreate} />
      ) : null}
    </section>
  );
}

/** "+ Add task" → inline textarea: Enter saves and stays open, Shift+Enter
 *  is a newline, Esc closes. */
function AddTask({
  column,
  open,
  onOpenChange,
  onCreate,
}: {
  column: BoardColumn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (title: string) => void;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [value, setValue] = React.useState("");
  const id = `add-${column.id}`;

  React.useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);

  if (!open) {
    return (
      <button
        ref={buttonRef}
        type="button"
        onClick={() => onOpenChange(true)}
        className="mt-2 flex min-h-11 items-center gap-1.5 rounded-control px-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink sm:min-h-9"
      >
        <Plus aria-hidden="true" className="size-4" />
        Add task
        <span className="sr-only"> to {column.name}</span>
      </button>
    );
  }

  const close = () => {
    setValue("");
    onOpenChange(false);
    setTimeout(() => buttonRef.current?.focus(), 0);
  };

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <label htmlFor={id} className="sr-only">
        New task title in {column.name}
      </label>
      <textarea
        ref={ref}
        id={id}
        rows={2}
        value={value}
        placeholder="Task title"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            close();
          } else if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const t = value.trim();
            if (t) {
              onCreate(t);
              setValue("");
            }
          }
        }}
        onBlur={(e) => {
          // Leaving an empty box closes it; a typed title stays until Esc.
          if (!e.currentTarget.value.trim() && !e.currentTarget.parentElement?.contains(e.relatedTarget as Node)) {
            onOpenChange(false);
          }
        }}
        className="w-full resize-none rounded-card border border-line-strong bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint"
      />
      <p className="px-1 text-xs text-ink-muted">Enter to add · Shift+Enter for a new line · Esc to close</p>
    </div>
  );
}

function ColumnMenu({ column }: { column: BoardColumn }) {
  const [mode, setMode] = React.useState<"rename" | "wip" | null>(null);
  const [name, setName] = React.useState(column.name);
  const [wip, setWip] = React.useState(column.wipLimit === null ? "" : String(column.wipLimit));
  const [error, setError] = React.useState<string | null>(null);

  const open = (m: "rename" | "wip") => {
    setName(column.name);
    setWip(column.wipLimit === null ? "" : String(column.wipLimit));
    setError(null);
    setMode(m);
  };

  const submit = async () => {
    const r = await updateColumn(
      mode === "rename" ? { columnId: column.id, name } : { columnId: column.id, wipLimit: wip === "" ? null : wip },
    );
    if ("error" in r && r.error) setError(r.error);
    else setMode(null);
  };

  return (
    <>
      <ActionMenu
        label={`Actions for column ${column.name}`}
        items={[
          { label: "Rename…", onSelect: () => open("rename") },
          { label: "Set WIP limit…", onSelect: () => open("wip") },
        ]}
      />
      <ConfirmDialog
        open={mode !== null}
        onOpenChange={(o) => !o && setMode(null)}
        title={mode === "rename" ? `Rename ${column.name}` : `WIP limit for ${column.name}`}
        tone="default"
        confirmLabel={mode === "rename" ? "Rename column" : "Save limit"}
        pendingLabel="Saving…"
        onConfirm={submit}
        formContent={
          mode === "rename" ? (
            <Field label="Name" error={error ?? undefined}>
              <Input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            </Field>
          ) : (
            <Field
              label="WIP limit"
              optional
              helper="Most tasks this column should hold at once. Leave empty for no limit. Going over is allowed; the column shows it."
              error={error ?? undefined}
            >
              <Input type="number" inputMode="numeric" min={1} max={99} value={wip} onChange={(e) => setWip(e.target.value)} />
            </Field>
          )
        }
      />
    </>
  );
}
