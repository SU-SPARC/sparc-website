"use client";

/* PasswordInput — Input with a "Show" / "Hide" text toggle (aria-pressed).
 * Forwards Field's id / aria props to the real <input>. */

import * as React from "react";

import { cn } from "@/lib/utils";

import { controlBase, controlHeight } from "./styles";

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  ref?: React.Ref<HTMLInputElement>;
}

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [shown, setShown] = React.useState(false);
  return (
    <div className="relative min-w-0">
      <input
        type={shown ? "text" : "password"}
        className={cn(controlBase, controlHeight, "py-2 pr-16 pl-3", className)}
        {...props}
      />
      <button
        type="button"
        aria-pressed={shown}
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={() => setShown((v) => !v)}
        className="absolute inset-y-0 right-0 min-w-14 rounded-r-control px-3 text-xs text-ink-muted hover:text-ink"
      >
        {shown ? "Hide" : "Show"}
      </button>
    </div>
  );
}
