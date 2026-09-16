"use client";

/* FilterChip — a toggle button for filter rows.
 *
 * Consumed by: app/projects (Team / Personal with counts), app/about (people
 * filters), app/events (semester / type filters).
 *
 * Pressed state is a real toggle button, so it carries aria-pressed rather
 * than being faked with a checkbox. It is controlled: the consumer owns
 * `pressed` and decides what a press means (single-select, multi-select,
 * hiding a filter whose count would be zero — that lives in the page, not
 * here).
 *
 * Colour choice: the reference implementation fills the pressed chip with
 * ink, which reads as a third button style next to the accent trigger. This
 * uses the quiet accent instead — accent-quiet ground with accent-text
 * label — so pressed state and the site's accent stay one idea.
 *
 * Motion: transform only, 200ms, and Tailwind v4 already wraps `hover:` in a
 * pointer-capability media query so hover never fires on touch. The
 * transition is CSS, so the universal prefers-reduced-motion block in
 * globals.css flattens it; there is no JS-driven motion here to guard.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FilterChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  pressed: boolean;
  onPressedChange?: (pressed: boolean) => void;
  /** Optional tally rendered inside the label. */
  count?: number;
}

const base =
  "inline-flex items-center gap-1.5 rounded-pill border px-3 py-2 text-label transition-transform duration-200 ease-out hover:-translate-y-px";

export function FilterChip({
  pressed,
  onPressedChange,
  count,
  onClick,
  className,
  children,
  ...props
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={(event) => {
        onClick?.(event);
        onPressedChange?.(!pressed);
      }}
      className={cn(
        base,
        pressed
          ? "border-transparent bg-accent-quiet text-accent-text"
          : "border-line bg-surface-2 text-ink-muted",
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {/* Inherits the chip's own colour: a second colour here would need its
          own contrast check against both grounds. */}
      {count !== undefined && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
