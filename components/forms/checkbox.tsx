/* Checkbox — native checkbox with its label; the whole row is the target
 * (44px tall on touch). Checked submits "on". Server-safe. */

import * as React from "react";

import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: React.ReactNode;
  description?: React.ReactNode;
}

export function Checkbox({ label, description, className, disabled, ...props }: CheckboxProps) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-start gap-3 py-2 sm:min-h-9",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <input
        type="checkbox"
        disabled={disabled}
        className="mt-[3px] size-[18px] flex-none cursor-[inherit] accent-accent"
        {...props}
      />
      <span className="flex min-w-0 flex-col">
        <span className="text-sm text-ink">{label}</span>
        {description ? <span className="text-xs text-ink-muted">{description}</span> : null}
      </span>
    </label>
  );
}
