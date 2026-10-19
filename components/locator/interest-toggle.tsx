"use client";

/* "Your interest" rail card on the members' listing page (docs/LOCATOR.md,
 * "Hackathon details and member interest"). Two outline toggles, "I'm
 * interested" and "I'm enrolling"; the active one is accent-filled and
 * pressing it again clears it. An optional one-line note travels with the
 * status. Below, "Members going": everyone's interest (InterestList).
 * Inline feedback only: "Saving…", then "Saved" for a few seconds. */

import { useRouter } from "next/navigation";
import * as React from "react";

import { RailCard } from "@/components/admin/edit-layout";
import { Button } from "@/components/forms/button";
import { Field } from "@/components/forms/field";
import { Input } from "@/components/forms/input";
import { setMyInterest } from "@/lib/actions/interest";
import type { InterestedMember, InterestStatus, OpportunityInterest } from "@/lib/data/types";

import { InterestList } from "./interest-card";

const OPTIONS: { status: InterestStatus; label: string }[] = [
  { status: "interested", label: "I'm interested" },
  { status: "enrolled", label: "I'm enrolling" },
];
const NOTE_MAX = 200;
const SAVED_MS = 3000;

export interface InterestToggleProps {
  opportunityId: string;
  /** the caller's own row, or null */
  initial: OpportunityInterest | null;
  /** everyone's rows, from getInterest() */
  members: InterestedMember[];
  /** the caller's profile id, marked "(you)" in the list */
  selfId: string;
}

export function InterestToggle({ opportunityId, initial, members, selfId }: InterestToggleProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<InterestStatus | null>(initial?.status ?? null);
  const [note, setNote] = React.useState(initial?.note ?? "");
  const [savedNote, setSavedNote] = React.useState(initial?.note ?? "");
  const [error, setError] = React.useState<string | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const save = (next: InterestStatus | null) => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await setMyInterest(opportunityId, next, next ? note : undefined);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStatus(next);
      setSavedNote(next ? note.trim() : "");
      setSaved(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSaved(false), SAVED_MS);
      router.refresh();
    });
  };

  const noteDirty = status !== null && note.trim() !== savedNote.trim();

  return (
    <RailCard title="Your interest">
      <div role="group" aria-label="Your interest" className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => {
          const active = status === o.status;
          return (
            <Button
              key={o.status}
              size="sm"
              variant={active ? "primary" : "outline"}
              aria-pressed={active}
              disabled={pending}
              onClick={() => save(active ? null : o.status)}
            >
              {o.label}
            </Button>
          );
        })}
      </div>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (status) save(status);
        }}
      >
        <Field label="Note" optional helper="Looking for teammates? Say what you need.">
          <Input value={note} maxLength={NOTE_MAX} onChange={(e) => setNote(e.target.value)} autoComplete="off" />
        </Field>
        {noteDirty ? (
          <div>
            <Button type="submit" variant="text" size="sm" disabled={pending}>
              Save note
            </Button>
          </div>
        ) : null}
      </form>
      <p aria-live="polite" className="text-xs empty:hidden">
        {pending ? <span className="text-ink-muted">Saving…</span> : saved ? <span className="text-success">Saved</span> : null}
      </p>
      {error ? (
        <p role="alert" className="text-xs text-danger">
          {error}
        </p>
      ) : null}
      <div className="flex flex-col gap-2 border-t border-line pt-3">
        <h3 className="text-xs text-ink-muted">Members going</h3>
        <InterestList members={members} selfId={selfId} empty="No one yet. Be the first." />
      </div>
    </RailCard>
  );
}
