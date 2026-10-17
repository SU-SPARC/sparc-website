"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { isoDateOnly } from "@/lib/data/dates";
import { KINDS, kindPath } from "@/lib/data/locator";
import type { InternshipTerm, OpportunityKind } from "@/lib/data/types";

import { editorSession, revalidateSite } from "./content-helpers";
import {
  formObject,
  isUniqueViolation,
  ok,
  withNotice,
  zBool,
  zodFail,
  zOptDateOnly,
  zOptText,
  zOptUrl,
  zText,
  zUrl,
} from "./form-data";
import type { FieldErrors, FormState } from "./form-state";

const TERMS = ["coop", "semester_part_time", "summer", "winter"] as const satisfies readonly InternshipTerm[];

/** Comma-separated tags → lowercase, trimmed, unique. */
const zTags = z
  .string()
  .optional()
  .transform((v) => [
    ...new Set(
      (v ?? "")
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  ]);

const zMax = (max: number) => zOptText.pipe(z.string().max(max, { error: `Keep it under ${max} characters.` }).nullable());

const OpportunityShape = z.object({
  kind: z.enum(KINDS as [OpportunityKind, ...OpportunityKind[]], { error: "Pick a kind." }),
  title: zText("a title", 200),
  slug: z
    .string({ error: "Enter a slug." })
    .transform((v) => v.trim().toLowerCase())
    .pipe(
      z
        .string()
        .min(1, { error: "Enter a slug." })
        .max(100, { error: "Keep it under 100 characters." })
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Use lowercase letters, numbers and hyphens." }),
    ),
  organizer: zText("the organizer", 200),
  organizer_url: zOptUrl,
  organizer_blurb: zMax(200),
  url: zUrl,
  posting_site: zMax(80),
  summary: zMax(400),
  description: zMax(6000),
  area: z.enum(["suffolk", "boston", "outside_boston", "online"], { error: "Pick an area." }),
  format: z.enum(["in_person", "online", "hybrid"], { error: "Pick a format." }),
  location: zMax(200),
  starts_on: zOptDateOnly,
  ends_on: zOptDateOnly,
  deadline_on: zOptDateOnly,
  dates_note: zMax(300),
  internship_terms: z.array(z.enum(TERMS, { error: "Pick a listed term." })),
  pay: zMax(120),
  eligibility: zMax(2000),
  tags: zTags,
  verified_on: zOptDateOnly,
  published: zBool,
  source: z
    .string()
    .optional()
    .transform((v) => (v === "import" ? ("import" as const) : undefined)),
});

async function slugTakenBy(
  supabase: Awaited<ReturnType<typeof editorSession>>["supabase"],
  slug: string,
  selfId: string | null,
): Promise<string | null> {
  let q = supabase.from("opportunities").select("id, title").eq("slug", slug).limit(1);
  if (selfId) q = q.neq("id", selfId);
  const { data } = await q;
  const row = data?.[0];
  return row ? `${slug} is taken by '${row.title}'.` : null;
}

export async function saveOpportunity(_prev: FormState, fd: FormData): Promise<FormState> {
  const { current, supabase } = await editorSession();
  const id = (fd.get("id") as string | null) || null;
  const raw = {
    ...formObject(fd),
    internship_terms: fd.getAll("internship_terms").filter((v): v is string => typeof v === "string" && v !== ""),
  };
  const parsed = OpportunityShape.safeParse(raw);
  if (!parsed.success) return zodFail(parsed.error);
  const { source, ...values } = parsed.data;

  const extra: FieldErrors = {};
  if (values.starts_on && values.ends_on && values.ends_on < values.starts_on) {
    extra.ends_on = ["The end date can't be before the start date."];
  }
  if (values.kind !== "internship" && values.internship_terms.length > 0) {
    extra.internship_terms = ["Terms apply to internships only."];
  }
  const taken = await slugTakenBy(supabase, values.slug, id);
  if (taken) extra.slug = [taken];
  if (Object.keys(extra).length) return { fieldErrors: extra };

  if (id) {
    const { error } = await supabase.from("opportunities").update(values).eq("id", id);
    if (isUniqueViolation(error)) return { fieldErrors: { slug: [`${values.slug} is already taken.`] } };
    if (error) return { error: `Couldn't save: ${error.message}` };
    revalidateSite();
    return ok();
  }

  const { data, error } = await supabase
    .from("opportunities")
    .insert({ ...values, source: source ?? "manual", created_by: current.user.id })
    .select("id")
    .single();
  if (isUniqueViolation(error)) return { fieldErrors: { slug: [`${values.slug} is already taken.`] } };
  if (error) return { error: `Couldn't create it: ${error.message}` };
  revalidateSite();
  redirect(withNotice(`${kindPath(values.kind)}/${data.id}`, `Created '${values.title}'.`));
}

export async function setOpportunityPublished(id: string, published: boolean): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("opportunities").update({ published }).eq("id", id);
  revalidateSite();
}

/* Bookkeeping updates. The mark_editor_edit trigger (0004) stamps
 * editor_edited_at only when an editor changes a descriptive column (summary,
 * description, eligibility, tags, area, format, terms, dates note, organizer
 * fields), so these plain updates leave the sync's ownership rules untouched. */

/** verified_on = today in America/New_York. */
export async function markOpportunityVerified(id: string): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("opportunities").update({ verified_on: isoDateOnly(new Date()) }).eq("id", id);
  revalidateSite();
}

/** reviewed_at = now, for a sync row an editor has looked at. */
export async function markOpportunityReviewed(id: string): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("opportunities").update({ reviewed_at: new Date().toISOString() }).eq("id", id);
  revalidateSite();
}

export async function deleteOpportunity(id: string): Promise<void> {
  const { supabase } = await editorSession();
  const { data } = await supabase.from("opportunities").select("kind, title").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/locator");
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) redirect(withNotice(`${kindPath(data.kind)}/${id}`, `Couldn't delete: ${error.message}`));
  revalidateSite();
  redirect(withNotice(kindPath(data.kind), `Deleted '${data.title}'.`));
}
