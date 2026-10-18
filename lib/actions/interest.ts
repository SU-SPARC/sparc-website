"use server";

/* Member interest in a Locator listing (0005_hackathon_interest.sql,
 * docs/LOCATOR.md, "Hackathon details and member interest"). Any signed-in
 * account; RLS lets each person write only their own row. */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import type { InterestStatus } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

export type InterestActionResult = { ok: true } | { ok: false; error: string };

const NOTE_MAX = 200;

const Input = z.object({
  opportunityId: z.uuid({ error: "Listing not found." }),
  status: z.enum(["interested", "enrolled"]).nullable(),
  note: z
    .string()
    .optional()
    .transform((v) => (v ?? "").replace(/\s+/g, " ").trim() || null)
    .pipe(z.string().max(NOTE_MAX, { error: `Keep the note under ${NOTE_MAX} characters.` }).nullable()),
});

/** Sets the caller's interest in a listing: 'interested' or 'enrolled' with
 *  an optional one-line note; null removes the caller's row. */
export async function setMyInterest(
  opportunityId: string,
  status: InterestStatus | null,
  note?: string,
): Promise<InterestActionResult> {
  const { user } = await requireUser("/dashboard/locator");
  const parsed = Input.safeParse({ opportunityId, status, note });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Couldn't save." };
  const v = parsed.data;
  const supabase = await createClient();

  if (v.status === null) {
    const { error } = await supabase
      .from("opportunity_interest")
      .delete()
      .eq("opportunity_id", v.opportunityId)
      .eq("profile_id", user.id);
    if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  } else {
    // A listing the caller can't see (unpublished, for a member) is refused.
    const { data: listing } = await supabase.from("opportunities").select("id").eq("id", v.opportunityId).maybeSingle();
    if (!listing) return { ok: false, error: "Listing not found." };
    const { error } = await supabase
      .from("opportunity_interest")
      .upsert(
        { opportunity_id: v.opportunityId, profile_id: user.id, status: v.status, note: v.note },
        { onConflict: "opportunity_id,profile_id" },
      );
    if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
  }

  revalidatePath("/dashboard/locator", "layout");
  revalidatePath("/admin/locator", "layout");
  return { ok: true };
}
