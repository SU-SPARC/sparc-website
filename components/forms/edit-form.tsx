"use client";

/* EditForm — the admin / profile edit form shell.
 *
 * Wraps a server action used through useActionState and adds:
 *   - SaveBar states (clean, dirty, saving, saved, error) at the bottom;
 *   - dirty tracking (any input/change event inside the form);
 *   - Discard: remounts the fields with their server defaults;
 *   - after a successful save the fields remount from the fresh server
 *     props (so uploaders pick up the new media ids);
 *   - field errors via <FieldErrorsProvider>; on a failed submit focus moves
 *     to the first [aria-invalid="true"] control;
 *   - `beforeunload` while dirty, and an in-app "Leave without saving?"
 *     dialog for link clicks (sidebar, breadcrumb);
 *   - uploads in progress block Save (useFormBusy from children).
 *
 * It submits with onSubmit + startTransition instead of <form action>,
 * because React resets uncontrolled fields after a form action, which
 * would wipe the user's input when the server returns validation errors.
 *
 *   <EditForm action={saveEvent} itemName="Fall kickoff">
 *     …fields…
 *   </EditForm>
 */

import { useRouter } from "next/navigation";
import * as React from "react";

import type { FormState } from "@/lib/actions/form-state";
import { cn } from "@/lib/utils";

import { ConfirmDialog } from "./confirm-dialog";
import { FieldErrorsProvider } from "./form-errors";
import { SaveBar, type SaveBarState } from "./save-bar";
import { StatusBanner } from "./status-banner";

type BusyContextValue = (key: string, busy: boolean) => void;
const BusyContext = React.createContext<BusyContextValue>(() => {});

/** Children call this to block Save while e.g. an upload runs. */
export function useFormBusy(key: string, busy: boolean) {
  const set = React.useContext(BusyContext);
  React.useEffect(() => {
    set(key, busy);
    return () => set(key, false);
  }, [set, key, busy]);
}

export interface EditFormProps {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  initialState?: FormState;
  /** For the leave dialog: "Your changes to <itemName> will be lost." */
  itemName?: string;
  saveLabel?: string;
  /** Hidden fields sent with every submit (e.g. id). */
  hidden?: Record<string, string>;
  /** Form is new (nothing saved yet): Save is enabled when clean. */
  isNew?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function EditForm({
  action,
  initialState = {},
  itemName,
  saveLabel = "Save",
  hidden,
  isNew,
  className,
  children,
}: EditFormProps) {
  const router = useRouter();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, dispatch, pending] = React.useActionState(action, initialState);
  const [, startTransition] = React.useTransition();
  const [dirty, setDirty] = React.useState(false);
  const [version, setVersion] = React.useState(0);
  const [busy, setBusyMap] = React.useState<Record<string, boolean>>({});
  const [leaveHref, setLeaveHref] = React.useState<string | null>(null);
  const [lastHandled, setLastHandled] = React.useState<FormState>(initialState);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [showErrors, setShowErrors] = React.useState(false);

  // React to a new action result (adjusting state during render, not in an
  // effect, per React's guidance).
  if (state !== lastHandled) {
    setLastHandled(state);
    if (state.ok) {
      setDirty(false);
      setSavedAt(state.savedAt ? new Date(state.savedAt) : new Date());
      setVersion((v) => v + 1);
      setShowErrors(false);
    } else {
      setShowErrors(true);
    }
  }

  const setBusy = React.useCallback((key: string, value: boolean) => {
    setBusyMap((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);
  const anyBusy = Object.values(busy).some(Boolean);

  const errorCount = showErrors ? Object.keys(state.fieldErrors ?? {}).length : 0;
  const hasError = showErrors && (errorCount > 0 || Boolean(state.error));

  let barState: SaveBarState;
  if (pending) barState = "saving";
  else if (hasError) barState = "error";
  else if (dirty || isNew) barState = "dirty";
  else if (savedAt) barState = "saved";
  else barState = "clean";

  const focusFirstError = React.useCallback(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, []);

  // Focus the first invalid field after a failed submit.
  React.useEffect(() => {
    if (!pending && showErrors && errorCount > 0) focusFirstError();
  }, [pending, showErrors, errorCount, state, focusFirstError]);

  // beforeunload + in-app link interception while dirty.
  React.useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveHref(url.pathname + url.search + url.hash);
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);

  const markDirty = () => {
    if (!dirty) setDirty(true);
    if (savedAt) setSavedAt(null);
  };

  const discard = () => {
    setDirty(false);
    setShowErrors(false);
    setVersion((v) => v + 1);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (anyBusy || pending) return;
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  };

  return (
    <BusyContext.Provider value={setBusy}>
      <FieldErrorsProvider errors={showErrors ? state.fieldErrors : undefined}>
        <form
          ref={formRef}
          noValidate
          onSubmit={onSubmit}
          onInput={markDirty}
          onChange={markDirty}
          className={cn("flex flex-col", className)}
        >
          {Object.entries(hidden ?? {}).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {showErrors && state.error && errorCount === 0 ? (
            <StatusBanner tone="danger" alert className="mb-6" onDismiss={() => setShowErrors(false)}>
              {state.error}
            </StatusBanner>
          ) : null}
          <React.Fragment key={version}>{children}</React.Fragment>
          <SaveBar
            state={barState}
            savedAt={savedAt}
            errorCount={errorCount}
            errorMessage={state.error}
            onDiscard={discard}
            onFocusError={focusFirstError}
            saveLabel={saveLabel}
            blockedReason={anyBusy ? "Waiting for the upload to finish…" : undefined}
          />
        </form>
      </FieldErrorsProvider>
      <ConfirmDialog
        open={leaveHref !== null}
        onOpenChange={(o) => {
          if (!o) setLeaveHref(null);
        }}
        title="Leave without saving?"
        cancelLabel="Keep editing"
        confirmLabel="Discard changes"
        tone="danger-outline"
        onConfirm={() => {
          const href = leaveHref;
          setDirty(false);
          setLeaveHref(null);
          if (href) router.push(href);
        }}
      >
        <p>
          Your changes{itemName ? <> to <span className="text-ink">{itemName}</span></> : null} will be lost.
        </p>
      </ConfirmDialog>
    </BusyContext.Provider>
  );
}
