"use client";

/* Members tab: supervisor first (name, kind chip,
 * "Supervisor"), then members (avatar, name, Lead/Member chip, joined
 * date). Leads and editors add people (a select of every account not yet
 * on the project, plus a role) and remove them with a confirm. */

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Select } from "@/components/forms/input";
import { MicroLabel } from "@/components/ui/micro-label";
import { Pill } from "@/components/ui/pill";
import { addProjectMember, removeProjectMember } from "@/lib/actions/projects-pm";
import { formatInstant } from "@/lib/data/dates";
import type { BoardMember, PersonRef, PmSupervisor } from "@/lib/data/pm";

import { KindChip, PersonAvatar } from "./meta";

export function MembersPanel({
  projectId,
  projectTitle,
  supervisor,
  members,
  people,
  canManage,
  me,
}: {
  projectId: string;
  projectTitle: string;
  supervisor: PmSupervisor | null;
  members: BoardMember[];
  people: PersonRef[];
  canManage: boolean;
  me: string;
}) {
  const router = useRouter();
  const [pick, setPick] = React.useState("");
  const [role, setRole] = React.useState<"member" | "lead">("member");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [removing, setRemoving] = React.useState<BoardMember | null>(null);
  const onProject = new Set(members.map((m) => m.id));
  const candidates = people.filter((p) => !onProject.has(p.id));

  const add = async () => {
    if (!pick) return;
    setBusy(true);
    const person = people.find((p) => p.id === pick);
    const r = await addProjectMember({ projectId, profileId: pick, role });
    setBusy(false);
    if ("error" in r && r.error) setMessage({ tone: "error", text: r.error });
    else {
      setMessage({ tone: "ok", text: `Added ${person?.name ?? "them"} as ${role === "lead" ? "a lead" : "a member"}.` });
      setPick("");
      setRole("member");
      router.refresh();
    }
  };

  return (
    <div className="flex max-w-text flex-col gap-8">
      <section aria-labelledby="sup-h" className="flex flex-col gap-3">
        <MicroLabel as="h2" id="sup-h">
          Supervisor
        </MicroLabel>
        {supervisor ? (
          <div className="flex items-center gap-3 border-y border-line py-3">
            <PersonAvatar name={supervisor.name} photo={supervisor.photo} size={32} />
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink">{supervisor.name}</span>
              <KindChip kind={supervisor.kind} />
            </div>
            <span className="text-xs text-ink-muted">Supervisor</span>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">No supervisor set. An editor can set one in the admin project form.</p>
        )}
      </section>

      <section aria-labelledby="mem-h" className="flex flex-col gap-3">
        <MicroLabel as="h2" id="mem-h">
          Members · {members.length}
        </MicroLabel>
        {message ? (
          <p role={message.tone === "error" ? "alert" : "status"} className={message.tone === "error" ? "text-sm text-danger" : "text-sm text-success"}>
            {message.text}
          </p>
        ) : null}
        {members.length ? (
          <ul className="flex flex-col">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 border-t border-line py-3 last:border-b">
                <PersonAvatar name={m.name} photo={m.photo} size={32} />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                    {m.name}
                    {m.id === me ? <span className="text-xs font-normal text-ink-muted">(you)</span> : null}
                    <Pill className="whitespace-nowrap uppercase">{m.role === "lead" ? "Lead" : "Member"}</Pill>
                  </span>
                  <span className="text-xs text-ink-muted">
                    Joined{" "}
                    <time dateTime={m.joinedAt}>{formatInstant(new Date(m.joinedAt), { month: "short", day: "numeric", year: "numeric" })}</time>
                  </span>
                </div>
                {canManage ? (
                  <Button size="sm" variant="text" onClick={() => setRemoving(m)} aria-label={`Remove ${m.name}`}>
                    Remove…
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-muted">Nobody on the project yet.</p>
        )}
      </section>

      {canManage ? (
        <section aria-labelledby="add-h" className="flex flex-col gap-3">
          <MicroLabel as="h2" id="add-h">
            Add member
          </MicroLabel>
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem_auto] sm:items-end">
            <Field label="Person">
              <Select value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Choose someone</option>
                {candidates.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Role">
              <Select value={role} onChange={(e) => setRole(e.target.value as "member" | "lead")}>
                <option value="member">Member</option>
                <option value="lead">Lead</option>
              </Select>
            </Field>
            <Button variant="outline" onClick={add} disabled={!pick} pending={busy} pendingLabel="Adding…">
              Add member
            </Button>
          </div>
          <p className="text-xs text-ink-muted">Leads add and remove members. Members edit the board.</p>
        </section>
      ) : null}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={removing ? `Remove ${removing.name}?` : ""}
        confirmLabel="Remove member"
        pendingLabel="Removing…"
        onConfirm={async () => {
          if (!removing) return;
          const r = await removeProjectMember({ projectId, profileId: removing.id });
          if ("error" in r && r.error) setMessage({ tone: "error", text: r.error });
          else {
            setMessage({ tone: "ok", text: `Removed ${removing.name}.` });
            router.refresh();
          }
          setRemoving(null);
        }}
      >
        <p>
          {removing?.id === me ? "You" : removing?.name} will no longer be able to edit {projectTitle}. Their tasks stay assigned.
        </p>
      </ConfirmDialog>
    </div>
  );
}
