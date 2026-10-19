"use client";

/* The card's "⋯" menu (keyboard / no-drag fallback). Panels:
 *   main   Open task · Move… · Delete…
 *   move   the columns (current one disabled) · Move to top / up / down /
 *          bottom · Move to sprint ▸
 *   sprint the sprints + "No sprint" · ◂ Back
 * `M` on a focused card opens it straight at the move panel. The popover is
 * position: fixed (columns scroll, so an absolute panel would be clipped).
 * Arrow keys move, Esc closes and returns focus to the trigger. */

import { Check, ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import * as React from "react";
import { createPortal } from "react-dom";

import type { BoardColumn, BoardSprint } from "@/lib/data/pm";
import { cn } from "@/lib/utils";

export type MoveTarget =
  | { kind: "column"; columnId: string }
  | { kind: "position"; to: "top" | "up" | "down" | "bottom" }
  | { kind: "sprint"; sprintId: string | null };

export type MenuPanel = "main" | "move" | "sprint";

export interface CardMenuProps {
  taskTitle: string;
  columnId: string;
  sprintId: string | null;
  /** Position within the visible column, 0-based, and that column's size. */
  index: number;
  count: number;
  columns: BoardColumn[];
  sprints: BoardSprint[] | null;
  sprintWord: string;
  canEdit: boolean;
  /** Controlled open panel (null = closed). */
  panel: MenuPanel | null;
  onPanelChange: (panel: MenuPanel | null) => void;
  onOpenTask: () => void;
  onMove: (target: MoveTarget) => void;
  onDelete: () => void;
  /** Where focus goes when the menu closes without an action. */
  returnFocusTo?: () => HTMLElement | null;
}

type Item =
  | { type: "divider" }
  | { type: "label"; text: string }
  | {
      type: "item";
      label: React.ReactNode;
      key: string;
      disabled?: boolean;
      checked?: boolean;
      danger?: boolean;
      sub?: boolean;
      back?: boolean;
      run: () => void;
    };

export function CardMenu(props: CardMenuProps) {
  const { panel, onPanelChange, taskTitle, canEdit } = props;
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(
    null,
  );
  const menuId = React.useId();

  // Latest callbacks in a ref, so effects below only re-run when the panel
  // changes (re-running them would steal focus back to the first item).
  const latest = React.useRef({
    onPanelChange,
    returnFocusTo: props.returnFocusTo,
  });
  React.useEffect(() => {
    latest.current = { onPanelChange, returnFocusTo: props.returnFocusTo };
  });
  const close = React.useCallback((refocus = true) => {
    latest.current.onPanelChange(null);
    if (refocus)
      (latest.current.returnFocusTo?.() ?? buttonRef.current)?.focus();
  }, []);

  // Place the panel under the trigger, inside the viewport.
  React.useLayoutEffect(() => {
    if (!panel) return;
    const place = () => {
      const r = buttonRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = 240;
      const left = Math.max(
        8,
        Math.min(r.right - width, window.innerWidth - width - 8),
      );
      const menuH = menuRef.current?.offsetHeight ?? 0;
      const below = r.bottom + 4;
      const top =
        below + menuH > window.innerHeight - 8
          ? Math.max(8, r.top - menuH - 4)
          : below;
      setPos({ top, left });
    };
    place();
    // Follow the trigger when the page or a column scrolls.
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [panel]);

  // Focus the first enabled item whenever a panel opens; outside click closes.
  React.useEffect(() => {
    if (!panel) return;
    const first = menuRef.current?.querySelector<HTMLElement>(
      '[role^="menuitem"]:not([aria-disabled="true"])',
    );
    first?.focus({ preventScroll: true });
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menuRef.current?.contains(t) && !buttonRef.current?.contains(t))
        close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [panel, close]);

  const items: Item[] = [];
  if (panel === "main") {
    items.push({
      type: "item",
      key: "open",
      label: "Open task",
      run: () => (onPanelChange(null), props.onOpenTask()),
    });
    if (canEdit) {
      items.push({
        type: "item",
        key: "move",
        label: "Move…",
        sub: true,
        run: () => onPanelChange("move"),
      });
      items.push({ type: "divider" });
      items.push({
        type: "item",
        key: "delete",
        label: "Delete…",
        danger: true,
        run: () => (onPanelChange(null), props.onDelete()),
      });
    }
  } else if (panel === "move") {
    items.push({ type: "label", text: "Column" });
    for (const c of props.columns) {
      const current = c.id === props.columnId;
      items.push({
        type: "item",
        key: `col-${c.id}`,
        label: c.name,
        checked: current,
        disabled: current,
        run: () => (
          onPanelChange(null),
          props.onMove({ kind: "column", columnId: c.id })
        ),
      });
    }
    items.push({ type: "divider" });
    const atTop = props.index <= 0;
    const atBottom = props.index >= props.count - 1;
    const pos = (
      to: "top" | "up" | "down" | "bottom",
      label: string,
      disabled: boolean,
    ) =>
      items.push({
        type: "item",
        key: to,
        label,
        disabled,
        run: () => (
          onPanelChange(null),
          props.onMove({ kind: "position", to })
        ),
      });
    pos("top", "Move to top", atTop);
    pos("up", "Move up", atTop);
    pos("down", "Move down", atBottom);
    pos("bottom", "Move to bottom", atBottom);
    if (props.sprints) {
      items.push({ type: "divider" });
      items.push({
        type: "item",
        key: "sprint",
        label: `Move to ${props.sprintWord.toLowerCase()}`,
        sub: true,
        run: () => onPanelChange("sprint"),
      });
    }
  } else if (panel === "sprint" && props.sprints) {
    items.push({
      type: "item",
      key: "back",
      label: "Back",
      back: true,
      run: () => onPanelChange("move"),
    });
    items.push({ type: "divider" });
    items.push({
      type: "item",
      key: "none",
      label: `No ${props.sprintWord.toLowerCase()}`,
      checked: props.sprintId === null,
      disabled: props.sprintId === null,
      run: () => (
        onPanelChange(null),
        props.onMove({ kind: "sprint", sprintId: null })
      ),
    });
    for (const s of props.sprints) {
      items.push({
        type: "item",
        key: `s-${s.id}`,
        label: s.name,
        checked: props.sprintId === s.id,
        disabled: props.sprintId === s.id,
        run: () => (
          onPanelChange(null),
          props.onMove({ kind: "sprint", sprintId: s.id })
        ),
      });
    }
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role^="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    );
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      if (panel === "sprint") onPanelChange("move");
      else close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      els[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      els[els.length - 1]?.focus();
    } else if (e.key === "ArrowLeft" && panel === "sprint") {
      e.preventDefault();
      onPanelChange("move");
    } else if (e.key === "Tab") {
      close(false);
    }
  };

  const title =
    panel === "move"
      ? `Move ${taskTitle}`
      : panel === "sprint"
        ? `Move ${taskTitle} to ${props.sprintWord.toLowerCase()}`
        : `Actions for ${taskTitle}`;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Actions for ${taskTitle}`}
        aria-haspopup="menu"
        aria-expanded={Boolean(panel)}
        aria-controls={panel ? menuId : undefined}
        onClick={() => (panel ? close() : onPanelChange("main"))}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !panel) {
            e.preventDefault();
            onPanelChange("main");
          }
        }}
        className="grid size-11 flex-none place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink aria-expanded:bg-surface-2 aria-expanded:text-ink sm:size-8"
      >
        <Ellipsis aria-hidden="true" className="size-4" />
      </button>
      {panel
        ? createPortal(
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={title}
              onKeyDown={onKeyDown}
              style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
              className="fixed z-50 w-60 rounded-card border border-line bg-surface p-1 shadow-lg"
            >
              {items.map((it, i) => {
                if (it.type === "divider")
                  return (
                    <div
                      key={`d${i}`}
                      role="separator"
                      className="my-1 border-t border-line"
                    />
                  );
                if (it.type === "label") {
                  return (
                    <div
                      key={`l${i}`}
                      role="presentation"
                      className="px-3 pt-1.5 pb-1 text-label text-ink-muted uppercase"
                    >
                      {it.text}
                    </div>
                  );
                }
                return (
                  <button
                    key={it.key}
                    type="button"
                    role={
                      it.checked !== undefined ? "menuitemradio" : "menuitem"
                    }
                    aria-checked={
                      it.checked !== undefined ? it.checked : undefined
                    }
                    aria-disabled={it.disabled || undefined}
                    aria-haspopup={it.sub ? "menu" : undefined}
                    tabIndex={-1}
                    onClick={() => {
                  if (it.disabled) return;
                  // Leaving the menu: put focus back on the card first, so a
                  // sheet opened next returns focus there when it closes.
                  if (!it.sub && !it.back) {
                    (latest.current.returnFocusTo?.() ?? buttonRef.current)?.focus({ preventScroll: true });
                  }
                  it.run();
                }}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-2 rounded-control px-3 text-left text-sm sm:min-h-9",
                      it.danger
                        ? "text-danger hover:bg-danger-quiet focus-visible:bg-danger-quiet"
                        : "text-ink hover:bg-surface-1 focus-visible:bg-surface-1",
                      it.disabled &&
                        "cursor-default text-ink-muted hover:bg-transparent",
                    )}
                  >
                    {it.back ? (
                      <ChevronLeft
                        aria-hidden="true"
                        className="size-4 flex-none"
                      />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    {it.checked ? (
                      <Check aria-hidden="true" className="size-4 flex-none" />
                    ) : null}
                    {it.sub ? (
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 flex-none text-ink-muted"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
