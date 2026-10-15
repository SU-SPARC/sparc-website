"use client";

import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { Field } from "@/components/forms/field";
import { FieldErrorsProvider } from "@/components/forms/form-errors";
import { Input } from "@/components/forms/input";
import { requestPasswordReset } from "@/lib/actions/auth";
import type { FormState } from "@/lib/actions/form-state";

export function ForgotPasswordForm() {
  const [state, dispatch, pending] = React.useActionState<FormState, FormData>(requestPasswordReset, {});
  const [, startTransition] = React.useTransition();

  if (state.ok) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-xl font-medium text-ink">Check your email</h1>
        <p role="status" className="text-sm text-ink">
          If that email has an account, a reset link is on its way.
        </p>
        <p className="text-sm text-ink-muted">No email after a few minutes? Ask an admin to reset your password.</p>
        <Link href="/login" className="text-sm text-ink-muted underline underline-offset-4 hover:text-ink">
          Back to sign in
        </Link>
      </div>
    );
  }

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
        <h1 className="text-xl font-medium text-ink">Reset your password</h1>
        {state.error ? (
          <div role="alert" className="rounded-control bg-danger-quiet px-4 py-3 text-sm text-danger">
            {state.error}
          </div>
        ) : null}
        <Field label="Email" name="email" helper="We'll send a link to set a new password.">
          <Input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            defaultValue={state.data?.email}
            key={state.data?.email ?? ""}
            required
          />
        </Field>
        <Button type="submit" variant="primary" full pending={pending} pendingLabel="Sending…">
          Send reset link
        </Button>
        <Link href="/login" className="text-xs text-ink-muted underline-offset-4 hover:text-ink hover:underline">
          Back to sign in
        </Link>
      </form>
    </FieldErrorsProvider>
  );
}
