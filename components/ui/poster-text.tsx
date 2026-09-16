/* PosterText — the only way to render the poster face. Server-safe.
 *
 * Consumed by: app/about, app/events, app/projects (page titles), and any
 * other display heading. The hero and footer wordmark have their own
 * measured sizing but still go through the same .poster trim.
 *
 * The poster face's ascent runs far above its caps, so any of it not inside
 * .poster carries ~0.24em of empty box and looks like it is floating.
 * .poster in globals.css already sets the family, weight, line-height and
 * the measured negative margins that trim it — so this component is that
 * class plus a size, and nothing renders the face without it.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type PosterSize = "sm" | "md" | "lg";
type PosterElement = "h1" | "h2" | "p" | "span";

export interface PosterTextProps extends React.HTMLAttributes<HTMLElement> {
  size: PosterSize;
  as?: PosterElement;
}

/* Written out in full: Tailwind finds utilities by scanning source text, so
   a constructed `text-poster-${size}` would never be generated. */
const sizeStyles: Record<PosterSize, string> = {
  sm: "text-poster-sm",
  md: "text-poster-md",
  lg: "text-poster-lg",
};

export function PosterText({
  size,
  as = "p",
  className,
  children,
  ...props
}: PosterTextProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp className={cn("poster", sizeStyles[size], className)} {...props}>
      {children}
    </Comp>
  );
}
