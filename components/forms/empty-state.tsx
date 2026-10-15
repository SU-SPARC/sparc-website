/* EmptyState — inside the list area: title, one line of purpose, one
 * action. No illustration, no icon in a tinted circle (brief §12).
 * Server-safe. */

import * as React from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  /** Bordered box (default) or bare, for nesting in a card. */
  bare?: boolean;
  className?: string;
}

export function EmptyState({ title, children, action, bare, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 px-6 py-12 text-center",
        !bare && "rounded-card border border-line",
        className,
      )}
    >
      <p className="text-sm font-medium text-ink">{title}</p>
      {children ? <div className="max-w-[32rem] text-sm text-ink-muted">{children}</div> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
