/* Pill — a small status badge. Server-safe, no state, no motion.
 *
 * Consumed by: app/about (member badges), app/events (type tags),
 * app/projects (status tags).
 *
 * The pill is a container only: it holds whatever the consumer passes and
 * knows nothing about what badges exist.
 *
 * The wrap rules are load-bearing, not cosmetic. A pill with
 * `white-space: nowrap` clipped its own label at 232px card width, so
 * max-w-full + whitespace-normal + overflow-wrap are baked into the base
 * class and cannot be forgotten at a call site.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

type PillVariant = "filled" | "outline";

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: PillVariant;
}

const base =
  "inline-block max-w-full whitespace-normal [overflow-wrap:anywhere] rounded-pill px-2.5 py-1.5 text-label";

const variantStyles: Record<PillVariant, string> = {
  filled: "bg-accent text-on-accent",
  outline: "border border-line-strong bg-transparent text-ink",
};

export function Pill({
  variant = "outline",
  className,
  children,
  ...props
}: PillProps) {
  return (
    <span className={cn(base, variantStyles[variant], className)} {...props}>
      {children}
    </span>
  );
}
