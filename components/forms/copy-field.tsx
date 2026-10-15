"use client";

/* CopyField — read-only monospace value + "Copy" button. The label turns
 * "Copied" for 2s and is announced through aria-live. CopyButton is the
 * same button on its own (copies any text, e.g. a whole sign-in message). */

import { Check, Copy } from "lucide-react";
import * as React from "react";

import { Button, type ButtonVariant } from "./button";
import { Input } from "./input";

async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for non-secure contexts.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

export interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  variant?: ButtonVariant;
  full?: boolean;
  /** Accessible name when the visible label is generic ("Copy password"). */
  "aria-label"?: string;
  onCopied?: () => void;
}

export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  variant = "outline",
  full,
  "aria-label": ariaLabel,
  onCopied,
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <>
      <Button
        variant={variant}
        full={full}
        aria-label={ariaLabel}
        onClick={async () => {
          if (await writeClipboard(text)) {
            setCopied(true);
            onCopied?.();
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => setCopied(false), 2000);
          }
        }}
      >
        <span className="grid">
          <span className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${copied ? "invisible" : ""}`}>
            <Copy aria-hidden="true" className="size-4" />
            {label}
          </span>
          <span className={`col-start-1 row-start-1 inline-flex items-center gap-2 ${copied ? "" : "invisible"}`}>
            <Check aria-hidden="true" className="size-4" />
            {copiedLabel}
          </span>
        </span>
      </Button>
      <span aria-live="polite" className="sr-only">
        {copied ? copiedLabel : ""}
      </span>
    </>
  );
}

export interface CopyFieldProps {
  label: string;
  value: string;
  id?: string;
}

export function CopyField({ label, value, id }: CopyFieldProps) {
  const autoId = React.useId();
  const inputId = id ?? `cf${autoId.replace(/:/g, "")}`;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex min-w-0 gap-2">
        <Input
          id={inputId}
          readOnly
          mono
          value={value}
          onFocus={(e) => e.currentTarget.select()}
          className="font-medium tracking-normal"
        />
        <CopyButton text={value} aria-label={`Copy ${label.toLowerCase()}`} />
      </div>
    </div>
  );
}
