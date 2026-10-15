import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "./login-form";
import { Button, ButtonLink } from "@/components/forms/button";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/lib/actions/auth";
import { safeNextPath } from "@/lib/supabase/next-path";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const sp = await searchParams;
  const rawNext = typeof sp.next === "string" ? sp.next : undefined;
  const next = safeNextPath(rawNext, "/dashboard");
  const current = await getCurrentUser();

  if (current) {
    // Redirect only when the visitor was sent here with a destination.
    if (rawNext) redirect(next);
    return (
      <div className="flex flex-col gap-5">
        <h1 className="text-xl font-medium text-ink">Signed in</h1>
        <p className="text-sm text-ink-muted">
          Signed in as <span className="text-ink [overflow-wrap:anywhere]">{current.profile.email ?? current.user.email}</span>
        </p>
        <ButtonLink href="/dashboard" variant="primary" full>
          Go to dashboard
        </ButtonLink>
        <form action={signOut}>
          <Button type="submit" variant="text" full>
            Sign out
          </Button>
        </form>
      </div>
    );
  }

  return <LoginForm next={next} />;
}
