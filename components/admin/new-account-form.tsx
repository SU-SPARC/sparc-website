"use client";

/* /admin/accounts/new (docs/DESIGN-BRIEF.md §5): email + display name,
 * role, member card (existing / new / none), method (temporary password or
 * invite, the latter disabled until SMTP exists), "Create account". On
 * success with a temporary password, the page becomes the one-time
 * password screen. */

import * as React from "react";

import { Button } from "@/components/forms/button";
import { Field } from "@/components/forms/field";
import { FieldErrorsProvider, useFieldError } from "@/components/forms/form-errors";
import { Input, Select } from "@/components/forms/input";
import { RadioCards } from "@/components/forms/radio-cards";
import { StatusBanner } from "@/components/forms/status-banner";
import { SurfaceCard } from "@/components/ui/surface-card";
import { createAccount } from "@/lib/actions/accounts";
import type { FormState } from "@/lib/actions/form-state";

import { EditHeader } from "./edit-layout";
import { OneTimePassword } from "./one-time-password";

export function NewAccountForm({
  cards,
  smtp,
  loginUrl,
}: {
  cards: Array<{ id: string; name: string }>;
  smtp: boolean;
  loginUrl: string;
}) {
  const [state, dispatch, pending] = React.useActionState<FormState, FormData>(createAccount, {});
  const [, startTransition] = React.useTransition();
  const [card, setCard] = React.useState("none");
  const [name, setName] = React.useState("");
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  if (state.ok && state.data?.password) {
    return (
      <OneTimePassword
        title={`Account created for ${state.data.name}`}
        email={state.data.email ?? ""}
        name={state.data.name ?? ""}
        password={state.data.password}
        loginUrl={loginUrl}
        doneNotice={`Account created for ${state.data.email}.`}
        warning={state.data.warning}
      />
    );
  }

  return (
    <FieldErrorsProvider errors={state.fieldErrors}>
      <EditHeader section="Accounts" sectionHref="/admin/accounts" title="New account" />
      <form
        ref={formRef}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
        className="flex max-w-text flex-col gap-6"
      >
        {state.error ? (
          <StatusBanner tone="danger" alert>
            {state.error}
          </StatusBanner>
        ) : null}
        <SurfaceCard className="flex flex-col gap-5">
          <Field label="Email" name="email">
            <Input name="email" type="email" inputMode="email" autoComplete="off" />
          </Field>
          <Field label="Display name" name="display_name" helper="Shown on boards and in the admin.">
            <Input name="display_name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </Field>
        </SurfaceCard>

        <SurfaceCard className="flex flex-col gap-5">
          <RadioCards
            legend="Role"
            name="role"
            defaultValue="member"
            options={[
              { value: "member", label: "Member", description: "Edits their own card, requests projects, works on boards they belong to." },
              { value: "editor", label: "Editor", description: "All content, media uploads, approves project requests." },
              { value: "admin", label: "Admin", description: "Everything an editor can, plus accounts and roles." },
            ]}
          />
        </SurfaceCard>

        <SurfaceCard className="flex flex-col gap-5">
          <RadioCards
            legend="Member card"
            name="card"
            value={card}
            onChange={setCard}
            options={[
              { value: "existing", label: "Link an existing card", description: "For someone already on /about.", disabled: cards.length === 0, disabledReason: "Every card already has an account." },
              { value: "new", label: "Create a new card", description: "Starts hidden; they add a photo and bio, then an editor publishes it." },
              { value: "none", label: "No card", description: "For accounts that aren't a person on /about." },
            ]}
          />
          {card === "existing" ? (
            <Field label="Card" name="member_id">
              <Select name="member_id" defaultValue="">
                <option value="" disabled>
                  Pick a card
                </option>
                {cards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}
          {card === "new" ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-ink">Name on the card</span>
                <span className="min-h-10 rounded-control bg-surface-2 px-3 py-2.5 text-sm text-ink">{name || "From display name"}</span>
              </div>
              <Field label="Class year" name="class_year">
                <Input name="class_year" inputMode="numeric" mono defaultValue={String(new Date().getFullYear() + 2)} />
              </Field>
            </div>
          ) : null}
        </SurfaceCard>

        <SurfaceCard className="flex flex-col gap-5">
          <RadioCards
            legend="How they get in"
            name="method"
            defaultValue="password"
            options={[
              { value: "password", label: "Temporary password", description: "Shown once on the next screen. No email needed." },
              {
                value: "invite",
                label: "Send invite email",
                description: "They choose their own password from a link.",
                disabled: !smtp,
                disabledReason: "Needs custom SMTP. See docs/CMS.md.",
              },
            ]}
          />
          <MethodError />
        </SurfaceCard>

        <div>
          <Button type="submit" variant="primary" pending={pending} pendingLabel="Creating…">
            Create account
          </Button>
        </div>
      </form>
    </FieldErrorsProvider>
  );
}

function MethodError() {
  const e = useFieldError("method");
  return e ? <p className="text-xs text-danger">{e}</p> : null;
}
