/* Admin overview: pending requests first, then plain counts in a short
 * table (brief §12: no stat tiles, sparklines or trend arrows). */

import type { Metadata } from "next";
import Link from "next/link";

import { MicroLabel } from "@/components/ui/micro-label";
import { editorPage } from "@/lib/actions/queries";
import { isAdminRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Overview" };

type Counted = "members" | "projects" | "events" | "news" | "photos" | "links";

export default async function AdminOverview() {
  const me = await editorPage();
  if (!me) return null;
  const supabase = await createClient();
  const isAdmin = isAdminRole(me.profile.role);

  const tables: Array<{ table: Counted; label: string; href: string }> = [
    { table: "members", label: "Members", href: "/admin/members" },
    { table: "projects", label: "Projects", href: "/admin/projects" },
    { table: "events", label: "Events", href: "/admin/events" },
    { table: "news", label: "News", href: "/admin/news" },
    { table: "photos", label: "Photos", href: "/admin/photos" },
    { table: "links", label: "Links", href: "/admin/links" },
  ];
  const [pending, ...counts] = await Promise.all([
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("status", "proposed"),
    ...tables.map((t) =>
      Promise.all([
        supabase.from(t.table as "links").select("id", { count: "exact", head: true }),
        supabase.from(t.table as "links").select("id", { count: "exact", head: true }).eq("published", false),
      ]),
    ),
  ]);
  const accounts = isAdmin ? await supabase.from("profiles").select("id", { count: "exact", head: true }) : null;
  const pendingCount = pending.count ?? 0;

  return (
    <div className="flex max-w-text flex-col gap-10">
      <h1 className="text-2xl font-medium text-ink">Overview</h1>

      <section aria-labelledby="requests" className="flex flex-col gap-2">
        <MicroLabel as="h2" id="requests">
          Project requests
        </MicroLabel>
        <p className="text-sm text-ink">
          {pendingCount === 0 ? (
            "No requests waiting for review."
          ) : (
            <Link href="/admin/projects/requests" className="underline underline-offset-4 hover:text-accent-text">
              {pendingCount === 1 ? "1 request is" : `${pendingCount} requests are`} waiting for review
            </Link>
          )}
        </p>
      </section>

      <section aria-labelledby="content" className="flex flex-col gap-3">
        <MicroLabel as="h2" id="content">
          Content
        </MicroLabel>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Content counts</caption>
          <thead>
            <tr className="text-label uppercase text-ink-muted">
              <th scope="col" className="pb-2 font-medium">Type</th>
              <th scope="col" className="pb-2 text-right font-medium">Total</th>
              <th scope="col" className="pb-2 text-right font-medium">Hidden</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t, i) => (
              <tr key={t.table} className="border-t border-line">
                <th scope="row" className="py-2.5 font-normal">
                  <Link href={t.href} className="text-ink underline-offset-4 hover:underline">
                    {t.label}
                  </Link>
                </th>
                <td className="py-2.5 text-right text-ink tabular-nums">{counts[i][0].count ?? 0}</td>
                <td className="py-2.5 text-right text-ink-muted tabular-nums">{counts[i][1].count ?? 0}</td>
              </tr>
            ))}
            {accounts ? (
              <tr className="border-y border-line">
                <th scope="row" className="py-2.5 font-normal">
                  <Link href="/admin/accounts" className="text-ink underline-offset-4 hover:underline">
                    Accounts
                  </Link>
                </th>
                <td className="py-2.5 text-right text-ink tabular-nums">{accounts.count ?? 0}</td>
                <td className="py-2.5 text-right text-ink-faint">—</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </div>
  );
}
