import type { Metadata } from "next";

import { CareerProfileForm } from "@/components/locator/career-profile-form";
import { editorPage } from "@/lib/actions/queries";
import { getCareerProfile } from "@/lib/data/opportunities";

export const metadata: Metadata = { title: "Locator profile" };

export default async function LocatorProfilePage() {
  const me = await editorPage("/admin/locator/profile");
  if (!me) return null;
  const profile = await getCareerProfile();
  return (
    <>
      <header className="mb-8 flex flex-col gap-2">
        <h1 className="text-2xl font-medium text-ink">Your Locator profile</h1>
        <p className="max-w-text text-sm text-ink-muted">
          The eligibility check reads this with each listing to judge whether you can apply and how well it fits your goals.
        </p>
      </header>
      <CareerProfileForm profile={profile} />
    </>
  );
}
