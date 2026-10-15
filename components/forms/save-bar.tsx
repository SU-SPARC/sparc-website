"use client";

/* SaveBar — sticky bottom bar of an edit form (brief §3).
 *
 *   clean   "No changes" (faint), Save disabled, Discard hidden
 *   dirty   "Unsaved changes", Discard + Save
 *   saving  "Saving…", both disabled, Save keeps its width
 *   saved   "Saved 14:02" (success), Save disabled
 *   error   "2 fields need attention" (danger) as a button that focuses the
 *           first invalid field; Save enabled
 *
 * The state text is aria-live="polite". Save is type="submit", so the bar
 * must sit inside the <form>. */

import * as React from "react";

import { formatInstant } from "@/lib/data/dates";
import { cn } from "@/lib/utils";

import { Button } from "./button";

export type SaveBarState = "clean" | "dirty" | "saving" | "saved" | "error";

export interface SaveBarProps {
  state: SaveBarState;
  savedAt?: Date | null;
  /** Number of invalid fields, for the error state. */
  errorCount?: number;
  /** Top-level error message when no single field is to blame. */
  errorMessage?: string;
  onDiscard?: () => void;
  onFocusError?: () => void;
  saveLabel?: string;
  /** Extra reason Save is blocked (e.g. an upload in progress). */
  blockedReason?: string;
}

export function SaveBar({
  state,
  savedAt,
  errorCount = 0,
  errorMessage,
  onDiscard,
  onFocusError,
  saveLabel = "Save",
  blockedReason,
}: SaveBarProps) {
  const saving = state === "saving";
  const saveDisabled = state === "clean" || state === "saved" || Boolean(blockedReason);

  let text: React.ReactNode;
  if (blockedReason && state !== "saving") {
    text = <span className="text-ink-muted">{blockedReason}</span>;
  } else if (state === "clean") {
    text = <span className="text-ink-faint">No changes</span>;
  } else if (state === "dirty") {
    text = <span className="text-ink">Unsaved changes</span>;
  } else if (state === "saving") {
    text = <span className="text-ink-muted">Saving…</span>;
  } else if (state === "saved") {
    text = (
      <span className="text-success">
        Saved {savedAt ? formatInstant(savedAt, { hour: "2-digit", minute: "2-digit", hour12: false }) : ""}
      </span>
    );
  } else {
    text =
      errorCount > 0 ? (
        <button
          type="button"
          onClick={onFocusError}
          className="min-h-11 rounded-control text-left text-danger underline-offset-4 hover:underline sm:min-h-0"
        >
          {errorCount === 1 ? "1 field needs attention" : `${errorCount} fields need attention`}
        </button>
      ) : (
        <span className="text-danger">{errorMessage ?? "Couldn't save. Try again."}</span>
      );
  }

  return (
    <div className="sticky bottom-0 z-20 -mx-gutter mt-8 border-t border-line bg-surface px-gutter">
      <div className="flex min-h-14 items-center justify-between gap-3 py-2">
        <p aria-live="polite" className="min-w-0 truncate text-sm">
          {text}
        </p>
        <div className="flex flex-none items-center gap-2">
          {state !== "clean" && state !== "saved" ? (
            <Button variant="text" onClick={onDiscard} disabled={saving}>
              Discard
            </Button>
          ) : null}
          <Button
            type="submit"
            variant="primary"
            disabled={saveDisabled}
            pending={saving}
            pendingLabel="Saving…"
            className={cn(saveDisabled && !saving && "opacity-60")}
          >
            {saveLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
