import type { Metadata } from "next";

import { AccountsList, type AccountRow } from "@/components/admin/accounts-list";
import { adminPage, editorPage } from "@/lib/actions/queries";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Accounts" };

export default async function AccountsPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const me = await adminPage("/admin/accounts");
  if (!me) {
    const editor = await editorPage("/admin/accounts");
    return editor ? <p className="text-sm text-ink-muted">Accounts are managed by admins.</p> : null;
  }
  const { notice } = await searchParams;
  const supabase = await createClient();
  const [{ data: profiles, error }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("id, email, display_name, role, member_id, created_at").order("created_at"),
    supabase.from("members").select("id, name").order("name"),
  ]);
  if (error) throw new Error(error.message);
  const names = new Map((members ?? []).map((m) => [m.id, m.name]));
  const linked = new Set((profiles ?? []).map((p) => p.member_id).filter(Boolean));

  const rows: AccountRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: p.email ?? "",
    name: p.display_name || p.email || "Unnamed",
    role: p.role,
    memberId: p.member_id,
    memberName: p.member_id ? (names.get(p.member_id) ?? null) : null,
    createdAt: p.created_at,
  }));

  return (
    <AccountsList
      rows={rows}
      meId={me.user.id}
      adminCount={rows.filter((r) => r.role === "admin").length}
      cards={(members ?? []).map((m) => ({ id: m.id, name: m.name, linked: linked.has(m.id) }))}
      notice={notice}
      loginUrl={`${siteUrl()}/login`}
    />
  );
}
