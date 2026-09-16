/* MicroLabel — the small uppercase line above or beside content: class
 * years, dates, rooms, semesters, project ids. Server-safe.
 *
 * Consumed by: app/about (class line), app/events (date + room),
 * app/projects (project meta).
 *
 * Four things it exists to stop being re-guessed:
 *  - size: text-label (13px, the floor). Never a sub-13px arbitrary size.
 *  - tracking: text-label already carries its letter-spacing. No tracking
 *    utility here, or it gets applied twice.
 *  - width axis: body copy runs condensed, labels snap back to normal width.
 *    globals.css exposes no utility for that (its only width rule is the
 *    base-layer one for <small>/<figcaption>), so it is set inline here
 *    against the same token globals uses. Not a raw ramp value.
 *  - colour: text-ink-muted, and NOT text-ink-faint. This looks like the
 *    wrong default and is not — please do not "fix" it back. A micro-label
 *    carries content (dates, rooms, class years), so at 13px it is small
 *    text and owes 4.5:1. ink-faint maps to the same ramp step as
 *    line-strong and measures 3.75:1 on light surface — fine for a 3.0:1
 *    hairline, well short of the requirement for text. (TOKENS.md claims
 *    4.3 for this pair; /preview measures the rendered value at 3.75, so
 *    the argument here is stronger than the doc suggests.) ink-muted
 *    measures 6.3:1.
 *    DO NOT pass a colour through className expecting it to win: cn() is a
 *    plain join with no conflict resolution, and at equal specificity the
 *    winner is stylesheet emission order — measured, .text-accent-text
 *    emits BEFORE .text-ink-muted, so the override silently loses. To
 *    recolour a label, put the colour class on a child element (declared
 *    beats inherited regardless of order) — see the news date chip in
 *    app/home-sections.tsx for the worked example.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type MicroLabelElement = "span" | "p" | "div" | "dt" | "dd" | "h2" | "h3";

export interface MicroLabelProps extends React.HTMLAttributes<HTMLElement> {
  as?: MicroLabelElement;
}

const WIDTH_AXIS: React.CSSProperties = {
  fontVariationSettings: '"wdth" var(--wdth-normal)',
};

export function MicroLabel({
  as = "span",
  className,
  style,
  children,
  ...props
}: MicroLabelProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp
      className={cn("text-label uppercase text-ink-muted", className)}
      style={{ ...WIDTH_AXIS, ...style }}
      {...props}
    >
      {children}
    </Comp>
  );
}
