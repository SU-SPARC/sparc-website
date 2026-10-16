"use server";

/* Account management (admin only). Every action starts with requireAdmin();
 * the Auth admin API runs with the secret key (createAdminClient), role and
 * card changes go through the admin RPCs on the admin's own session so the
 * database re-checks private.is_admin().
 *
 * Temporary passwords are returned to the caller once (FormState.data) and
 * never stored, logged or put in a URL. */

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

import { revalidateSite, slugifyTitle } from "./content-helpers";
import { withNotice, zodFail } from "./form-data";
import type { FormState } from "./form-state";

// No 0/O/o, 1/l/I: these get misread when a password is read aloud or copied by hand.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function temporaryPassword(length = 16): string {
  const out: string[] = [];
  const limit = 256 - (256 % ALPHABET.length); // rejection sampling: no modulo bias
  while (out.length < length) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    for (const b of bytes) if (b < limit && out.length < length) out.push(ALPHABET[b % ALPHABET.length]);
  }
  return out.join("");
}

export type AccountRole = "member" | "editor" | "admin";

/** Whether invite emails can be sent (custom SMTP configured). Set
 *  AUTH_SMTP_CONFIGURED=true once docs/CMS.md's SMTP setup is done. */
export async function smtpConfigured(): Promise<boolean> {
  return process.env.AUTH_SMTP_CONFIGURED === "true";
}

const NewAccount = z.object({
  email: z.email({ error: "Enter an email address." }).transform((v) => v.trim().toLowerCase()),
  display_name: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, { error: "Enter their name." }).max(80)),
  role: z.enum(["member", "editor", "admin"]),
  card: z.enum(["existing", "new", "none"]),
  member_id: z.string().optional(),
  class_year: z.string().optional(),
  method: z.enum(["password", "invite"]),
});

async function uniqueSlug(base: string): Promise<string> {
  const supabase = await createClient();
  const root = slugifyTitle(base) || "member";
  for (let i = 0; i < 50; i++) {
    const candidate = i === 0 ? root : `${root}-${i + 1}`;
    const { data } = await supabase.from("members").select("id").eq("slug", candidate).limit(1);
    if (!data?.length) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function createAccount(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin("/admin/accounts/new");
  const parsed = NewAccount.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodFail(parsed.error);
  const v = parsed.data;

  const extra: Record<string, string[]> = {};
  if (v.card === "existing" && !v.member_id) extra.member_id = ["Pick a card, or choose another option."];
  const year = Number(v.class_year);
  if (v.card === "new" && (!Number.isInteger(year) || year < 1990 || year > 2100)) {
    extra.class_year = ["Enter a year like 2028."];
  }
  if (v.method === "invite" && !(await smtpConfigured())) extra.method = ["Invites need custom SMTP. Use a temporary password."];
  if (Object.keys(extra).length) return { fieldErrors: extra };

  const admin = createAdminClient();
  const supabase = await createClient();

  if (v.card === "existing" && v.member_id) {
    const { data: taken } = await supabase.from("profiles").select("email").eq("member_id", v.member_id).maybeSingle();
    if (taken) return { fieldErrors: { member_id: [`That card is already linked to ${taken.email ?? "another account"}.`] } };
  }

  let userId: string;
  let password: string | undefined;
  if (v.method === "password") {
    password = temporaryPassword();
    const { data, error } = await admin.auth.admin.createUser({
      email: v.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: v.display_name },
    });
    if (error) {
      if (error.code === "email_exists" || /already been registered/i.test(error.message)) {
        return { fieldErrors: { email: ["An account with this email already exists."] } };
      }
      return { error: `Couldn't create the account: ${error.message}` };
    }
    userId = data.user.id;
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(v.email, {
      data: { display_name: v.display_name },
      redirectTo: `${siteUrl()}/auth/update-password?type=invite`,
    });
    if (error) {
      if (error.code === "email_exists" || /already been registered/i.test(error.message)) {
        return { fieldErrors: { email: ["An account with this email already exists."] } };
      }
      return { error: `Couldn't send the invite: ${error.message}` };
    }
    userId = data.user.id;
  }

  // From here the account exists; report partial failures instead of
  // pretending nothing happened.
  const problems: string[] = [];
  if (v.role !== "member") {
    const { error } = await supabase.rpc("admin_set_role", { target: userId, new_role: v.role });
    if (error) problems.push(`role not set (${error.message})`);
  }
  let memberId: string | null = null;
  if (v.card === "existing" && v.member_id) memberId = v.member_id;
  if (v.card === "new") {
    const { data, error } = await supabase
      .from("members")
      .insert({
        name: v.display_name,
        slug: await uniqueSlug(v.display_name),
        class_year: year,
        status: "current",
        participated: [new Date().getFullYear()],
        // Hidden until it has a photo and bio; the member can fill it in
        // from /dashboard/profile and an editor publishes it.
        published: false,
        sort_order: 1000,
      })
      .select("id")
      .single();
    if (error) problems.push(`card not created (${error.message})`);
    else memberId = data.id;
  }
  if (memberId) {
    const { error } = await supabase.rpc("admin_link_member", { target: userId, member: memberId });
    if (error) problems.push(`card not linked (${error.message})`);
  }
  revalidateSite();

  if (v.method === "invite") {
    const note = problems.length ? ` Note: ${problems.join("; ")}.` : "";
    redirect(withNotice("/admin/accounts", `Invite sent to ${v.email}.${note}`));
  }
  return {
    ok: true,
    data: {
      email: v.email,
      name: v.display_name,
      password,
      warning: problems.length ? `Account created, but: ${problems.join("; ")}.` : undefined,
    },
  };
}

async function adminCount(): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "admin");
  return count ?? 0;
}

export async function setRole(userId: string, role: AccountRole): Promise<{ error?: string }> {
  const me = await requireAdmin("/admin/accounts");
  if (userId === me.user.id) return { error: "You can't change your own role." };
  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!target) return { error: "That account no longer exists." };
  if (target.role === "admin" && role !== "admin" && (await adminCount()) <= 1) {
    return { error: "This is the last admin. Make someone else an admin first." };
  }
  const { error } = await supabase.rpc("admin_set_role", { target: userId, new_role: role });
  if (error) return { error: error.message };
  revalidateSite();
  return {};
}

export async function resetPassword(userId: string): Promise<{ error?: string; password?: string; email?: string; name?: string }> {
  await requireAdmin("/admin/accounts");
  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("email, display_name").eq("id", userId).maybeSingle();
  if (!target) return { error: "That account no longer exists." };
  const password = temporaryPassword();
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password });
  if (error) return { error: error.message };
  return { password, email: target.email ?? "", name: target.display_name ?? target.email ?? "" };
}

export async function linkCard(userId: string, memberId: string | null): Promise<{ error?: string }> {
  await requireAdmin("/admin/accounts");
  const supabase = await createClient();
  if (memberId) {
    const { data: taken } = await supabase.from("profiles").select("id, email").eq("member_id", memberId).maybeSingle();
    if (taken && taken.id !== userId) return { error: `That card is already linked to ${taken.email ?? "another account"}.` };
  }
  const { error } = await supabase.rpc("admin_link_member", { target: userId, member: memberId as string });
  if (error) return { error: error.message };
  revalidateSite();
  return {};
}
