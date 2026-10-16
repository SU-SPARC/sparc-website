/* Members hub (docs/DESIGN-BRIEF.md §6). ≥1024px: 2fr / 1fr — left column
 * for tasks, projects and requests, right column for "My card". Mobile:
 * one column, card first.
 *
 * The left column (My tasks, My projects, My requests) comes from
 * getMyDashboard() in lib/data/pm.ts; components/board/dashboard-sections.tsx
 * renders it. `?tasks=all` lifts the 5-task cap. */

import type { Metadata } from "next";
import { cookies } from "next/headers";

import { SEEN_DECLINED_COOKIE } from "@/components/board/board-utils";
import { MyProjectsSection, MyRequestsSection, MyTasksSection } from "@/components/board/dashboard-sections";
import { ButtonLink } from "@/components/forms/button";
import { StatusBanner } from "@/components/forms/status-banner";
import { MicroLabel } from "@/components/ui/micro-label";
import { PersonCard } from "@/components/ui/person-card";
import { requireUser } from "@/lib/auth";
import { getOwnCard } from "@/lib/actions/queries";
import { formatInstant } from "@/lib/data/dates";
import { getMyDashboard } from "@/lib/data/pm";

export const metadata: Metadata = { title: "Dashboard" };

const ROLE_LABEL = { member: "Member", editor: "Editor", admin: "Admin" } as const;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string; tasks?: string }>;
}) {
  const { notice, tasks } = await searchParams;
  const allTasks = tasks === "all";
  const current = await requireUser("/dashboard");
  const { profile } = current;
  const [card, pm, cookieStore] = await Promise.all([
    getOwnCard(current),
    getMyDashboard({ allTasks }),
    cookies(),
  ]);
  const seenDeclined = (cookieStore.get(SEEN_DECLINED_COOKIE)?.value ?? "").split(".").filter(Boolean);
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
          <MyTasksSection tasks={pm.tasks} more={pm.moreTasks} showingAll={allTasks} />
          <MyProjectsSection projects={pm.projects} />
          <MyRequestsSection requests={pm.requests} seen={seenDeclined} />
        </div>
      </div>
    </div>
  );
}
