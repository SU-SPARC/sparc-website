/* Server-side auth helpers for layouts, pages and server actions.
 *
 * getUser() round-trips to the Auth server, so a revoked session is caught.
 * These helpers are a UX guard; RLS is the security boundary. Every server
 * action must still call one of them (actions POST to page routes, so the
 * proxy's redirect does not cover them). */

import "server-only";

import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { cache } from "react";

import type { Database, Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type UserRole = Database["public"]["Enums"]["user_role"];
export type Profile = Tables<"profiles">;
export type CurrentUser = { user: User; profile: Profile };

export function isEditorRole(role: UserRole | null | undefined): boolean {
  return role === "editor" || role === "admin";
}

export function isAdminRole(role: UserRole | null | undefined): boolean {
  return role === "admin";
}

function loginUrl(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** The signed-in user and their profile row, or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;

  return { user, profile };
});

/** The signed-in user's role, or null when signed out. Never redirects, so a
 *  layout can render a 403 itself instead of racing a redirect. Actions keep
 *  using requireEditor / requireAdmin. */
export async function getRole(): Promise<UserRole | null> {
  const current = await getCurrentUser();
  return current?.profile.role ?? null;
}

/** True for editors and admins; false for members and signed-out visitors.
 *  Non-redirecting counterpart of requireEditor. */
export async function hasEditorRole(): Promise<boolean> {
  return isEditorRole(await getRole());
}

/** Any signed-in account. Otherwise → /login?next=<next>. */
export async function requireUser(next = "/dashboard"): Promise<CurrentUser> {
  const current = await getCurrentUser();
  if (!current) redirect(loginUrl(next));
  return current;
}

/** Editor or admin. Signed out → /login; signed-in member → /dashboard. */
export async function requireEditor(next = "/admin"): Promise<CurrentUser> {
  const current = await requireUser(next);
  if (!isEditorRole(current.profile.role)) redirect("/dashboard");
  return current;
}

/** Admin only. Signed out → /login; editor → /admin; member → /dashboard. */
export async function requireAdmin(next = "/admin"): Promise<CurrentUser> {
  const current = await requireUser(next);
  if (!isAdminRole(current.profile.role)) {
    redirect(isEditorRole(current.profile.role) ? "/admin" : "/dashboard");
  }
  return current;
}
