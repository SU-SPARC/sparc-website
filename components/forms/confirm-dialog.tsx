"use client";

/* ConfirmDialog — native <dialog> opened with showModal().
 *
 * Esc and Cancel close it; focus returns to whatever had focus when it
 * opened (the trigger). Cancel has initial focus. Never open a dialog from a
 * dialog.
 *
 * Two ways to confirm:
 *   - `action` (+ `fields`): the confirm button submits a <form action> with
 *     those hidden fields — use with a server action. Pending state comes
 *     from useFormStatus.
 *   - `onConfirm`: plain callback (may return a promise; the button shows
 *     `pendingLabel` until it settles).
 *
 * `confirmText` turns on type-to-confirm ("Type SP-014 to confirm"); the
 * confirm button stays disabled until the input matches exactly. */

import { X } from "lucide-react";
import * as React from "react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonVariant } from "./button";
import { Field } from "./field";
import { Input } from "./input";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  /** One or two lines on the consequences. */
  children?: React.ReactNode;
  /** Names the verb and object: "Delete event". */
  confirmLabel: React.ReactNode;
  pendingLabel?: React.ReactNode;
  cancelLabel?: React.ReactNode;
  /** "danger" (filled bg-danger), "danger-outline" (for "Discard changes")
   *  or "default" (accent primary). */
  tone?: "danger" | "danger-outline" | "default";
  /** Type-to-confirm string. */
  confirmText?: string;
  action?: (formData: FormData) => void | Promise<void>;
  fields?: Record<string, string>;
  onConfirm?: () => void | Promise<unknown>;
  /** Optional extra content inside the form (e.g. radio options). */
  formContent?: React.ReactNode;
  /** Disable confirm for reasons the caller knows. */
  confirmDisabled?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  children,
  confirmLabel,
  pendingLabel,
  cancelLabel = "Cancel",
  tone = "danger",
  confirmText,
  action,
  fields,
  onConfirm,
  formContent,
  confirmDisabled,
}: ConfirmDialogProps) {
  const ref = React.useRef<HTMLDialogElement>(null);
  const returnFocus = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const [typed, setTyped] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      // React handles autoFocus itself (no DOM attribute), and the dialog was
      // closed when it ran, so move focus to Cancel explicitly.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleClose = () => {
    setTyped("");
    setBusy(false);
    onOpenChange(false);
    const target = returnFocus.current;
    if (target && target.isConnected) setTimeout(() => target.focus(), 0);
  };

  const matches = confirmText === undefined || typed === confirmText;
  const variant: ButtonVariant =
    tone === "danger" ? "danger" : tone === "danger-outline" ? "danger-outline" : "primary";

  const body = (
    <>
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <h2 id={titleId} className="text-lg font-medium text-ink">
          {title}
        </h2>
        <button
          type="button"
          aria-label="Close"
          onClick={() => ref.current?.close()}
          className="-mt-1 -mr-2 grid size-11 flex-none place-items-center rounded-control text-ink-muted hover:bg-surface-2 hover:text-ink sm:size-8"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <div className="flex flex-col gap-4 px-5 pt-2 pb-5 text-sm text-ink-muted">
        {children}
        {formContent}
        {confirmText !== undefined ? (
          <Field label={<>Type <span className="text-ink">{confirmText}</span> to confirm</>}>
            <Input
              autoComplete="off"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          </Field>
        ) : null}
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-end">
        <Button variant="outline" data-autofocus onClick={() => ref.current?.close()}>
          {cancelLabel}
        </Button>
        {action ? (
          <SubmitConfirm
            variant={variant}
            disabled={!matches || confirmDisabled}
            pendingLabel={pendingLabel}
          >
            {confirmLabel}
          </SubmitConfirm>
        ) : (
          <Button
            variant={variant}
            disabled={!matches || confirmDisabled}
            pending={busy}
            pendingLabel={pendingLabel}
            onClick={async () => {
              setBusy(true);
              try {
                await onConfirm?.();
              } finally {
                setBusy(false);
              }
            }}
          >
            {confirmLabel}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={handleClose}
      className="m-auto w-[calc(100%-2rem)] max-w-[28rem] rounded-card border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-ink/40 dark:backdrop:bg-surface/75"
    >
      {open ? (
        action ? (
          <form action={action}>
            {Object.entries(fields ?? {}).map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            {body}
          </form>
        ) : (
          body
        )
      ) : null}
    </dialog>
  );
}

function SubmitConfirm({
  variant,
  disabled,
  pendingLabel,
  children,
}: {
  variant: ButtonVariant;
  disabled?: boolean;
  pendingLabel?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={disabled}
      pending={pending}
      pendingLabel={pendingLabel ?? children}
    >
      {children}
    </Button>
  );
}
