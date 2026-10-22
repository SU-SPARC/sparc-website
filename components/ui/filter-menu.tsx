"use client";

/* FilterMenu — a dropdown filter button for list toolbars. The button reads
 * the dimension ("Type", "Term", "Place") while nothing is chosen and the
 * chosen value once something is, in the quiet-accent pressed look of a
 * FilterChip. The panel is a menu of menuitemradio rows (single-select) or
 * menuitemcheckbox rows (multi-select), each with a count.
 *
 * Keyboard, as ActionMenu: Enter, Space or ArrowDown on the button opens,
 * Arrow keys move and wrap, Home/End jump, Esc closes and returns focus to
 * the button, Tab and clicking outside close. Choosing a radio closes the
 * menu; toggling a checkbox keeps it open.
 *
 * The panel hangs from the button's start edge, or its end edge when the
 * button sits in the right half of the viewport, which keeps it on screen;
 * its width is also capped at the viewport minus the two page gutters. */

import { Check, ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export type FilterMenuOption = { key: string; label: string; count: number };

type Single = {
  kind: "single";
  value: string;
  onChange: (key: string) => void;
  /** the option that means "no filter"; the button shows `label` while it is chosen */
  allKey: string;
};

type Multi = {
  kind: "multi";
  values: string[];
  onToggle: (key: string) => void;
  /** button text when nothing is chosen, e.g. "Any place" */
  emptyLabel: string;
};

export interface FilterMenuProps {
  /** the dimension: "Type", "Term", "Place" — the accessible name of the menu */
  label: string;
  options: FilterMenuOption[];
  select: Single | Multi;
  className?: string;
}

function isChecked(select: Single | Multi, key: string): boolean {
  return select.kind === "single" ? select.value === key : select.values.includes(key);
}

/** Is the list narrowed by this dimension? */
function isFiltering(select: Single | Multi): boolean {
  return select.kind === "single" ? select.value !== select.allKey : select.values.length > 0;
}

/** The button's text: the dimension (or `emptyLabel`) while nothing is chosen;
 *  the chosen value; "A, B" for two; "A +N" for more, in option order. */
function buttonText(label: string, options: FilterMenuOption[], select: Single | Multi): string {
  if (select.kind === "single") {
    if (select.value === select.allKey) return label;
    return options.find((o) => o.key === select.value)?.label ?? label;
  }
  const chosen = options.filter((o) => select.values.includes(o.key)).map((o) => o.label);
  const [first, ...rest] = chosen;
  if (first === undefined) return select.emptyLabel;
  if (rest.length <= 1) return chosen.join(", ");
  return `${first} +${rest.length}`;
}

export function FilterMenu({ label, options, select, className }: FilterMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [side, setSide] = React.useState<"start" | "end">("start");
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  const itemEls = () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []);

  React.useEffect(() => {
    if (!open) return;
    // The chosen radio, else the first row; a checkbox menu always starts at the top.
    const checked = menuRef.current?.querySelector<HTMLElement>('[role="menuitemradio"][aria-checked="true"]');
    (checked ?? itemEls()[0])?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const openMenu = () => {
    // Anchor the panel to whichever edge keeps it inside the viewport.
    const rect = buttonRef.current?.getBoundingClientRect();
    setSide(rect && rect.left + rect.width / 2 > window.innerWidth / 2 ? "end" : "start");
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onMenuKeyDown = (e: React.KeyboardEvent) => {
    const els = itemEls();
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
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
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const choose = (key: string) => {
    if (select.kind === "single") {
      select.onChange(key);
      close();
    } else {
      select.onToggle(key);
    }
  };

  const filtering = isFiltering(select);
  const text = buttonText(label, options, select);

  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? close(false) : openMenu())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            openMenu();
          }
        }}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-pill border px-3 py-2 text-label transition-colors sm:min-h-9",
          filtering
            ? "border-transparent bg-accent-quiet text-accent-text"
            : "border-line bg-surface-2 text-ink-muted hover:text-ink",
        )}
      >
        {/* Screen readers hear the dimension even when the button shows a value. */}
        {text !== label ? <span className="sr-only">{label}: </span> : null}
        <span>{text}</span>
        <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className={cn(
            "absolute top-full z-30 mt-1 min-w-[12rem] max-w-[calc(100vw-3rem)] rounded-card border border-line bg-surface p-1 shadow-lg",
            side === "end" ? "right-0" : "left-0",
          )}
        >
          {options.map((option) => {
            const checked = isChecked(select, option.key);
            return (
              <button
                key={option.key}
                type="button"
                role={select.kind === "single" ? "menuitemradio" : "menuitemcheckbox"}
                aria-checked={checked}
                tabIndex={-1}
                onClick={() => choose(option.key)}
                className="flex min-h-11 w-full items-center gap-2 rounded-control px-2 text-left text-sm text-ink hover:bg-surface-1 sm:min-h-9"
              >
                <span aria-hidden="true" className="grid size-4 flex-none place-items-center">
                  {checked ? <Check className="size-4" /> : null}
                </span>
                <span className="flex-1 text-ink">{option.label}</span>
                <span className="tabular-nums text-ink-muted">{option.count}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
