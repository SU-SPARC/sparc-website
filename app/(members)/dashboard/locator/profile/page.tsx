/* Members' Locator profile: the same
 * CareerProfileForm as /admin/locator/profile; saveCareerProfile is own-row
 * for every role. */

import type { Metadata } from "next";

import { CareerProfileForm } from "@/components/locator/career-profile-form";
import { requireUser } from "@/lib/auth";
import { profilePath } from "@/lib/data/locator";
import { getCareerProfile } from "@/lib/data/opportunities";

export const metadata: Metadata = { title: "Locator profile" };

export default async function MemberLocatorProfilePage() {
  await requireUser(profilePath("member"));
  const profile = await getCareerProfile();
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-medium text-ink">Your Locator profile</h1>
        <p className="max-w-text text-sm text-ink-muted">
          &ldquo;Check my eligibility&rdquo; reads this with each listing to judge whether you can apply and how well
          it fits your goals. Only you can see it.
        </p>
      </header>
      <CareerProfileForm profile={profile} />
    </>
  );
}
