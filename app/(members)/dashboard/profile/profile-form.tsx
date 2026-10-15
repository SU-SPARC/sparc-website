"use client";

import * as React from "react";

import { Button } from "@/components/forms/button";
import { EditForm } from "@/components/forms/edit-form";
import { Field } from "@/components/forms/field";
import { FieldErrorsProvider } from "@/components/forms/form-errors";
import { ImageUpload, type ExistingImage } from "@/components/forms/image-upload";
import { Input, Textarea } from "@/components/forms/input";
import { PasswordInput } from "@/components/forms/password-input";
import { MicroLabel } from "@/components/ui/micro-label";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { FormState } from "@/lib/actions/form-state";
import { changePassword, saveProfile } from "@/lib/actions/profile";

export type CardDefaults = {
  name: string;
  slug: string;
  nickname: string;
  bio: string;
  linkedin: string;
  website: string;
  published: boolean;
  photo: ExistingImage | null;
};

export function ProfileForm({
  email,
  displayName,
  card,
}: {
  email: string;
  displayName: string;
  card: CardDefaults | null;
}) {
  return (
    <EditForm action={saveProfile} itemName="your profile">
      <div className="flex flex-col gap-6">
        <SurfaceCard className="flex flex-col gap-5">
          <MicroLabel as="h2">Account</MicroLabel>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-ink">Email</span>
            <span className="rounded-control bg-surface-2 px-3 py-2.5 text-sm text-ink [overflow-wrap:anywhere]">
              {email}
            </span>
          </div>
          <Field label="Display name" name="display_name" helper="Shown to other members on boards and in the admin.">
            <Input name="display_name" defaultValue={displayName} autoComplete="name" />
          </Field>
        </SurfaceCard>

        {card ? (
          <SurfaceCard className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <MicroLabel as="h2">My card</MicroLabel>
              <p className="text-sm text-ink-muted">
                {card.name} · {card.published ? "Published on /about" : "Hidden from /about"}. Name, role and class
                year are set by the e-board.
              </p>
            </div>
            <ImageUpload
              name="photo"
              label="Photo"
              kind="members"
              aspect="square"
              initial={card.photo}
              slug={card.slug}
              optional
            />
            <Field label="Nickname" name="nickname" optional>
              <Input name="nickname" defaultValue={card.nickname} />
            </Field>
            <Field label="Bio" name="bio" optional helper="Two or three sentences. Shown when someone opens your card.">
              <Textarea name="bio" rows={4} defaultValue={card.bio} />
            </Field>
            <Field label="LinkedIn" name="linkedin" optional>
              <Input name="linkedin" type="url" inputMode="url" placeholder="https://www.linkedin.com/in/…" defaultValue={card.linkedin} />
            </Field>
            <Field label="Website" name="website" optional>
              <Input name="website" type="url" inputMode="url" placeholder="https://" defaultValue={card.website} />
            </Field>
          </SurfaceCard>
        ) : (
          <SurfaceCard>
            <MicroLabel as="h2">My card</MicroLabel>
            <p className="mt-2 text-sm text-ink-muted">
              Your account isn't linked to a member card yet. Ask an e-board admin to link it, then edit your photo and
              bio here.
            </p>
          </SurfaceCard>
        )}
      </div>
    </EditForm>
  );
}

export function PasswordForm({ email }: { email: string }) {
  const [state, dispatch, pending] = React.useActionState<FormState, FormData>(changePassword, {});
  const [, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [handled, setHandled] = React.useState(state);
  const [message, setMessage] = React.useState<string | null>(null);
  if (state !== handled) {
    setHandled(state);
    setMessage(state.ok ? "Password changed." : null);
  }

  React.useEffect(() => {
    if (state.ok) formRef.current?.reset();
    else formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  return (
    <SurfaceCard>
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
          <div className="flex flex-col gap-1">
            <MicroLabel as="h2">Password</MicroLabel>
            <p className="text-sm text-ink-muted">
              Replace a temporary password, or rotate the shared e-board login. At least 8 characters.
            </p>
          </div>
          <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
          <Field label="New password" name="password">
            <PasswordInput name="password" autoComplete="new-password" />
          </Field>
          <Field label="Confirm password" name="confirm">
            <PasswordInput name="confirm" autoComplete="new-password" />
          </Field>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="outline" pending={pending} pendingLabel="Changing…">
              Change password
            </Button>
            <p aria-live="polite" className="text-sm">
              {message ? <span className="text-success">{message}</span> : null}
              {state.error ? <span className="text-danger">{state.error}</span> : null}
            </p>
          </div>
        </form>
      </FieldErrorsProvider>
    </SurfaceCard>
  );
}
