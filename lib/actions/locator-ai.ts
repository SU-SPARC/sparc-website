"use server";

import { z } from "zod";

import { AI_NOT_CONFIGURED_CHECK, AI_NOT_CONFIGURED_IMPORT, aiConfigured, LOCATOR_MODEL } from "@/lib/ai/client";
import { fetchPageText, FetchPageError } from "@/lib/ai/fetch-page";
import { extractOpportunity, inputsHash, LocatorAiError, runEligibilityCheck } from "@/lib/ai/locator";
import { requireUser } from "@/lib/auth";
import { getCareerProfile, getOpportunity } from "@/lib/data/opportunities";
import type { EligibilityCheck } from "@/lib/data/types";
import { createClient } from "@/lib/supabase/server";

import { editorSession } from "./content-helpers";
import { ok, zodFail } from "./form-data";
import type { FormState } from "./form-state";

export type EligibilityActionResult =
  | { ok: true; check: EligibilityCheck; profileComplete: boolean }
  | { ok: false; code: "not_configured" | "no_profile" | "refused" | "rate_limited" | "failed"; error: string };

/** Any signed-in account: the check reads the caller's own profile and a
 *  listing RLS lets them see (members: published rows only), and writes
 *  their own eligibility_checks row. Import stays editor-only below. */
export async function checkEligibility(opportunityId: string): Promise<EligibilityActionResult> {
  const current = await requireUser("/dashboard/locator");
  const supabase = await createClient();
  try {
    const found = await getOpportunity(opportunityId);
    if (!found) return { ok: false, code: "failed", error: "Listing not found." };
    if (!aiConfigured()) {
      return { ok: false, code: "not_configured", error: AI_NOT_CONFIGURED_CHECK };
    }
    const profile = await getCareerProfile();
    if (!profile) {
      return { ok: false, code: "no_profile", error: "Fill in your Locator profile first." };
    }

    const { check: _previous, ...opportunity } = found;
    void _previous;
    const out = await runEligibilityCheck(opportunity, profile);
    const row = {
      opportunity_id: opportunity.id,
      profile_id: current.user.id,
      ...out,
      model: LOCATOR_MODEL,
      inputs_hash: inputsHash(opportunity, profile, LOCATOR_MODEL),
      checked_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from("eligibility_checks")
      .upsert(row, { onConflict: "opportunity_id,profile_id" })
      .select("*")
      .single();
    if (error || !data) return { ok: false, code: "failed", error: `Couldn't save the check: ${error?.message ?? "no row returned"}` };

    const profileComplete = Boolean(profile.major?.trim() && profile.expected_grad_year && profile.goals?.trim());
    return { ok: true, check: data as EligibilityCheck, profileComplete };
  } catch (err) {
    if (err instanceof LocatorAiError) return { ok: false, code: err.code, error: err.message };
    return { ok: false, code: "failed", error: "The check failed. Try again." };
  }
}

const ImportShape = z.object({
  url: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.url({ protocol: /^https?$/, error: "Enter a full link starting with https://." })),
  kind: z.enum(["internship", "conference", "networking", "hackathon"], { error: "Pick a listing type." }),
});

export async function importOpportunityFromUrl(_prev: FormState, fd: FormData): Promise<FormState> {
  await editorSession();
  const parsed = ImportShape.safeParse({ url: fd.get("url") ?? "", kind: fd.get("kind") ?? "" });
  if (!parsed.success) return zodFail(parsed.error);
  if (!aiConfigured()) return { error: AI_NOT_CONFIGURED_IMPORT };

  const { url, kind } = parsed.data;
  let page;
  try {
    page = await fetchPageText(url);
  } catch (err) {
    const reason = err instanceof FetchPageError ? err.message : "network error";
    return { error: `Couldn't read that page: ${reason}.` };
  }
  if (page.text.length < 40) return { error: "Couldn't read that page: it has almost no text (it may need JavaScript or a sign-in)." };

  try {
    const draft = await extractOpportunity(kind, url, page);
    return ok({ draft: JSON.stringify(draft) });
  } catch (err) {
    if (err instanceof LocatorAiError) return { error: err.message };
    return { error: "The import failed. Try again." };
  }
}
