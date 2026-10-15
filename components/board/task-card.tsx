"use client";

/* A board card (docs/DESIGN-BRIEF.md §8): title (3-line clamp), then
 * priority glyph, points, due date, GitHub icon, and the assignee avatar
 * (or a dashed empty circle) pinned right. The card's main control is a
 * <button> that opens the task; it is also the drag activator (pointer: 4px
 * distance; keyboard: Space lifts, arrows move, Space drops, Esc cancels).
 * `M` on it opens the Move menu. While dragging, the card's slot renders as
 * a 2px accent insertion line and a DragOverlay carries the lifted card. */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Github } from "lucide-react";
import * as React from "react";

import type { BoardTask, PersonRef } from "@/lib/data/pm";
import { cn } from "@/lib/utils";

import { dueState, shortDate } from "./board-utils";
import { CardMenu, type CardMenuProps } from "./card-menu";
import { EmptyAvatar, PersonAvatar, PriorityGlyph } from "./meta";

export interface CardFaceProps {
  task: BoardTask;
  assignee: PersonRef | null;
  done: boolean;
  today: string;
}

/** The visual content shared by the card and its drag overlay. */
export function CardFace({ task, assignee, done, today }: CardFaceProps) {
  const due = task.dueOn ? dueState(task.dueOn, today, done) : null;
  return (
    <>
      <p className="line-clamp-3 pr-9 text-sm font-medium text-ink [overflow-wrap:anywhere] sm:pr-7">{task.title}</p>
      <div className="mt-2 flex min-h-6 items-center gap-3 text-xs text-ink-muted">
        <PriorityGlyph priority={task.priority} />
        {task.points !== null ? <span className="tabular-nums">{task.points} pt</span> : null}
        {task.dueOn ? (
          <span
            className={cn(
              "tabular-nums",
              due === "overdue" && "font-medium text-danger",
              due === "soon" && "text-warning",
            )}
          >
            {due === "overdue" ? "Overdue · " : null}
            <span className="sr-only">Due </span>
            {shortDate(task.dueOn)}
          </span>
        ) : null}
        {task.githubUrl ? (
          <span className="inline-flex">
            <Github aria-hidden="true" className="size-3.5" />
            <span className="sr-only">Linked on GitHub</span>
          </span>
        ) : null}
        <span className="ml-auto">
          {assignee ? (
            <span title={assignee.name} className="inline-flex">
              <PersonAvatar name={assignee.name} photo={assignee.photo} />
              <span className="sr-only">Assigned to {assignee.name}</span>
            </span>
          ) : (
            <EmptyAvatar />
          )}
        </span>
      </div>
    </>
  );
}

export interface TaskCardProps extends CardFaceProps {
  dragEnabled: boolean;
  pendingCreate?: boolean;
  onOpen: () => void;
  menu: Omit<CardMenuProps, "taskTitle" | "returnFocusTo">;
}

export function TaskCard({ task, assignee, done, today, dragEnabled, pendingCreate, onOpen, menu }: TaskCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: !dragEnabled || pendingCreate,
  });
  const mainRef = React.useRef<HTMLButtonElement | null>(null);

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <li ref={setNodeRef} style={style} aria-hidden="true" className="py-1">
        <div className="h-0.5 rounded-pill bg-accent" />
      </li>
    );
  }

  return (
    <li ref={setNodeRef} style={style} data-task-id={task.id}>
      <div
        className={cn(
          "relative rounded-card border border-line bg-surface p-3 transition-colors hover:border-line-strong",
          pendingCreate && "opacity-60",
        )}
      >
        <button
          ref={(el) => {
            mainRef.current = el;
            setActivatorNodeRef(el);
          }}
          type="button"
          data-card-button
          {...attributes}
          {...listeners}
          aria-roledescription={dragEnabled ? "draggable task" : undefined}
          aria-disabled={pendingCreate || undefined}
          aria-label={task.title}
          disabled={pendingCreate}
          onClick={onOpen}
          onKeyDown={(e) => {
            if ((e.key === "m" || e.key === "M") && !e.metaKey && !e.ctrlKey && !e.altKey && menu.canEdit) {
              e.preventDefault();
              menu.onPanelChange("move");
              return;
            }
            listeners?.onKeyDown?.(e);
          }}
          className="absolute inset-0 z-0 w-full cursor-pointer rounded-card text-left"
        />
        <div className="pointer-events-none relative">
          <CardFace task={task} assignee={assignee} done={done} today={today} />
        </div>
        {!pendingCreate ? (
          <div className="absolute top-1 right-1 z-10 sm:top-1.5 sm:right-1.5">
            <CardMenu {...menu} taskTitle={task.title} returnFocusTo={() => mainRef.current} />
          </div>
        ) : null}
      </div>
    </li>
  );
}

/** The lifted card under the pointer while dragging: lift shadow + 2° tilt,
 *  no tilt under prefers-reduced-motion. */
export function DragCard(props: CardFaceProps) {
  return (
    <div className="cursor-grabbing rounded-card border border-line-strong bg-surface p-3 shadow-xl motion-safe:rotate-2">
      <CardFace {...props} />
    </div>
  );
}
