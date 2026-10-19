"use client";

/* Field — label, optional marker, helper and error around one control.
 *
 *   <Field label="Title" name="title" helper="Shown on the card.">
 *     <Input name="title" defaultValue={…} />
 *   </Field>
 *
 * The child control receives `id`, `aria-describedby` and `aria-invalid`
 * (via cloneElement), so it must be a single element that forwards those
 * props to the real control (Input, Textarea, Select all do).
 *
 * Errors: `error` prop, or else the first message for `name` from the
 * nearest <FieldErrorsProvider>. Optional fields say "(optional)"; required
 * fields carry no marker. */

import { CircleAlert } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { useFieldError } from "./form-errors";

export interface FieldProps {
  label: React.ReactNode;
  /** Form field name; used to look up server errors. */
  name?: string;
  /** Explicit control id. Generated when omitted. */
  id?: string;
  optional?: boolean;
  helper?: React.ReactNode;
  /** Overrides the context error. */
  error?: string;
  /** Right side of the label row, e.g. a "Forgot password?" link. */
  labelAside?: React.ReactNode;
  /** Hide the label visually (still read by screen readers). */
  hideLabel?: boolean;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}

export function Field({
  label,
  name,
  id,
  optional,
  helper,
  error,
  labelAside,
  hideLabel,
  className,
  children,
}: FieldProps) {
  const autoId = React.useId();
  const controlId = id ?? `f${autoId.replace(/:/g, "")}`;
  const helperId = `${controlId}-helper`;
  const errorId = `${controlId}-error`;
  const contextError = useFieldError(name);
  const message = error ?? contextError;

  const describedBy = [helper ? helperId : null, message ? errorId : null]
    .filter(Boolean)
    .join(" ");

  const control = React.cloneElement(children, {
    id: controlId,
    "aria-describedby": describedBy || undefined,
    "aria-invalid": message ? true : undefined,
  });

  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <div className={cn("flex items-baseline justify-between gap-3", hideLabel && "sr-only")}>
        <label htmlFor={controlId} className="text-sm font-medium text-ink">
          {label}
          {optional ? <span className="font-normal text-ink-muted"> (optional)</span> : null}
        </label>
        {labelAside}
      </div>
      {control}
      {helper ? (
        <p id={helperId} className="text-xs text-ink-muted">
          {helper}
        </p>
      ) : null}
      {message ? <FieldError id={errorId}>{message}</FieldError> : null}
    </div>
  );
}

/** Error line under a control: 14px alert icon + text-xs text-danger. */
export function FieldError({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <p id={id} className="flex items-start gap-1.5 text-xs text-danger">
      <CircleAlert aria-hidden="true" className="mt-[3px] size-3.5 flex-none" />
      <span>{children}</span>
    </p>
  );
}
