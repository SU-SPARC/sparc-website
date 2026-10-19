"use client";

/* Approve / decline buttons for one request on /admin/projects/requests
 * "Approve…" confirms ref, methodology and supervisor in a dialog, because approval builds the board from the
 * template; "Decline…" asks for a reason the requester will see. */

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Input, Select, Textarea } from "@/components/forms/input";
import { RadioCards } from "@/components/forms/radio-cards";
import { approveRequest, declineRequest } from "@/lib/actions/project-requests";
import type { MemberCardOption, PendingRequest } from "@/lib/data/pm";
import type { Methodology, SupervisorKind } from "@/lib/data/types";

import { METHODOLOGY_LABEL } from "./meta";

const OTHER = "__other__";

export function RequestReview({
  request,
  nextRef,
  cards,
  onDone,
}: {
  request: PendingRequest;
  nextRef: string;
  cards: MemberCardOption[];
  onDone: (message: string) => void;
}) {
  const router = useRouter();
  const [mode, setMode] = React.useState<"approve" | "decline" | null>(null);
  const [ref, setRef] = React.useState(nextRef.replace(/^SP-/, ""));
  const [methodology, setMethodology] = React.useState<Methodology>(request.methodology);
  const [supKind, setSupKind] = React.useState<SupervisorKind>(request.supervisorKind ?? "faculty");
  const [supMember, setSupMember] = React.useState(
    request.supervisorMemberId ?? (request.supervisorKind === "student" && request.supervisorName ? OTHER : ""),
  );
  const [supName, setSupName] = React.useState(request.supervisorMemberId ? "" : (request.supervisorName ?? ""));
  const [reason, setReason] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const [error, setError] = React.useState<string | null>(null);

  const open = (m: "approve" | "decline") => {
    setErrors({});
    setError(null);
    if (m === "approve") setRef(nextRef.replace(/^SP-/, ""));
    setMode(m);
  };

  const approve = async () => {
    const r = await approveRequest({
      id: request.id,
      ref,
      methodology,
      supervisorKind: supKind,
      supervisorMemberId: supKind === "student" && supMember !== OTHER ? supMember : "",
      supervisorName: supKind === "faculty" || supMember === OTHER ? supName : "",
    });
    if (r.ok) {
      setMode(null);
      onDone(`Approved '${request.title}' as SP-${ref.padStart(3, "0")}. Its ${METHODOLOGY_LABEL[methodology]} board is ready.`);
      router.refresh();
    } else {
      setErrors(r.fieldErrors ?? {});
      setError(r.error ?? null);
    }
  };

  const decline = async () => {
    const r = await declineRequest({ id: request.id, reason });
    if (r.ok) {
      setMode(null);
      onDone(`Declined '${request.title}'.`);
      router.refresh();
    } else {
      setErrors(r.fieldErrors ?? {});
      setError(r.error ?? null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => open("approve")}>
          Approve…
        </Button>
        <Button variant="outline" onClick={() => open("decline")}>
          Decline…
        </Button>
      </div>

      <ConfirmDialog
        open={mode === "approve"}
        onOpenChange={(o) => !o && setMode(null)}
        title={`Approve '${request.title}'?`}
        tone="default"
        confirmLabel="Approve and create board"
        pendingLabel="Approving…"
        onConfirm={approve}
        formContent={
          <div className="flex flex-col gap-4 text-ink">
            <p className="text-ink-muted">
              Creates a {METHODOLOGY_LABEL[methodology]} board with 5 columns and makes{" "}
              {request.requester?.name ?? "the requester"} its lead.
            </p>
            <Field label="Ref" error={errors.ref?.[0]} helper={`Next free: ${nextRef}.`}>
              <Input mono prefix="SP-" value={ref} onChange={(e) => setRef(e.target.value)} inputMode="numeric" />
            </Field>
            <Field label="Methodology" error={errors.methodology?.[0]}>
              <Select value={methodology} onChange={(e) => setMethodology(e.target.value as Methodology)}>
                {(["kanban", "scrumban", "scrum", "safe"] as const).map((m) => (
                  <option key={m} value={m}>
                    {METHODOLOGY_LABEL[m]}
                  </option>
                ))}
              </Select>
            </Field>
            <RadioCards
              legend="Supervisor"
              name={`sup-${request.id}`}
              layout="row"
              value={supKind}
              onChange={(v) => setSupKind(v as SupervisorKind)}
              options={[
                { value: "faculty", label: "Faculty" },
                { value: "student", label: "Student" },
              ]}
            />
            {supKind === "student" ? (
              <Field label="Member" error={errors.supervisorMemberId?.[0]}>
                <Select value={supMember} onChange={(e) => setSupMember(e.target.value)}>
                  <option value="">Choose a member</option>
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={OTHER}>Someone not listed</option>
                </Select>
              </Field>
            ) : null}
            {supKind === "faculty" || supMember === OTHER ? (
              <Field label="Supervisor's name" error={errors.supervisorName?.[0]}>
                <Input value={supName} onChange={(e) => setSupName(e.target.value)} />
              </Field>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>
        }
      />

      <ConfirmDialog
        open={mode === "decline"}
        onOpenChange={(o) => !o && setMode(null)}
        title={`Decline '${request.title}'?`}
        confirmLabel="Decline request"
        pendingLabel="Declining…"
        onConfirm={decline}
        formContent={
          <div className="flex flex-col gap-3 text-ink">
            <p className="text-ink-muted">
              The request is archived. {request.requester?.name ?? "The requester"} sees the reason on their dashboard.
            </p>
            <Field label="Reason" optional error={errors.reason?.[0]}>
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} />
            </Field>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>
        }
      />
    </>
  );
}
