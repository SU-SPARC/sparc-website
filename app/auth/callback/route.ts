/* PKCE code exchange for Supabase's default email templates
 * ({{ .ConfirmationURL }} → Supabase verifies → here with ?code=…).
 * `next` is a same-origin path; a failed exchange lands on the
 * "link expired" state. */

import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { safeNextPath } from "@/lib/supabase/next-path";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"), "/dashboard");

  if (!code) {
    // Supabase reports link errors as ?error=…&error_code=otp_expired.
    redirect("/auth/update-password?error=expired");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) redirect("/auth/update-password?error=expired");
  redirect(next);
}
