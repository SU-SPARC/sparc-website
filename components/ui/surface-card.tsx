/* SurfaceCard — the raised panel every list item sits in. Server-safe.
 *
 * Consumed by: app/about (member cards), app/events (event rows),
 * app/projects (project rows).
 *
 * Named surface-card, not card: components/ui/card.tsx is the legacy shadcn
 * card and is still imported by live pages. This is the redesign's card and
 * they coexist.
 *
 * `open` writes the `data-open` attribute, which is the styling hook the
 * reference implementation keys off ([data-open] descendants). Note that
 * <Expand> itself is driven by its own `open` prop — one source of truth,
 * one animation — so `data-open` here is for everything else a card wants to
 * restyle while open (trigger, borders, photo treatment).
 *
 * Padding is a prop, not a class to override: cn() is a plain join with no
 * conflict resolution, so a `p-0` passed via className would race the base
 * `p-4` in the cascade. Media-first cards pass padded={false} and pad their
 * own body.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type SurfaceCardElement = "div" | "article" | "li";

export interface SurfaceCardProps extends React.HTMLAttributes<HTMLElement> {
  as?: SurfaceCardElement;
  /** Sets data-open when true, absent when false. */
  open?: boolean;
  /** Default true. false = no padding, for cards with a full-bleed image. */
  padded?: boolean;
}

export function SurfaceCard({
  as = "div",
  open,
  padded = true,
  className,
  children,
  ...props
}: SurfaceCardProps) {
  const Comp = as as React.ElementType;
  return (
    <Comp
      /* Deliberately undefined rather than false: React renders
         data-open="false" for a boolean false, and [data-open] matches it. */
      data-open={open ? "" : undefined}
      className={cn(
        "rounded-card border border-line bg-surface-1",
        padded && "p-4",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
