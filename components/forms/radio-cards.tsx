/* RadioCards — a fieldset of bordered radio options, each with one line of
 * explanation (role picker, card linking, account method). Native radios,
 * so arrow keys work. A disabled option can show its reason inline.
 * Server-safe; pass `onChange` from a client parent to react to changes. */

import * as React from "react";

import { cn } from "@/lib/utils";

import { FieldError } from "./field";

export interface RadioCardOption {
  value: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  disabled?: boolean;
  /** Shown under the option when disabled ("You can't change your own role."). */
  disabledReason?: React.ReactNode;
}

export interface RadioCardsProps {
  legend: React.ReactNode;
  name: string;
  options: RadioCardOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: string;
  /** "stack" (default) or "row" from sm up. */
  layout?: "stack" | "row";
  hideLegend?: boolean;
  className?: string;
}

export function RadioCards({
  legend,
  name,
  options,
  value,
  defaultValue,
  onChange,
  error,
  layout = "stack",
  hideLegend,
  className,
}: RadioCardsProps) {
  const errorId = `${name}-radio-error`;
  return (
    <fieldset
      className={cn("flex min-w-0 flex-col gap-2", className)}
      aria-describedby={error ? errorId : undefined}
    >
      <legend className={cn("mb-1.5 text-sm font-medium text-ink", hideLegend && "sr-only")}>
        {legend}
      </legend>
      <div className={cn("grid gap-2", layout === "row" && "sm:auto-cols-fr sm:grid-flow-col")}>
        {options.map((opt) => (
          <label
            key={opt.value}
            className={cn(
              "flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-line bg-surface px-3 py-2.5 transition-colors",
              "hover:border-line-strong has-[:checked]:border-accent has-[:checked]:bg-accent-quiet",
              opt.disabled && "cursor-not-allowed opacity-70 hover:border-line",
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              disabled={opt.disabled}
              {...(value !== undefined
                ? { checked: value === opt.value, onChange: () => onChange?.(opt.value) }
                : {
                    defaultChecked: defaultValue === opt.value,
                    onChange: onChange ? () => onChange(opt.value) : undefined,
                  })}
              className="mt-[3px] size-[18px] flex-none cursor-[inherit] accent-accent"
            />
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-medium text-ink">{opt.label}</span>
              {opt.description ? (
                <span className="text-xs text-ink-muted">{opt.description}</span>
              ) : null}
              {opt.disabled && opt.disabledReason ? (
                <span className="text-xs text-ink-muted">{opt.disabledReason}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <FieldError id={errorId}>{error}</FieldError> : null}
    </fieldset>
  );
}
