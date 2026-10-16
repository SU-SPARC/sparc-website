"use client";

/* Request a project (docs/DESIGN-BRIEF.md §7), also used to edit one's own
 * pending request. Single column, max-w-text. Submits with onSubmit +
 * startTransition (a <form action> would reset the fields when the server
 * returns validation errors). Success redirects to /dashboard with a banner. */

import * as React from "react";

import { Button } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Field } from "@/components/forms/field";
import { FieldErrorsProvider } from "@/components/forms/form-errors";
import { Input, Select, Textarea } from "@/components/forms/input";
import { RadioCards } from "@/components/forms/radio-cards";
import { StatusBanner } from "@/components/forms/status-banner";
import { requestProject, updateRequest, withdrawRequest } from "@/lib/actions/project-requests";
import type { FormState } from "@/lib/actions/form-state";
import type { MemberCardOption } from "@/lib/data/pm";
import type { Methodology, ProjectKind, SupervisorKind } from "@/lib/data/types";

import { METHODOLOGY_LABEL, METHODOLOGY_LINE } from "./meta";

export type RequestValues = {
  id?: string;
  title: string;
  summary: string;
  description: string;
  kind: ProjectKind;
  methodology: Methodology;
  supervisorKind: SupervisorKind;
  supervisorMemberId: string;
  supervisorName: string;
  repoUrl: string;
};

const OTHER = "__other__";

export function RequestForm({ initial, cards }: { initial: RequestValues; cards: MemberCardOption[] }) {
  const editing = Boolean(initial.id);
  const [state, dispatch, pending] = React.useActionState<FormState, FormData>(
    editing ? updateRequest : requestProject,
    {},
  );
  const [, startTransition] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  const [summary, setSummary] = React.useState(initial.summary);
  const [supKind, setSupKind] = React.useState<SupervisorKind>(initial.supervisorKind);
  const [supMember, setSupMember] = React.useState(
    initial.supervisorMemberId || (initial.supervisorKind === "student" && initial.supervisorName ? OTHER : ""),
  );
  const [withdrawOpen, setWithdrawOpen] = React.useState(false);
  const [withdrawError, setWithdrawError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!pending && state.fieldErrors && Object.keys(state.fieldErrors).length) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }
  }, [pending, state]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (fd.get("supervisor_member_id") === OTHER) fd.set("supervisor_member_id", "");
    startTransition(() => dispatch(fd));
  };

  return (
    <FieldErrorsProvider errors={state.fieldErrors}>
      <form ref={formRef} noValidate onSubmit={onSubmit} className="flex max-w-text flex-col gap-6">
        {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
        {state.error ? (
          <StatusBanner tone="danger" alert dismissible={false}>
            {state.error}
          </StatusBanner>
        ) : null}

        <Field label="Title" name="title">
          <Input name="title" defaultValue={initial.title} maxLength={120} autoComplete="off" />
        </Field>

        <Field
          label="Summary"
          name="summary"
          helper="One line: what it is and who it's for."
          labelAside={
            <span className="text-xs text-ink-muted tabular-nums" aria-live="polite">
              {summary.length}/140
            </span>
          }
        >
          <Input name="summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={140} />
        </Field>

        <Field
          label="Description"
          name="description"
          optional
          helper="One point per line. Shown as bullet points on the project page."
        >
          <Textarea name="description" defaultValue={initial.description} rows={5} />
        </Field>

        {!editing ? (
          <RadioCards
            legend="Kind"
            name="kind"
            layout="row"
            defaultValue={initial.kind}
            options={[
              { value: "team", label: "Team", description: "Several members, one board" },
              { value: "personal", label: "Personal", description: "Your own project, with a supervisor" },
            ]}
            error={state.fieldErrors?.kind?.[0]}
          />
        ) : (
          <input type="hidden" name="kind" value={initial.kind} />
        )}

        <RadioCards
          legend="Methodology"
          name="methodology"
          defaultValue={initial.methodology}
          options={(["kanban", "scrumban", "scrum", "safe"] as const).map((m) => ({
            value: m,
            label: METHODOLOGY_LABEL[m],
            description: METHODOLOGY_LINE[m],
          }))}
          error={state.fieldErrors?.methodology?.[0]}
        />

        <div className="flex flex-col gap-4">
          <RadioCards
            legend="Proposed supervisor"
            name="supervisor_kind"
            layout="row"
            value={supKind}
            onChange={(v) => setSupKind(v as SupervisorKind)}
            error={state.fieldErrors?.supervisor_kind?.[0]}
            options={[
              { value: "faculty", label: "Faculty", description: "A professor or staff member" },
              { value: "student", label: "Student", description: "An experienced member" },
            ]}
          />
          {supKind === "student" ? (
            <>
              <Field label="Member" name="supervisor_member_id">
                <Select
                  name="supervisor_member_id"
                  value={supMember}
                  onChange={(e) => setSupMember(e.target.value)}
                >
                  <option value="">Choose a member</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={OTHER}>Someone not listed</option>
                </Select>
              </Field>
              {supMember === OTHER ? (
                <Field label="Their name" name="supervisor_name">
                  <Input name="supervisor_name" defaultValue={initial.supervisorName} maxLength={120} />
                </Field>
              ) : null}
            </>
          ) : (
            <Field label="Supervisor's name" name="supervisor_name">
              <Input name="supervisor_name" defaultValue={initial.supervisorName} maxLength={120} placeholder="Dr. Ada Lovelace" />
            </Field>
          )}
        </div>

        <Field label="GitHub repo URL" name="repo_url" optional helper="Add it later if the repo doesn't exist yet.">
          <Input name="repo_url" type="url" inputMode="url" defaultValue={initial.repoUrl} placeholder="https://github.com/SU-SPARC/…" />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" pending={pending} pendingLabel={editing ? "Saving…" : "Sending…"}>
            {editing ? "Save request" : "Send request"}
          </Button>
          {editing ? (
            <Button variant="danger-outline" onClick={() => setWithdrawOpen(true)}>
              Withdraw request…
            </Button>
          ) : null}
        </div>
      </form>
      {initial.id ? (
        <ConfirmDialog
          open={withdrawOpen}
          onOpenChange={(o) => {
            setWithdrawOpen(o);
            if (!o) setWithdrawError(null);
          }}
          title={`Withdraw '${initial.title}'?`}
          confirmLabel="Withdraw request"
          pendingLabel="Withdrawing…"
          onConfirm={async () => {
            const r = await withdrawRequest(initial.id as string);
            if (r?.error) setWithdrawError(r.error);
          }}
        >
          <p>The request is deleted. You can send a new one any time.</p>
          {withdrawError ? (
            <p role="alert" className="text-danger">
              {withdrawError}
            </p>
          ) : null}
        </ConfirmDialog>
      ) : null}
    </FieldErrorsProvider>
  );
}
