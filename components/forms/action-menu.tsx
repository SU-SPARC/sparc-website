"use client";

/* ActionMenu — the row "⋯" menu (brief §2): a button with
 * aria-haspopup="menu" opening a small list of menuitems. Arrow keys move,
 * Esc closes and returns focus to the button, clicking outside closes.
 * Items: links (internal or external ↗), callbacks, dividers. A "Delete…"
 * item should open a ConfirmDialog rendered OUTSIDE this menu (the menu
 * closes first, so no dialog-in-menu). */

import { ArrowUpRight, Ellipsis } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { cn } from "@/lib/utils";

export type ActionMenuItem =
  | { type: "divider" }
  | {
      type?: "item";
      label: string;
      href?: string;
      external?: boolean;
      onSelect?: () => void;
      tone?: "danger";
      disabled?: boolean;
    };

export interface ActionMenuProps {
  /** Accessible name: "Actions for Fall kickoff". */
  label: string;
  items: ActionMenuItem[];
  /** Align the panel to the button's end (default) or start. */
  align?: "end" | "start";
}

export function ActionMenu({ label, items, align = "end" }: ActionMenuProps) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const menuId = React.useId();

  const itemsEls = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);

  React.useEffect(() => {
    if (!open) return;
    itemsEls()[0]?.focus();
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const els = itemsEls();
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

  const itemClass = (tone?: "danger", disabled?: boolean) =>
    cn(
      "flex min-h-11 w-full items-center justify-between gap-3 rounded-control px-3 text-left text-sm sm:min-h-9",
      tone === "danger" ? "text-danger hover:bg-danger-quiet focus-visible:bg-danger-quiet" : "text-ink hover:bg-surface-1",
      disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
    );

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="grid size-11 place-items-center rounded-control text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink aria-expanded:bg-surface-2 aria-expanded:text-ink sm:size-8"
      >
        <Ellipsis aria-hidden="true" className="size-4" />
      </button>
      {open ? (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onKeyDown}
          className={cn(
            "absolute top-full z-30 mt-1 min-w-[13rem] rounded-card border border-line bg-surface p-1 shadow-lg",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {items.map((item, i) => {
            if (item.type === "divider") {
              return <div key={`d${i}`} role="separator" className="my-1 border-t border-line" />;
            }
            if (item.href && !item.disabled) {
              const content = (
                <>
                  {item.label}
                  {item.external ? <ArrowUpRight aria-hidden="true" className="size-4 text-ink-muted" /> : null}
                </>
              );
              return item.external ? (
                <a
                  key={item.label}
                  role="menuitem"
                  tabIndex={-1}
                  href={item.href}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => close(false)}
                  className={itemClass(item.tone)}
                >
                  {content}
                </a>
              ) : (
                <Link
                  key={item.label}
                  role="menuitem"
                  tabIndex={-1}
                  href={item.href}
                  onClick={() => close(false)}
                  className={itemClass(item.tone)}
                >
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                onClick={() => {
                  if (item.disabled) return;
                  // Focus the trigger first so a dialog opened by onSelect
                  // returns focus there when it closes.
                  buttonRef.current?.focus();
                  setOpen(false);
                  item.onSelect?.();
                }}
                className={itemClass(item.tone, item.disabled)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
