"use client";

/* The Board tab (docs/DESIGN-BRIEF.md §8).
 *
 * Toolbar: sprint/iteration selector (grouped; PI groups for SAFe), assignee
 * filter (Anyone / Me), "New task". Columns scroll horizontally; ≤640px they
 * are 85vw snap columns under a sticky strip of column names (a jump index)
 * and drag is off there: the card's Move menu does the work.
 *
 * Moves are optimistic (useOptimistic over the server's task list). The
 * server action revalidates the page, so on success the new props replace
 * the optimistic state; on failure the optimistic state falls away (the
 * card returns) and an alert line appears above the board. Focus follows
 * the moved card. Keyboard drag announces each step through dnd-kit's
 * live region; Move-menu moves are announced in ours. */

import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { CircleAlert, Plus, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { Select } from "@/components/forms/input";
import { FilterChip } from "@/components/ui/filter-chip";
import { Pill } from "@/components/ui/pill";
import { createTask, deleteTask, moveTask, updateTask, type TaskFieldInput } from "@/lib/actions/projects-pm";
import type { Board, BoardTask } from "@/lib/data/pm";

import {
  backlogColumnId,
  defaultSprint,
  groupSprints,
  isVisible,
  piOf,
  sprintAfterMove,
  sprintLabel,
  sprintNoun,
  todayDateOnly,
  usesSprints,
  type Filters,
} from "./board-utils";
import { BoardColumnView } from "./board-column";
import type { MenuPanel, MoveTarget } from "./card-menu";
import { DragCard, TaskCard } from "./task-card";
import { TaskSheet } from "./task-sheet";

type Op =
  | { type: "move"; taskId: string; toColumnId: string; toIndex: number; sprintId?: string | null }
  | { type: "add"; task: BoardTask }
  | { type: "patch"; taskId: string; patch: Partial<BoardTask> }
  | { type: "delete"; taskId: string };

const byPosition = (a: BoardTask, b: BoardTask) => a.position - b.position || a.createdAt.localeCompare(b.createdAt);

function reduce(tasks: BoardTask[], op: Op): BoardTask[] {
  switch (op.type) {
    case "add":
      return [...tasks, op.task];
    case "delete":
      return tasks.filter((t) => t.id !== op.taskId);
    case "patch":
      return tasks.map((t) => (t.id === op.taskId ? { ...t, ...op.patch } : t));
    case "move": {
      const moved = tasks.find((t) => t.id === op.taskId);
      if (!moved) return tasks;
      const dest = tasks.filter((t) => t.columnId === op.toColumnId && t.id !== op.taskId).sort(byPosition);
      const next = { ...moved, columnId: op.toColumnId, ...(op.sprintId !== undefined ? { sprintId: op.sprintId } : {}) };
      dest.splice(Math.min(op.toIndex, dest.length), 0, next);
      const positions = new Map(dest.map((t, i) => [t.id, i]));
      return tasks.map((t) =>
        t.id === op.taskId ? { ...next, position: positions.get(t.id)! } : positions.has(t.id) ? { ...t, position: positions.get(t.id)! } : t,
      );
    }
  }
}

/** Client-only ids for optimistic tasks until the server returns the row. */
let tempSeq = 0;

function useMedia(query: string): boolean {
  return React.useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export interface BoardViewProps {
  board: Board;
  initialSprint: string | null;
  initialAssignee: "me" | "all";
  initialTaskId: string | null;
}

export function BoardView({ board, initialSprint, initialAssignee, initialTaskId }: BoardViewProps) {
  const { project, columns, sprints, canEdit, me } = board;
  const sprintsOn = usesSprints(project.methodology);
  const noun = sprintNoun(project.methodology);
  const backlogId = backlogColumnId(columns);
  const today = React.useMemo(() => todayDateOnly(), []);

  const [filters, setFilters] = React.useState<Filters>(() => ({
    sprint:
      initialSprint && (initialSprint === "all" || sprints.some((s) => s.id === initialSprint))
        ? initialSprint
        : defaultSprint(sprints, project.methodology, today),
    assignee: initialAssignee,
  }));
  const [tasks, applyOp] = React.useOptimistic(board.tasks, reduce);
  const [, startTransition] = React.useTransition();
  const [alert, setAlert] = React.useState<string | null>(null);
  const [announcement, setAnnouncement] = React.useState("");
  const [openTaskId, setOpenTaskId] = React.useState<string | null>(initialTaskId);
  const [focusTaskId, setFocusTaskId] = React.useState<string | null>(null);
  const [menu, setMenu] = React.useState<{ taskId: string; panel: MenuPanel } | null>(null);
  const [addingIn, setAddingIn] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState<{ activeId: string; cols: Record<string, string[]> } | null>(null);
  const [overColumn, setOverColumn] = React.useState<string | null>(null);
  const [visibleCol, setVisibleCol] = React.useState<string | null>(columns[0]?.id ?? null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);

  const narrow = useMedia("(max-width: 640px)");
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const dragEnabled = canEdit && !narrow;

  const taskById = React.useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const people = React.useMemo(() => new Map(board.people.map((p) => [p.id, p])), [board.people]);
  const memberIds = React.useMemo(() => new Set(board.members.map((m) => m.id)), [board.members]);
  const columnById = React.useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);
  const sprintById = React.useMemo(() => new Map(sprints.map((s) => [s.id, s])), [sprints]);

  const visible = React.useCallback(
    (t: BoardTask) => isVisible(t, filters, me, backlogId, sprintsOn),
    [filters, me, backlogId, sprintsOn],
  );
  const columnTasks = React.useCallback(
    (colId: string) => tasks.filter((t) => t.columnId === colId).sort(byPosition),
    [tasks],
  );
  const visibleIds = React.useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const c of columns) out[c.id] = columnTasks(c.id).filter(visible).map((t) => t.id);
    return out;
  }, [columns, columnTasks, visible]);
  const idsFor = (colId: string) => (drag ? drag.cols[colId] ?? [] : visibleIds[colId] ?? []);
  const hiddenCount = tasks.length - Object.values(visibleIds).reduce((n, ids) => n + ids.length, 0);

  // ── URL sync for filters (no server round trip) ──────────────────────
  const setFilter = (patch: Partial<Filters>) => {
    setFilters((f) => {
      const next = { ...f, ...patch };
      const url = new URL(window.location.href);
      if (sprintsOn) url.searchParams.set("sprint", next.sprint);
      if (next.assignee === "me") url.searchParams.set("assignee", "me");
      else url.searchParams.delete("assignee");
      window.history.replaceState(null, "", url);
      return next;
    });
  };

  const setTaskParam = (id: string | null) => {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("task", id);
    else url.searchParams.delete("task");
    window.history.replaceState(null, "", url);
  };

  // ── focus follows the card after a move ──────────────────────────────
  React.useEffect(() => {
    if (!focusTaskId) return;
    const el = document.querySelector<HTMLElement>(`[data-task-id="${focusTaskId}"] [data-card-button]`);
    if (el) {
      el.focus({ preventScroll: false });
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
      setFocusTaskId(null);
    }
  }, [focusTaskId, tasks]);

  // ── mobile: which column is in view (for the strip's aria-current) ───
  React.useEffect(() => {
    if (!narrow || !scrollerRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setVisibleCol((e.target as HTMLElement).dataset.columnId ?? null);
        }
      },
      { root: scrollerRef.current, threshold: 0.6 },
    );
    scrollerRef.current.querySelectorAll("[data-column-id]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [narrow, columns]);

  // Keep the strip's current chip in view.
  React.useEffect(() => {
    if (!narrow) return;
    const chip = document.querySelector<HTMLElement>('nav[aria-label="Columns"] [aria-current="true"]');
    const strip = chip?.closest("ul");
    if (chip && strip) {
      const left = chip.offsetLeft - strip.clientWidth / 2 + chip.offsetWidth / 2;
      strip.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? "auto" : "smooth" });
    }
  }, [visibleCol, narrow, reducedMotion]);

  const jumpTo = (colId: string) => {
    document.getElementById(`column-${colId}`)?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      inline: "start",
      block: "nearest",
    });
    setVisibleCol(colId);
  };

  // ── mutations ────────────────────────────────────────────────────────
  /** Index in the full column (all tasks, filtered or not) for an insertion
   *  at `visibleIndex` among the visible tasks of that column. */
  const fullIndex = (colId: string, visibleIndex: number, taskId: string) => {
    const full = columnTasks(colId).filter((t) => t.id !== taskId);
    const vis = full.filter(visible);
    if (visibleIndex < vis.length) return full.indexOf(vis[visibleIndex]);
    return vis.length ? full.indexOf(vis[vis.length - 1]) + 1 : full.length;
  };

  const commitMove = (task: BoardTask, toColumnId: string, visibleIndex: number) => {
    const toIndex = fullIndex(toColumnId, visibleIndex, task.id);
    const sprintId = sprintAfterMove(task, toColumnId, filters, backlogId, sprintsOn);
    const fromName = columnById.get(task.columnId)?.name ?? "its column";
    const toName = columnById.get(toColumnId)?.name ?? "";
    const visCount = (visibleIds[toColumnId] ?? []).filter((id) => id !== task.id).length + 1;
    setAlert(null);
    setFocusTaskId(task.id);
    startTransition(async () => {
      applyOp({ type: "move", taskId: task.id, toColumnId, toIndex, sprintId });
      const r = await moveTask({ taskId: task.id, toColumnId, toIndex, ...(sprintId !== undefined ? { sprintId } : {}) });
      if (!r.ok) {
        setAlert(`Couldn't move '${task.title}'. It's back in ${fromName}.${"error" in r && r.error ? ` ${r.error}` : ""}`);
        setAnnouncement(`Couldn't move ${task.title}. It's back in ${fromName}.`);
        setFocusTaskId(task.id);
      }
    });
    setAnnouncement(`Moved ${task.title} to ${toName}, position ${Math.min(visibleIndex, visCount - 1) + 1} of ${visCount}.`);
  };

  const onMenuMove = (task: BoardTask, target: MoveTarget) => {
    if (target.kind === "column") {
      // To the bottom of the visible list in the new column.
      commitMove(task, target.columnId, (visibleIds[target.columnId] ?? []).length);
      return;
    }
    if (target.kind === "sprint") {
      const name = target.sprintId ? (sprintById.get(target.sprintId)?.name ?? noun) : `no ${noun.toLowerCase()}`;
      setFocusTaskId(task.id);
      void savePatch(task, { field: "sprintId", value: target.sprintId }).then((r) => {
        setAnnouncement(r.ok ? `Moved ${task.title} to ${name}.` : `Couldn't move ${task.title}.`);
        if (!r.ok) setAlert(`Couldn't move '${task.title}' to ${name}. ${r.error ?? ""}`);
      });
      return;
    }
    const ids = visibleIds[task.columnId] ?? [];
    const i = ids.indexOf(task.id);
    const last = ids.length - 1;
    const j = target.to === "top" ? 0 : target.to === "up" ? i - 1 : target.to === "down" ? i + 1 : last;
    if (j === i || j < 0 || j > last) return;
    commitMove(task, task.columnId, j);
  };

  const PATCH_KEY: Record<TaskFieldInput["field"], keyof BoardTask> = {
    title: "title",
    description: "description",
    priority: "priority",
    points: "points",
    assigneeId: "assigneeId",
    sprintId: "sprintId",
    columnId: "columnId",
    dueOn: "dueOn",
    githubUrl: "githubUrl",
  };

  const savePatch = (task: BoardTask, patch: TaskFieldInput): Promise<{ ok: boolean; error?: string }> =>
    new Promise((resolve) => {
      startTransition(async () => {
        if (patch.field === "columnId") {
          applyOp({ type: "move", taskId: task.id, toColumnId: patch.value, toIndex: Number.MAX_SAFE_INTEGER });
        } else {
          applyOp({ type: "patch", taskId: task.id, patch: { [PATCH_KEY[patch.field]]: patch.value } as Partial<BoardTask> });
        }
        const r = await updateTask({ taskId: task.id, ...patch });
        resolve(r.ok ? { ok: true } : { ok: false, error: "error" in r ? r.error : undefined });
      });
    });

  const onCreate = (columnId: string, title: string) => {
    const col = columnById.get(columnId);
    const sprintId = sprintsOn && columnId !== backlogId && filters.sprint !== "all" ? filters.sprint : null;
    const temp: BoardTask = {
      id: `temp-${++tempSeq}`,
      columnId,
      sprintId,
      title,
      description: null,
      priority: "medium",
      points: null,
      assigneeId: filters.assignee === "me" ? me : null,
      dueOn: null,
      githubUrl: null,
      position: Number.MAX_SAFE_INTEGER,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    setAlert(null);
    startTransition(async () => {
      applyOp({ type: "add", task: temp });
      const r = await createTask({ projectId: project.id, columnId, title, sprintId });
      if (!r.ok) {
        setAlert(`Couldn't add '${title}'. ${"error" in r ? r.error : ""}`);
        return;
      }
      if (filters.assignee === "me") await updateTask({ taskId: r.task.id, field: "assigneeId", value: me });
    });
    setAnnouncement(`Added ${title} to ${col?.name ?? "the column"}.`);
  };

  const onDelete = (task: BoardTask) =>
    new Promise<{ ok: boolean; error?: string }>((resolve) => {
      startTransition(async () => {
        applyOp({ type: "delete", taskId: task.id });
        const r = await deleteTask(task.id);
        if (r.ok) setAnnouncement(`Deleted ${task.title}.`);
        resolve(r.ok ? { ok: true } : { ok: false, error: "error" in r ? r.error : undefined });
      });
    });

  // ── drag and drop ────────────────────────────────────────────────────
  // Left/Right jump to the neighbouring column (its first slot); Up/Down
  // move within the column (dnd-kit's sortable getter).
  const dragRef = React.useRef(drag);
  React.useEffect(() => {
    dragRef.current = drag;
  });
  const columnOrder = React.useMemo(() => columns.map((c) => c.id), [columns]);
  const coordinateGetter: KeyboardCoordinateGetter = React.useCallback(
    (event, args) => {
      if (event.code !== "ArrowRight" && event.code !== "ArrowLeft") return sortableKeyboardCoordinates(event, args);
      event.preventDefault();
      const d = dragRef.current;
      const { active, droppableRects } = args.context;
      if (!d || !active) return undefined;
      const activeId = String(active.id);
      const from = Object.keys(d.cols).find((k) => d.cols[k].includes(activeId));
      const i = from ? columnOrder.indexOf(from) : -1;
      const next = columnOrder[i + (event.code === "ArrowRight" ? 1 : -1)];
      const rect = next ? droppableRects.get(next) : undefined;
      if (!rect) return undefined;
      return { x: rect.left + 4, y: rect.top + 4 };
    },
    [columnOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter,
      keyboardCodes: { start: ["Space"], cancel: ["Escape"], end: ["Space", "Enter"] },
    }),
  );

  const containerOf = (id: string, cols: Record<string, string[]>): string | null => {
    if (id in cols) return id;
    return Object.keys(cols).find((k) => cols[k].includes(id)) ?? null;
  };

  const onDragStart = (e: DragStartEvent) => {
    setMenu(null);
    setAlert(null);
    setDrag({ activeId: String(e.active.id), cols: { ...visibleIds } });
  };

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !drag) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = containerOf(activeId, drag.cols);
    const to = containerOf(overId, drag.cols);
    setOverColumn(to);
    if (!from || !to || from === to) return;
    setDrag((d) => {
      if (!d) return d;
      const source = d.cols[from].filter((id) => id !== activeId);
      const dest = [...d.cols[to]];
      const overIndex = dest.indexOf(overId);
      const index = overIndex >= 0 ? overIndex : dest.length;
      dest.splice(index, 0, activeId);
      return { ...d, cols: { ...d.cols, [from]: source, [to]: dest } };
    });
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const d = drag;
    setDrag(null);
    setOverColumn(null);
    if (!d || !over) return;
    const activeId = String(active.id);
    const task = taskById.get(activeId);
    const col = containerOf(activeId, d.cols);
    if (!task || !col) return;
    let ids = d.cols[col];
    const overId = String(over.id);
    if (ids.includes(overId) && overId !== activeId) {
      ids = arrayMove(ids, ids.indexOf(activeId), ids.indexOf(overId));
    }
    const index = ids.indexOf(activeId);
    const original = visibleIds[task.columnId] ?? [];
    if (col === task.columnId && original.indexOf(activeId) === index) {
      setFocusTaskId(activeId);
      return;
    }
    commitMove(task, col, index);
  };

  const positionText = (id: string, colId: string | null, cols: Record<string, string[]>) => {
    if (!colId) return "";
    const list = cols[colId] ?? [];
    const i = list.indexOf(id);
    return `${columnById.get(colId)?.name}, position ${(i < 0 ? list.length : i) + 1} of ${Math.max(list.length, 1)}`;
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${taskById.get(String(active.id))?.title}. ${positionText(String(active.id), containerOf(String(active.id), visibleIds), visibleIds)}.`,
    onDragOver: ({ active, over }) => {
      if (!over) return `${taskById.get(String(active.id))?.title} is not over a column.`;
      const cols = drag?.cols ?? visibleIds;
      const container = containerOf(String(over.id), cols);
      const sortable = over.data.current?.sortable as { index: number; items: string[] } | undefined;
      const name = container ? columnById.get(container)?.name : "";
      const pos = sortable ? `position ${sortable.index + 1} of ${sortable.items.length}` : "position 1";
      return `${taskById.get(String(active.id))?.title}, ${name}, ${pos}.`;
    },
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${taskById.get(String(active.id))?.title} in ${columnById.get(containerOf(String(over.id), drag?.cols ?? visibleIds) ?? "")?.name ?? "the column"}.`
        : `Dropped ${taskById.get(String(active.id))?.title}. It stays where it was.`,
    onDragCancel: ({ active }) => `Cancelled. ${taskById.get(String(active.id))?.title} is back where it was.`,
  };

  const activeTask = drag ? taskById.get(drag.activeId) : null;
  const openTask = openTaskId ? (taskById.get(openTaskId) ?? null) : null;
  const firstWorkColumn = columns.find((c) => c.id !== backlogId) ?? columns[0];
  const selectedSprint = filters.sprint !== "all" ? sprintById.get(filters.sprint) : undefined;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-gutter">
        {sprintsOn ? (
          sprints.length ? (
            <div className="flex min-w-0 items-center gap-2">
              <label htmlFor="sprint-select" className="sr-only">
                {noun}
              </label>
              <div className="w-[min(27rem,calc(100vw-3rem))]">
                <Select id="sprint-select" value={filters.sprint} onChange={(e) => setFilter({ sprint: e.target.value })}>
                  {groupSprints(sprints, project.methodology, today).map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {sprintLabel(s, today)}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  <option value="all">All {noun.toLowerCase()}s</option>
                </Select>
              </div>
              {project.methodology === "safe" && selectedSprint && piOf(selectedSprint.name) ? (
                <Pill className="whitespace-nowrap">{piOf(selectedSprint.name)}</Pill>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              No {noun.toLowerCase()}s yet.{" "}
              <Link href="?view=sprints" className="text-ink underline underline-offset-4 hover:text-accent-text">
                Plan a {noun.toLowerCase()}
              </Link>
            </p>
          )
        ) : null}
        <div className="flex items-center gap-2" role="group" aria-label="Assignee">
          <span className="text-label text-ink-muted uppercase" aria-hidden="true">
            Assignee
          </span>
          <FilterChip pressed={filters.assignee === "all"} onPressedChange={() => setFilter({ assignee: "all" })}>
            Anyone
          </FilterChip>
          <FilterChip pressed={filters.assignee === "me"} onPressedChange={() => setFilter({ assignee: "me" })}>
            Me
          </FilterChip>
        </div>
        {canEdit && firstWorkColumn ? (
          <Button
            variant="outline"
            className="sm:ml-auto"
            onClick={() => {
              setAddingIn(firstWorkColumn.id);
              if (narrow) jumpTo(firstWorkColumn.id);
            }}
          >
            <Plus aria-hidden="true" className="size-4" />
            New task
          </Button>
        ) : null}
      </div>
      {selectedSprint?.goal ? (
        <p className="px-gutter text-sm text-ink-muted">
          <span className="sr-only">{noun} goal: </span>
          {selectedSprint.goal}
        </p>
      ) : null}

      {alert ? (
        <div className="px-gutter">
          <p role="alert" className="flex items-start gap-2 rounded-control border border-danger/40 bg-danger-quiet px-3 py-2 text-sm text-danger">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 flex-none" />
            <span className="min-w-0 flex-1">{alert}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setAlert(null)} className="-my-1 grid size-8 place-items-center rounded-control">
              <X aria-hidden="true" className="size-4" />
            </button>
          </p>
        </div>
      ) : null}
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* Mobile jump strip */}
      {narrow ? (
        <nav aria-label="Columns" className="sticky top-[6.5rem] z-10 border-y border-line bg-surface">
          <ul className="relative flex gap-1 overflow-x-auto px-gutter py-1.5 [scrollbar-width:none]">
            {columns.map((c) => (
              <li key={c.id} className="flex-none">
                <button
                  type="button"
                  aria-current={visibleCol === c.id ? "true" : undefined}
                  onClick={() => jumpTo(c.id)}
                  className="flex min-h-11 items-center gap-1.5 rounded-control px-3 text-sm text-ink-muted aria-[current=true]:bg-surface-2 aria-[current=true]:font-medium aria-[current=true]:text-ink"
                >
                  {c.name}
                  <span className="text-label tabular-nums">{(visibleIds[c.id] ?? []).length}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          const id = drag?.activeId;
          setDrag(null);
          setOverColumn(null);
          if (id) setFocusTaskId(id);
        }}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              "Press Enter to open the task. Press Space to pick it up, the arrow keys to move it, Space to drop it, Escape to cancel. Press M for the Move menu.",
          },
        }}
      >
        <div
          ref={scrollerRef}
          className="relative flex snap-x snap-mandatory gap-3 overflow-x-auto px-gutter pb-4 sm:snap-none"
          style={{ scrollPaddingInline: "var(--spacing-gutter)" }}
        >
          {columns.map((c, ci) => {
            const ids = idsFor(c.id);
            return (
              <BoardColumnView
                key={c.id}
                column={c}
                taskIds={ids}
                canEdit={canEdit}
                isFirst={ci === 0 && tasks.length === 0}
                isOver={overColumn === c.id}
                adding={addingIn === c.id}
                onAddingChange={(o) => setAddingIn(o ? c.id : null)}
                onCreate={(title) => onCreate(c.id, title)}
              >
                {ids.map((id, i) => {
                  const t = taskById.get(id);
                  if (!t) return null;
                  return (
                    <TaskCard
                      key={id}
                      task={t}
                      assignee={t.assigneeId ? (people.get(t.assigneeId) ?? null) : null}
                      done={Boolean(columnById.get(t.columnId)?.isDone)}
                      today={today}
                      dragEnabled={dragEnabled}
                      pendingCreate={id.startsWith("temp-")}
                      onOpen={() => {
                        setOpenTaskId(id);
                        setTaskParam(id);
                      }}
                      menu={{
                        columnId: t.columnId,
                        sprintId: t.sprintId,
                        index: i,
                        count: ids.length,
                        columns,
                        sprints: sprintsOn && sprints.length ? sprints : null,
                        sprintWord: noun,
                        canEdit,
                        panel: menu?.taskId === id ? menu.panel : null,
                        onPanelChange: (panel) => setMenu(panel ? { taskId: id, panel } : null),
                        onOpenTask: () => {
                          setOpenTaskId(id);
                          setTaskParam(id);
                        },
                        onMove: (target) => onMenuMove(t, target),
                        onDelete: () => {
                          setOpenTaskId(id);
                          setTaskParam(id);
                        },
                      }}
                    />
                  );
                })}
              </BoardColumnView>
            );
          })}
        </div>
        <DragOverlay dropAnimation={reducedMotion ? null : { duration: 150, easing: "cubic-bezier(0.23, 1, 0.32, 1)" }}>
          {activeTask ? (
            <DragCard
              task={activeTask}
              assignee={activeTask.assigneeId ? (people.get(activeTask.assigneeId) ?? null) : null}
              done={Boolean(columnById.get(activeTask.columnId)?.isDone)}
              today={today}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {hiddenCount > 0 ? (
        <p className="px-gutter text-sm text-ink-muted">
          {hiddenCount} {hiddenCount === 1 ? "task" : "tasks"} hidden by filters ·{" "}
          <button
            type="button"
            onClick={() => setFilter({ sprint: "all", assignee: "all" })}
            className="text-ink underline underline-offset-4 hover:text-accent-text"
          >
            Clear filters
          </button>
        </p>
      ) : null}

      <TaskSheet
        projectId={project.id}
        task={openTask}
        columns={columns}
        sprints={sprintsOn ? sprints : null}
        people={board.people}
        memberIds={memberIds}
        methodology={project.methodology}
        canEdit={canEdit}
        onClose={() => {
          setOpenTaskId(null);
          setTaskParam(null);
        }}
        onSave={(patch) => (openTask ? savePatch(openTask, patch) : Promise.resolve({ ok: false }))}
        onDelete={() => (openTask ? onDelete(openTask) : Promise.resolve({ ok: false }))}
      />
    </div>
  );
}
