import type { Metadata } from "next";

import { getCurrentUser } from "@/lib/auth";

import { LinkExpired, UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "Set password", robots: { index: false } };

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; error?: string }>;
}) {
  const sp = await searchParams;
  if (sp.error) return <LinkExpired />;

  const current = await getCurrentUser();
  const type = sp.type === "invite" ? "invite" : sp.type === "recovery" ? "recovery" : "change";
  return <UpdatePasswordForm email={current ? (current.profile.email ?? current.user.email ?? "") : null} type={type} />;
}
