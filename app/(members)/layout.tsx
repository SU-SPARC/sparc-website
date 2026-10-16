/* Signed-in members shell (docs/DESIGN-BRIEF.md §6). Every route below
 * requires a session; the role is re-checked here on the server (the proxy
 * redirect is a convenience, RLS is the guard).
 *
 * Nav routes: /dashboard (exact), /dashboard/projects, /dashboard/locator
 * (the members' read-only Locator, docs/LOCATOR.md), /dashboard/profile, and
 * /admin for editors. Pages render their own <main>-level content inside
 * `max-w-page px-gutter`. */

import type { Metadata } from "next";

import { MembersTopbar } from "@/components/admin/members-topbar";
import { isEditorRole, requireUser } from "@/lib/auth";

export const metadata: Metadata = { robots: { index: false } };

export default async function MembersLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const current = await requireUser("/dashboard");
  const email = current.profile.email ?? current.user.email ?? "";
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <MembersTopbar email={email} role={current.profile.role} isEditor={isEditorRole(current.profile.role)} />
      <main id="main" className="mx-auto max-w-page px-gutter py-8">
        {children}
      </main>
    </>
  );
}
