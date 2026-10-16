/* Input, Textarea, Select — native controls in the site's tokens.
 * Server-safe. Wrap in <Field> for label/helper/error wiring; Field passes
 * id, aria-describedby and aria-invalid down, and aria-invalid turns the
 * border to danger. */

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

import { controlBase, controlHeight } from "./styles";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Monospace-feel tabular figures for refs, slugs, URLs and secrets. */
  mono?: boolean;
  /** Fixed, non-editable prefix shown inside the field ("SP-", "#", "/news/"). */
  prefix?: string;
  ref?: React.Ref<HTMLInputElement>;
}

export function Input({ mono, prefix, className, ...props }: InputProps) {
  const input = (
    <input
      className={cn(
        controlBase,
        controlHeight,
        "px-3 py-2",
        mono && "tabular-nums",
        prefix && "rounded-l-none border-l-0",
        className,
      )}
      {...props}
    />
  );
  if (!prefix) return input;
  return (
    <div className="flex min-w-0">
      <span
        aria-hidden="true"
        className="inline-flex flex-none items-center rounded-l-control border border-line bg-surface-2 px-3 text-sm text-ink-muted"
      >
        {prefix}
      </span>
      {input}
    </div>
  );
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  ref?: React.Ref<HTMLTextAreaElement>;
}

export function Textarea({ className, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      className={cn(controlBase, "resize-y px-3 py-2 leading-relaxed", className)}
      {...props}
    />
  );
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  ref?: React.Ref<HTMLSelectElement>;
}

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <div className="relative min-w-0">
      <select
        className={cn(controlBase, controlHeight, "appearance-none py-2 pr-9 pl-3", className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}
