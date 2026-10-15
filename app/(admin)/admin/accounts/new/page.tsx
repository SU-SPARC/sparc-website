import type { Metadata } from "next";

import { NewAccountForm } from "@/components/admin/new-account-form";
import { smtpConfigured } from "@/lib/actions/accounts";
import { adminPage, editorPage } from "@/lib/actions/queries";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New account" };

export default async function NewAccountPage() {
  const me = await adminPage("/admin/accounts/new");
  if (!me) {
    const editor = await editorPage("/admin/accounts/new");
    return editor ? <p className="text-sm text-ink-muted">Accounts are managed by admins.</p> : null;
  }
  const supabase = await createClient();
  const [{ data: members }, { data: profiles }] = await Promise.all([
    supabase.from("members").select("id, name").order("name"),
    supabase.from("profiles").select("member_id"),
  ]);
  const linked = new Set((profiles ?? []).map((p) => p.member_id).filter(Boolean));

  return (
    <NewAccountForm
        cards={(members ?? []).filter((m) => !linked.has(m.id))}
        smtp={await smtpConfigured()}
        loginUrl={`${siteUrl()}/login`}
      />
  );
}
