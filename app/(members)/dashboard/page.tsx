/* Members hub (docs/DESIGN-BRIEF.md §6). ≥1024px: 2fr / 1fr — left column
 * for tasks, projects and requests, right column for "My card". Mobile:
 * one column, card first.
 *
 * The left column is placeholder copy for now: agent G (project boards)
 * replaces the three PLACEHOLDER sections below with real queries
 * (lib/data/pm.ts). Keep the headings, order and empty-state lines. */

import type { Metadata } from "next";

import { ButtonLink } from "@/components/forms/button";
import { StatusBanner } from "@/components/forms/status-banner";
import { MicroLabel } from "@/components/ui/micro-label";
import { PersonCard } from "@/components/ui/person-card";
import { requireUser } from "@/lib/auth";
import { getOwnCard } from "@/lib/actions/queries";
import { formatInstant } from "@/lib/data/dates";

export const metadata: Metadata = { title: "Dashboard" };

const ROLE_LABEL = { member: "Member", editor: "Editor", admin: "Admin" } as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  const current = await requireUser("/dashboard");
  const { profile } = current;
  const card = await getOwnCard(current);
  const name = profile.display_name || profile.email || "Your dashboard";
  const joined = formatInstant(new Date(profile.created_at), { month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-8">
      {notice ? <StatusBanner clearParam="notice">{notice}</StatusBanner> : null}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-medium text-ink [overflow-wrap:anywhere]">{name}</h1>
        <p className="text-sm text-ink-muted">
          {ROLE_LABEL[profile.role]} · joined {joined}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <section aria-labelledby="my-card" className="flex flex-col gap-4 lg:order-2">
          <MicroLabel as="h2" id="my-card">
            My card
          </MicroLabel>
          {card ? (
            <>
              {!card.member.photo || !card.member.bio ? (
                <p className="text-sm text-ink-muted">Your card has no photo or bio yet.</p>
              ) : null}
              <ul className="max-w-[20rem]">
                <PersonCard member={card.member} />
              </ul>
              <div className="flex flex-wrap items-center gap-3">
                <ButtonLink href="/dashboard/profile" variant="outline">
                  Edit profile
                </ButtonLink>
                <span className="text-xs text-ink-muted">
                  {card.row.published ? "Published on /about" : "Hidden from /about"}
                </span>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-muted">
                Your account isn't linked to a member card. Ask an e-board admin to link it.
              </p>
              <div>
                <ButtonLink href="/dashboard/profile" variant="outline">
                  Edit profile
                </ButtonLink>
              </div>
            </>
          )}
        </section>

        <div className="flex flex-col gap-10 lg:order-1">
          {/* PLACEHOLDER (agent G): My tasks — open tasks assigned to me
              across projects, due soonest first, max 5; "All my tasks" link
              when there are more. */}
          <section aria-labelledby="my-tasks" className="flex flex-col gap-3">
            <MicroLabel as="h2" id="my-tasks">
              My tasks
            </MicroLabel>
            <p className="text-sm text-ink-muted">Nothing assigned to you.</p>
          </section>

          {/* PLACEHOLDER (agent G): My projects — compact rows: title,
              status chip, progress "7/12", last activity; row → board. */}
          <section aria-labelledby="my-projects" className="flex flex-col gap-3">
            <MicroLabel as="h2" id="my-projects">
              My projects
            </MicroLabel>
            <p className="text-sm text-ink-muted">You're not on a project yet.</p>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              <a href="/dashboard/projects" className="text-ink underline underline-offset-4 hover:text-accent-text">
                Browse projects
              </a>
              <a href="/dashboard/projects/new" className="text-ink underline underline-offset-4 hover:text-accent-text">
                Request a project
              </a>
            </p>
          </section>

          {/* PLACEHOLDER (agent G): My requests — my projects with status
              'proposed': title, submitted date, "Waiting for e-board
              review". Omitted entirely when empty (brief §6). */}
        </div>
      </div>
    </div>
  );
}
