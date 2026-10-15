/* Own profile: display name, own member card (when linked) and password.
 * Writes go through the user's session (lib/actions/profile.ts). */

import type { Metadata } from "next";
import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { getOwnCard, toExistingImage } from "@/lib/actions/queries";

import { PasswordForm, ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const current = await requireUser("/dashboard/profile");
  const card = await getOwnCard(current);
  const email = current.profile.email ?? current.user.email ?? "";

  return (
    <div className="mx-auto flex max-w-text flex-col gap-8">
      <header className="flex flex-col gap-1">
        <p className="text-sm text-ink-muted">
          <Link href="/dashboard" className="hover:text-ink hover:underline">
            Dashboard
          </Link>{" "}
          / Profile
        </p>
        <h1 className="text-2xl font-medium text-ink">Profile</h1>
      </header>

      <ProfileForm
        email={email}
        displayName={current.profile.display_name ?? ""}
        card={
          card
            ? {
                name: card.row.name,
                slug: card.row.slug,
                nickname: card.row.nickname ?? "",
                bio: card.row.bio ?? "",
                linkedin: card.row.linkedin ?? "",
                website: card.row.website ?? "",
                published: card.row.published,
                photo: toExistingImage(card.photo),
              }
            : null
        }
      />

      <PasswordForm email={email} />
    </div>
  );
}
