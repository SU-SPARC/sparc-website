"use client";

/* Account button for the members top bar: shows the email, opens a small
 * menu with "Sign out" (a <form> POST to the signOut action, not a link).
 * Esc and outside clicks close it. */

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { signOut } from "@/lib/actions/auth";

export function AccountMenu({ email, role }: { email: string; role: string }) {
  const [open, setOpen] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelId = React.useId();

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 max-w-[14rem] items-center gap-1.5 rounded-control px-3 text-sm text-ink-muted hover:bg-surface-1 hover:text-ink sm:min-h-9"
      >
        <span className="truncate" title={email}>
          {email}
        </span>
        <ChevronDown aria-hidden="true" className="size-4 flex-none" />
      </button>
      {open ? (
        <div
          id={panelId}
          className="absolute top-full right-0 z-50 mt-1 w-64 rounded-card border border-line bg-surface p-1 shadow-lg"
        >
          <div className="border-b border-line px-3 py-2">
            <p className="truncate text-sm text-ink" title={email}>
              {email}
            </p>
            <p className="text-xs text-ink-muted capitalize">{role}</p>
          </div>
          <form action={signOut} className="pt-1">
            <button
              type="submit"
              className="flex min-h-11 w-full items-center rounded-control px-3 text-left text-sm text-ink hover:bg-surface-1 sm:min-h-9"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
