"use client";

/* Switch — role="switch" button with a hidden input so it submits with the
 * form: `name` posts "true" or "false" (parse with zBool from
 * lib/actions/form-data.ts). Controlled (`checked` + `onCheckedChange`) or
 * uncontrolled (`defaultChecked`). Helper text can differ per state
 * ("Visible on the site" / "Only editors can see this"). */

import * as React from "react";

import { cn } from "@/lib/utils";

export interface SwitchProps {
  label: React.ReactNode;
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Helper under the label when on / off. */
  helperOn?: React.ReactNode;
  helperOff?: React.ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({
  label,
  name,
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  helperOn,
  helperOff,
  disabled,
  id,
  className,
}: SwitchProps) {
  const [inner, setInner] = React.useState(defaultChecked);
  const checked = checkedProp ?? inner;
  const autoId = React.useId();
  const switchId = id ?? `sw${autoId.replace(/:/g, "")}`;
  const helper = checked ? helperOn : helperOff;
  const hiddenRef = React.useRef<HTMLInputElement>(null);

  const toggle = () => {
    const next = !checked;
    if (checkedProp === undefined) setInner(next);
    onCheckedChange?.(next);
    // Let surrounding forms notice the change (dirty tracking listens for
    // bubbling input events; a hidden input never fires one by itself).
    queueMicrotask(() =>
      hiddenRef.current?.dispatchEvent(new Event("input", { bubbles: true })),
    );
  };

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col">
        <label htmlFor={switchId} className="text-sm font-medium text-ink">
          {label}
        </label>
        {helper ? (
          <span id={`${switchId}-helper`} className="text-xs text-ink-muted">
            {helper}
          </span>
        ) : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={helper ? `${switchId}-helper` : undefined}
        disabled={disabled}
        onClick={toggle}
        className="group grid min-h-11 flex-none place-items-center disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-8"
      >
        <span
          aria-hidden="true"
          className={cn(
            "relative h-6 w-10 rounded-pill border transition-colors",
            checked ? "border-accent bg-accent" : "border-line-strong bg-surface-2",
          )}
        >
          <span
            className={cn(
              "absolute top-[3px] size-4 rounded-pill transition-transform",
              checked ? "translate-x-[19px] bg-on-accent" : "translate-x-[3px] bg-ink-muted",
            )}
          />
        </span>
      </button>
      {name ? (
        <input ref={hiddenRef} type="hidden" name={name} value={checked ? "true" : "false"} />
      ) : null}
    </div>
  );
}
