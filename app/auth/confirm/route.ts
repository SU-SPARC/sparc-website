/* Email link handler for token_hash templates:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 * verifyOtp sets the session cookie, then:
 *   invite / recovery → /auth/update-password?type=…
 *   anything else     → `next` (same-origin path only), default /dashboard
 * A failed verify (expired or used link) lands on the update-password page's
 * "This link has expired" state. */

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { safeNextPath } from "@/lib/supabase/next-path";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"];

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const rawType = searchParams.get("type");
  const type = TYPES.find((t) => t === rawType);
  const next = safeNextPath(searchParams.get("next"), "/dashboard");

  if (!tokenHash || !type) redirect("/auth/update-password?error=invalid");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) redirect("/auth/update-password?error=expired");

  if (type === "invite" || type === "recovery") redirect(`/auth/update-password?type=${type}`);
  redirect(next);
}
