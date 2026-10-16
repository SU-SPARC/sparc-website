"use client";

/* UpDownButtons — reorder one item by swapping with its neighbour
 * (brief §2: up/down, not drag, not a number field). Two 32px icon buttons
 * (44px on touch), disabled at the ends. After a move the focus stays on the
 * same button in the moved row; if that button is now disabled (the row
 * reached an end), focus moves to its sibling.
 *
 *   <UpDownButtons itemLabel="Allan Nguyen" isFirst={i === 0}
 *     isLast={i === rows.length - 1} onMove={moveMember.bind(null, id)} />
 *
 * `onMove` gets "up" | "down" ("earlier"/"later" in the horizontal variant
 * map to the same values) and may be a bound server action. */

import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export type MoveDirection = "up" | "down";

export interface UpDownButtonsProps {
  itemLabel: string;
  isFirst: boolean;
  isLast: boolean;
  onMove: (direction: MoveDirection) => unknown | Promise<unknown>;
  /** "vertical" = ↑/↓ "Move X up"; "horizontal" = ←/→ "Move X earlier". */
  orientation?: "vertical" | "horizontal";
  disabled?: boolean;
}

const btn =
  "grid size-11 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:bg-transparent sm:size-8";

export function UpDownButtons({
  itemLabel,
  isFirst,
  isLast,
  onMove,
  orientation = "vertical",
  disabled,
}: UpDownButtonsProps) {
  const [pending, startTransition] = React.useTransition();
  const upRef = React.useRef<HTMLButtonElement>(null);
  const downRef = React.useRef<HTMLButtonElement>(null);
  const refocus = React.useRef<MoveDirection | null>(null);

  // After the list re-renders, put focus back where the user expects it.
  React.useEffect(() => {
    if (pending || !refocus.current) return;
    const dir = refocus.current;
    refocus.current = null;
    const primary = dir === "up" ? upRef.current : downRef.current;
    const fallback = dir === "up" ? downRef.current : upRef.current;
    const target = primary && !primary.disabled ? primary : fallback;
    target?.focus();
  });

  const move = (dir: MoveDirection) => {
    refocus.current = dir;
    startTransition(async () => {
      await onMove(dir);
    });
  };

  const horizontal = orientation === "horizontal";
  const UpIcon = horizontal ? ArrowLeft : ArrowUp;
  const DownIcon = horizontal ? ArrowRight : ArrowDown;
  const upWord = horizontal ? "earlier" : "up";
  const downWord = horizontal ? "later" : "down";

  return (
    <div className={cn("flex gap-1", !horizontal && "max-sm:flex-col")} aria-busy={pending || undefined}>
      <button
        ref={upRef}
        type="button"
        className={btn}
        disabled={disabled || pending || isFirst}
        aria-label={`Move ${itemLabel} ${upWord}`}
        onClick={() => move("up")}
      >
        <UpIcon aria-hidden="true" className="size-4" />
      </button>
      <button
        ref={downRef}
        type="button"
        className={btn}
        disabled={disabled || pending || isLast}
        aria-label={`Move ${itemLabel} ${downWord}`}
        onClick={() => move("down")}
      >
        <DownIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
