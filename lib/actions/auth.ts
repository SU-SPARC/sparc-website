"use server";

/* Auth server actions: sign in, sign out, password reset request, set a
 * new password. Used with useActionState (see app/(auth)). */

import { redirect } from "next/navigation";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { siteUrl } from "@/lib/supabase/env";
import { safeNextPath } from "@/lib/supabase/next-path";
import { createClient } from "@/lib/supabase/server";

import type { FormState } from "./form-state";

const SignIn = z.object({
  email: z.email({ error: "Enter an email address like name@suffolk.edu." }),
  password: z.string().min(1, { error: "Enter your password." }),
});

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = SignIn.safeParse({ email, password: formData.get("password") ?? "" });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, data: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.status === 429) {
      return { error: "Too many sign-in attempts. Wait a few minutes and try again.", data: { email } };
    }
    return { error: "Email or password is wrong.", data: { email } };
  }

  redirect(safeNextPath(String(formData.get("next") ?? ""), "/dashboard"));
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  // 'local' signs out this browser only; the default 'global' would revoke
  // the shared e-board login on every device.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

const ResetRequest = z.object({
  email: z.email({ error: "Enter an email address like name@suffolk.edu." }),
});

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = ResetRequest.safeParse({ email });
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, data: { email } };
  }

  const supabase = await createClient();
  // Default email template: {{ .ConfirmationURL }} → Supabase verifies →
  // /auth/callback?code=… (PKCE; the verifier cookie is set by this call).
  const next = "/auth/update-password?type=recovery";
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
  });
  if (error && error.status === 429) {
    return { error: "Too many requests. Try again in an hour.", data: { email } };
  }
  // Same answer whether or not the account exists.
  return { ok: true, data: { email } };
}

const NewPassword = z
  .object({
    password: z.string().min(8, { error: "At least 8 characters." }),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    error: "The two passwords don't match.",
    path: ["confirm"],
  });

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const current = await getCurrentUser();
  if (!current) {
    return { error: "Your session has ended. Open the link from your email again, or sign in." };
  }
  const parsed = NewPassword.safeParse({
    password: formData.get("password") ?? "",
    confirm: formData.get("confirm") ?? "",
  });
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") {
      return { fieldErrors: { password: ["Choose a password different from your current one."] } };
    }
    if (error.code === "weak_password") {
      return { fieldErrors: { password: [error.message] } };
    }
    return { error: "Couldn't set the password. Try again." };
  }
  redirect(`/dashboard?notice=${encodeURIComponent("Password set. You're signed in.")}`);
}
