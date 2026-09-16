"use client";

/* Expand — THE expand/collapse mechanism for this codebase.
 *
 * There is exactly one of these. /about member cards, /events rows and
 * /projects rows all mount this component; none of them re-implement the
 * animation. The mechanism is the `0fr -> 1fr` grid row from
 * design/COMPONENTS.md: it animates to the content's real height with no JS
 * measurement and no max-height to overflow.
 *
 * Consumed by: app/about (people cards), app/events (event rows),
 * app/projects (project rows).
 *
 * Ownership of state: the CONSUMER owns `open` and renders the trigger.
 * `aria-expanded` belongs on the button, never on the card — use
 * <ExpandTrigger> (or your own button carrying aria-expanded +
 * aria-controls={id}) and give <Expand> the matching `id`.
 *
 * Reduced motion: every moving part here is a CSS transition, and
 * globals.css carries a universal prefers-reduced-motion block that flattens
 * transition-duration with !important (important author declarations beat
 * inline styles, so the inline transition below is flattened too). No
 * JS-driven motion exists in this file, so no extra guard is required.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

/* Translated verbatim from design/COMPONENTS.md "The shared expand".
   Kept as an inline style rather than utilities because the three
   properties carry two different durations (260 / 200 / 260). */
const EXPAND_TRANSITION: React.CSSProperties = {
  transitionProperty: "grid-template-rows, opacity, margin-top",
  transitionDuration: "260ms, 200ms, 260ms",
  transitionTimingFunction: "var(--ease-out)",
};

export interface ExpandProps {
  /** Owned by the consumer. Drives the animation and the a11y state. */
  open: boolean;
  /** Match this to the trigger's aria-controls. */
  id?: string;
  className?: string;
  children: React.ReactNode;
}

export function Expand({ open, id, className, children }: ExpandProps) {
  return (
    <div
      id={id}
      aria-hidden={!open}
      inert={!open}
      className={cn(
        "grid",
        open ? "mt-[10px] grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0",
        className,
      )}
      style={EXPAND_TRANSITION}
    >
      {/* overflow-hidden + min-h-0 is what lets the 0fr row actually clip. */}
      <div className="min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

export interface ExpandIconProps {
  open: boolean;
  className?: string;
}

/** The `+` that rotates 45 degrees into a `x`. Transform only, 200ms. */
export function ExpandIcon({ open, className }: ExpandIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-[15px] place-items-center transition-transform duration-200 ease-out",
        open && "rotate-45",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-full">
        <path
          d="M12 5v14M5 12h14"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export interface ExpandTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  open: boolean;
  /** id of the <Expand> this controls. */
  controls: string;
  /** Called after the consumer's own onClick. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Optional helper. Carries aria-expanded + aria-controls so consumers cannot
 * put them on the card by mistake. It renders an icon by default and has no
 * text, so the consumer MUST pass an aria-label describing the target.
 * Hover is a transform only; Tailwind v4 already wraps `hover:` in a
 * pointer-capability media query, so it never fires on touch.
 */
export function ExpandTrigger({
  open,
  controls,
  onOpenChange,
  onClick,
  className,
  children,
  ...props
}: ExpandTriggerProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={controls}
      onClick={(event) => {
        onClick?.(event);
        onOpenChange?.(!open);
      }}
      className={cn(
        "grid size-[30px] flex-none place-items-center rounded-pill",
        "bg-accent text-on-accent transition-transform duration-200 ease-out",
        "hover:scale-105",
        className,
      )}
      {...props}
    >
      {children ?? <ExpandIcon open={open} />}
    </button>
  );
}
