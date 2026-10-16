"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { Field } from "@/components/forms/field";
import { FieldErrorsProvider } from "@/components/forms/form-errors";
import { Input } from "@/components/forms/input";
import { PasswordInput } from "@/components/forms/password-input";
import { signIn } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/form-state";

export function LoginForm({ next }: { next: string }) {
  const [state, dispatch, pending] = React.useActionState<FormState, FormData>(signIn, {});
  const [, startTransition] = React.useTransition();
  const passwordRef = React.useRef<HTMLInputElement>(null);
  const emailRef = React.useRef<HTMLInputElement>(null);

  // After a failed attempt: clear the password and focus it (credential
  // error) or focus the first invalid field (format error).
  React.useEffect(() => {
    if (state.error && passwordRef.current) {
      passwordRef.current.value = "";
      passwordRef.current.focus();
    } else if (state.fieldErrors?.email) {
      emailRef.current?.focus();
    } else if (state.fieldErrors?.password) {
      passwordRef.current?.focus();
    }
  }, [state]);

  return (
    <FieldErrorsProvider errors={state.fieldErrors}>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
        className="flex flex-col gap-5"
      >
        <h1 className="text-xl font-medium text-ink">Sign in</h1>
        {state.error ? (
          <div role="alert" className="rounded-control bg-danger-quiet px-4 py-3 text-sm text-danger">
            {state.error}
          </div>
        ) : null}
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email">
          <Input
            ref={emailRef}
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            defaultValue={state.data?.email}
            key={state.data?.email ?? ""}
            required
          />
        </Field>
        <Field
          label="Password"
          name="password"
          labelAside={
            <Link href="/forgot-password" className="text-xs text-ink-muted underline-offset-4 hover:text-ink hover:underline">
              Forgot password?
            </Link>
          }
        >
          <PasswordInput ref={passwordRef} name="password" autoComplete="current-password" required />
        </Field>
        <Button type="submit" variant="primary" full pending={pending} pendingLabel="Signing in…">
          Sign in
        </Button>
        <p className="text-xs text-ink-muted">
          Accounts are made by the e-board. Ask in Discord if you need one.
        </p>
      </form>
    </FieldErrorsProvider>
  );
}
