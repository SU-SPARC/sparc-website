"use client";

/* Set / choose a new password (invite, recovery, or a member replacing a
 * temporary password).
 *
 * `email` is null when there is no session yet. That happens when an invite
 * link used the implicit flow and the tokens arrived in the URL fragment
 * (#access_token=…), which the server never sees: pick them up here, store
 * the session with the browser client, and re-render. */

import { Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { Field } from "@/components/forms/field";
import { FieldErrorsProvider } from "@/components/forms/form-errors";
import { PasswordInput } from "@/components/forms/password-input";
import { updatePassword } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/form-state";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type EntryType = "invite" | "recovery" | "change";

const HEADINGS: Record<EntryType, string> = {
  invite: "Set your password",
  recovery: "Choose a new password",
  change: "Choose a new password",
};

export function LinkExpired() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium text-ink">Link expired</h1>
      <p className="text-sm text-ink">This link has expired or was already used.</p>
      <Link
        href="/forgot-password"
        className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong sm:min-h-10"
      >
        Request a new link
      </Link>
      <p className="text-sm text-ink-muted">Or ask an admin for a temporary password.</p>
    </div>
  );
}

function readHash(): { access_token?: string; refresh_token?: string; error?: string } {
  if (typeof window === "undefined" || !window.location.hash) return {};
  const p = new URLSearchParams(window.location.hash.slice(1));
  return {
    access_token: p.get("access_token") ?? undefined,
    refresh_token: p.get("refresh_token") ?? undefined,
    error: p.get("error_code") ?? p.get("error") ?? undefined,
  };
}

export function UpdatePasswordForm({ email, type }: { email: string | null; type: EntryType }) {
  const router = useRouter();
  const [hashState, setHashState] = React.useState<"checking" | "none" | "expired">("checking");

  React.useEffect(() => {
    if (email !== null) return;
    const hash = readHash();
    let cancelled = false;
    (async () => {
      if (hash.access_token && hash.refresh_token) {
        const { error } = await createClient().auth.setSession({
          access_token: hash.access_token,
          refresh_token: hash.refresh_token,
        });
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        if (!cancelled) {
          if (error) setHashState("expired");
          else router.refresh();
        }
      } else if (!cancelled) {
        setHashState(hash.error ? "expired" : "none");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [email, router]);

  if (email === null) {
    if (hashState === "checking") {
      return <p className="text-sm text-ink-muted" role="status">Checking your link…</p>;
    }
    if (hashState === "expired") return <LinkExpired />;
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-medium text-ink">{HEADINGS[type]}</h1>
        <p className="text-sm text-ink">Open the link from your email again, or sign in first.</p>
        <Link
          href="/login?next=%2Fauth%2Fupdate-password"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink hover:border-line-strong sm:min-h-10"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return <PasswordForm email={email} type={type} />;
}

function PasswordForm({ email, type }: { email: string; type: EntryType }) {
  const [state, dispatch, pending] = React.useActionState<FormState, FormData>(updatePassword, {});
  const [, startTransition] = React.useTransition();
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  const rules = [
    { label: "At least 8 characters.", met: password.length >= 8 },
    { label: "Both entries match.", met: password.length > 0 && password === confirm },
  ];

  return (
    <FieldErrorsProvider errors={state.fieldErrors}>
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
        className="flex flex-col gap-5"
      >
        <h1 className="text-xl font-medium text-ink">{HEADINGS[type]}</h1>
        <div className="rounded-control bg-surface-2 px-3 py-2.5 text-sm text-ink [overflow-wrap:anywhere]">
          <span className="sr-only">Account: </span>
          {email}
        </div>
        {/* Lets password managers save the right username. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
        {state.error ? (
          <div role="alert" className="rounded-control bg-danger-quiet px-4 py-3 text-sm text-danger">
            {state.error}
          </div>
        ) : null}
        <Field label="New password" name="password">
          <PasswordInput
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Field label="Confirm password" name="confirm">
          <PasswordInput
            name="confirm"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </Field>
        <ul className="flex flex-col gap-1" aria-label="Password rules">
          {rules.map((r) => (
            <li
              key={r.label}
              className={cn("flex items-center gap-2 text-xs", r.met ? "text-success" : "text-ink-muted")}
            >
              <Check aria-hidden="true" className={cn("size-3.5", !r.met && "opacity-30")} />
              {r.label}
              <span className="sr-only">{r.met ? " (met)" : " (not met yet)"}</span>
            </li>
          ))}
        </ul>
        <Button type="submit" variant="primary" full pending={pending} pendingLabel="Saving…">
          {type === "invite" ? "Set password" : "Save new password"}
        </Button>
      </form>
    </FieldErrorsProvider>
  );
}
