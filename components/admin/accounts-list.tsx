"use client";

/* Accounts list: person, role pill (+ "You"),
 * member card link or "No card · Link…", created date, ⋯ menu with
 * Change role…, Reset password…, Link member card…. Reset swaps the whole
 * page for the one-time password screen. */

import Link from "next/link";
import * as React from "react";

import { ActionMenu } from "@/components/forms/action-menu";
import { ButtonLink } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { Field } from "@/components/forms/field";
import { Select } from "@/components/forms/input";
import { ListRow, ListTable } from "@/components/forms/list";
import { RadioCards } from "@/components/forms/radio-cards";
import { StatusBanner } from "@/components/forms/status-banner";
import { TimeAgo } from "@/components/forms/time-ago";
import { Pill } from "@/components/ui/pill";
import { linkCard, resetPassword, setRole, type AccountRole } from "@/lib/actions/accounts";

import { OneTimePassword } from "./one-time-password";

export type AccountRow = {
  id: string;
  email: string;
  name: string;
  role: AccountRole;
  memberId: string | null;
  memberName: string | null;
  createdAt: string;
};

const ROLE_OPTIONS: Array<{ value: AccountRole; label: string; description: string }> = [
  { value: "member", label: "Member", description: "Edits their own card, requests projects, works on boards they belong to." },
  { value: "editor", label: "Editor", description: "All content, media uploads, approves project requests, edits any board." },
  { value: "admin", label: "Admin", description: "Everything an editor can, plus accounts and roles." },
];

export function AccountsList({
  rows,
  meId,
  adminCount,
  cards,
  notice,
  loginUrl,
}: {
  rows: AccountRow[];
  meId: string;
  adminCount: number;
  cards: Array<{ id: string; name: string; linked: boolean }>;
  notice?: string;
  loginUrl: string;
}) {
  const [roleFor, setRoleFor] = React.useState<AccountRow | null>(null);
  const [newRole, setNewRole] = React.useState<AccountRole>("member");
  const [resetFor, setResetFor] = React.useState<AccountRow | null>(null);
  const [linkFor, setLinkFor] = React.useState<AccountRow | null>(null);
  const [linkTo, setLinkTo] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [oneTime, setOneTime] = React.useState<{ email: string; name: string; password: string } | null>(null);

  if (oneTime) {
    return (
      <OneTimePassword
        title={`New password for ${oneTime.name}`}
        email={oneTime.email}
        name={oneTime.name}
        password={oneTime.password}
        loginUrl={loginUrl}
        doneNotice={`Password reset for ${oneTime.email}.`}
        onDone={() => setOneTime(null)}
      />
    );
  }

  const first = (r: AccountRow) => r.name.split(/\s+/)[0] || r.email;
  const lastAdmin = (r: AccountRow) => r.role === "admin" && adminCount <= 1;
  const roleWord = { member: "a member", editor: "an editor", admin: "an admin" } as const;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="flex items-baseline gap-3 text-2xl font-medium text-ink">
          Accounts <span className="text-base font-normal text-ink-muted tabular-nums">{rows.length}</span>
        </h1>
        <ButtonLink href="/admin/accounts/new" variant="primary">
          <span className="sm:hidden">New</span>
          <span className="max-sm:hidden">New account</span>
        </ButtonLink>
      </header>
      {notice ? <StatusBanner clearParam="notice">{notice}</StatusBanner> : null}
      {error ? (
        <StatusBanner tone="danger" alert onDismiss={() => setError(null)}>
          {error}
        </StatusBanner>
      ) : null}

      <ListTable
        caption="Accounts"
        columns={[
          { label: "Person" },
          { label: "Member card" },
          { label: "Created" },
          { label: "Role" },
          { label: "Actions", srOnly: true, end: true },
        ]}
      >
        {rows.map((r) => (
          <ListRow
            key={r.id}
            title={
              <span className="flex items-center gap-2">
                <span className="truncate">{r.name}</span>
                {r.id === meId ? <Pill className="flex-none">YOU</Pill> : null}
              </span>
            }
            meta={r.email}
            extra={[
              {
                content: r.memberId ? (
                  <Link href={`/admin/members/${r.memberId}`} className="text-ink underline-offset-4 hover:underline">
                    {r.memberName ?? "Card"} →
                  </Link>
                ) : (
                  <span className="text-ink-faint">No card</span>
                ),
              },
              { content: <TimeAgo date={r.createdAt} /> },
            ]}
            state={<Pill className="uppercase">{r.role}</Pill>}
            controls={
              <ActionMenu
                label={`Actions for ${r.name}`}
                items={[
                  {
                    label: "Change role…",
                    disabled: r.id === meId,
                    onSelect: () => {
                      setNewRole(r.role);
                      setRoleFor(r);
                    },
                  },
                  { label: "Reset password…", onSelect: () => setResetFor(r) },
                  {
                    label: r.memberId ? "Change member card…" : "Link member card…",
                    onSelect: () => {
                      setLinkTo(r.memberId ?? "");
                      setLinkFor(r);
                    },
                  },
                ]}
              />
            }
          />
        ))}
      </ListTable>

      <ConfirmDialog
        open={roleFor !== null}
        onOpenChange={(o) => {
          if (!o) setRoleFor(null);
        }}
        tone="default"
        title={roleFor ? `Change ${first(roleFor)}'s role` : ""}
        confirmLabel={roleFor ? `Make ${first(roleFor)} ${roleWord[newRole]}` : "Save"}
        pendingLabel="Saving…"
        confirmDisabled={!roleFor || newRole === roleFor.role}
        onConfirm={async () => {
          if (!roleFor) return;
          const res = await setRole(roleFor.id, newRole);
          setError(res.error ?? null);
          setRoleFor(null);
        }}
        formContent={
          roleFor ? (
            <RadioCards
              legend="Role"
              hideLegend
              name="role-change"
              value={newRole}
              onChange={(v) => setNewRole(v as AccountRole)}
              options={ROLE_OPTIONS.map((o) => ({
                ...o,
                disabled: lastAdmin(roleFor) && o.value !== "admin",
                disabledReason: "This is the last admin. Make someone else an admin first.",
              }))}
            />
          ) : null
        }
      />

      <ConfirmDialog
        open={resetFor !== null}
        onOpenChange={(o) => {
          if (!o) setResetFor(null);
        }}
        title={resetFor ? `Reset ${first(resetFor)}'s password?` : ""}
        confirmLabel="Reset password"
        pendingLabel="Resetting…"
        onConfirm={async () => {
          if (!resetFor) return;
          const res = await resetPassword(resetFor.id);
          setResetFor(null);
          if (res.error || !res.password) setError(res.error ?? "Couldn't reset the password.");
          else setOneTime({ email: res.email ?? resetFor.email, name: res.name || resetFor.name, password: res.password });
        }}
      >
        <p>Their current password stops working now. You'll get a new temporary password to send them.</p>
      </ConfirmDialog>

      <ConfirmDialog
        open={linkFor !== null}
        onOpenChange={(o) => {
          if (!o) setLinkFor(null);
        }}
        tone="default"
        title={linkFor ? `Member card for ${first(linkFor)}` : ""}
        confirmLabel={linkTo ? "Link card" : "Unlink card"}
        pendingLabel="Saving…"
        confirmDisabled={!linkFor || linkTo === (linkFor.memberId ?? "")}
        onConfirm={async () => {
          if (!linkFor) return;
          const res = await linkCard(linkFor.id, linkTo || null);
          setError(res.error ?? null);
          setLinkFor(null);
        }}
        formContent={
          <Field label="Card" helper="Cards already linked to another account aren't listed.">
            <Select value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
              <option value="">No card</option>
              {cards
                .filter((c) => !c.linked || c.id === linkFor?.memberId)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </Field>
        }
      >
        <p>The account can then edit the card's nickname, photo, bio and links.</p>
      </ConfirmDialog>
    </div>
  );
}
