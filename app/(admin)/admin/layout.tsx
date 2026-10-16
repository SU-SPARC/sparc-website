/* Admin shell (docs/DESIGN-BRIEF.md §1): sidebar + main column ≥1024px,
 * sticky top bar + Expand menu below. Editors and admins only; a signed-in
 * member gets the 403 page in the public chrome (no shell). Signed-out
 * visitors are sent to /login by the proxy and by requireUser here.
 * Every page and server action below re-checks the role itself. */

import type { Metadata } from "next";

import { AdminSidebar, AdminTopbar } from "@/components/admin/admin-sidebar";
import { AdminForbidden } from "@/components/admin/forbidden";
import { isEditorRole, requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · SPARC" },
  robots: { index: false },
};

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const current = await requireUser("/admin");
  if (!isEditorRole(current.profile.role)) return <AdminForbidden />;

  const supabase = await createClient();
  const { count } = await supabase
    .from("projects")
    .select("id", { count: "exact", head: true })
    .eq("status", "proposed");

  const props = {
    email: current.profile.email ?? current.user.email ?? "",
    role: current.profile.role as "editor" | "admin",
    pendingRequests: count ?? 0,
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="lg:flex">
        <AdminSidebar {...props} />
        <AdminTopbar {...props} />
        <main id="main" className="min-w-0 flex-1">
          <div className="mx-auto max-w-page px-gutter py-8">{children}</div>
        </main>
      </div>
    </>
  );
}
