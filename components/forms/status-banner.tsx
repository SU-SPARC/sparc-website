"use client";

/* StatusBanner — one-line result message where the action happened
 * (no toasts). role="status" (polite) for results; pass
 * tone="danger" with `alert` for blocking errors. Dismissible.
 *
 * `clearParam` removes that query parameter from the URL on dismiss (and on
 * mount it is left in place so a refresh still shows it): used for the
 * "?notice=Deleted 'Fall kickoff'." banner after a redirect. */

import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "success" | "info" | "warning" | "danger";

const tones: Record<StatusTone, string> = {
  success: "border-success/40 bg-success-quiet text-success",
  info: "border-line bg-surface-1 text-ink",
  warning: "border-warning/40 bg-warning-quiet text-warning",
  danger: "border-danger/40 bg-danger-quiet text-danger",
};

export interface StatusBannerProps {
  children: React.ReactNode;
  tone?: StatusTone;
  /** role="alert" instead of role="status". */
  alert?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  clearParam?: string;
  className?: string;
}

export function StatusBanner({
  children,
  tone = "success",
  alert,
  dismissible = true,
  onDismiss,
  clearParam,
  className,
}: StatusBannerProps) {
  const [hidden, setHidden] = React.useState(false);
  if (hidden) return null;

  const dismiss = () => {
    setHidden(true);
    onDismiss?.();
    if (clearParam) {
      const url = new URL(window.location.href);
      url.searchParams.delete(clearParam);
      window.history.replaceState(window.history.state, "", url);
    }
  };

  return (
    <div
      role={alert ? "alert" : "status"}
      className={cn(
        "flex items-start justify-between gap-3 rounded-control border px-4 py-2.5 text-sm",
        tones[tone],
        className,
      )}
    >
      <div className="min-w-0 py-0.5">{children}</div>
      {dismissible ? (
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="-my-1 -mr-2 grid size-11 flex-none place-items-center rounded-control opacity-80 hover:opacity-100 sm:size-8"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
