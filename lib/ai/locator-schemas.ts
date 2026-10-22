/* Zod schemas for the Locator AI features. Client-safe: no server-only, no
 * SDK import, so the edit form can validate an imported draft too.
 *
 * Two layers per feature:
 *  - the *output* schema is what the model is asked to return (structured
 *    outputs: every key present, null when unknown);
 *  - the exported result schema/type is what the rest of the app sees. */

import { z } from "zod";

import type {
  Confidence,
  EligibilityVerdict,
  InternshipTerm,
  JobType,
  Opportunity,
  OpportunityArea,
  OpportunityFormat,
  OpportunityKind,
} from "@/lib/data/types";

const VERDICTS = ["eligible", "likely", "unclear", "not_eligible"] as const satisfies readonly EligibilityVerdict[];
const CONFIDENCES = ["low", "medium", "high"] as const satisfies readonly Confidence[];
const KIND_VALUES = ["internship", "conference", "networking", "hackathon"] as const satisfies readonly OpportunityKind[];
// 'coop' stays so the model can say "co-op"; the import turns it into job_type 'coop' (lib/ai/locator.ts).
const TERMS = ["summer", "fall", "spring", "winter", "semester_part_time", "coop"] as const satisfies readonly InternshipTerm[];
const JOB_TYPES = ["internship", "coop", "externship", "new_grad"] as const satisfies readonly JobType[];
const AREAS = ["suffolk", "boston", "outside_boston", "online"] as const satisfies readonly OpportunityArea[];
const FORMATS = ["in_person", "online", "hybrid"] as const satisfies readonly OpportunityFormat[];

/* ---------- Eligibility ---------- */

const shortList = (what: string, max: number) =>
  z.array(z.string()).max(max).describe(`${what}. At most ${max} entries, each 12 words or fewer.`);

export const EligibilityOutputSchema = z.object({
  verdict: z.enum(VERDICTS),
  confidence: z.enum(CONFIDENCES),
  reasons: shortList("Stated requirements the profile meets, or points that support the verdict", 5),
  blockers: shortList("Stated requirements the profile clearly does not meet", 5),
  unknowns: shortList("Requirements or facts the profile cannot settle", 5),
  next_steps: shortList("What the student should do this week", 3),
  fit_score: z.number().int().min(1).max(5).describe("1-5: how well this serves the student's stated goals."),
  fit_note: z.string().max(400).describe("40 words or fewer, concrete."),
});
export type EligibilityOutput = z.infer<typeof EligibilityOutputSchema>;

/* ---------- Import ---------- */

const optText = (hint: string) => z.string().nullable().describe(`${hint} Null when the page does not say.`);
const optDate = (hint: string) => z.string().nullable().describe(`${hint} As YYYY-MM-DD. Null when the page does not say.`);

/** What the model returns for an imported page (url and kind are filled in by the server). */
export const OpportunityExtractionSchema = z.object({
  title: optText("The opportunity's name as the page gives it."),
  organizer: optText("The company or organization running it."),
  organizer_url: optText("The organizer's own website (https://...), only if the page links or names it."),
  organizer_blurb: optText("One sentence on who the organizer is, from the page."),
  posting_site: optText("The job board or event platform the page is on, only if the page names one."),
  summary: optText("One plain sentence: what it is and who it is for."),
  description: optText("Plain-words description, 1200 characters or fewer."),
  area: z.enum(AREAS).nullable().describe("suffolk = on Suffolk University's campus; boston = in Boston/Cambridge; outside_boston = anywhere else in person; online = fully online. Null when unknown."),
  format: z.enum(FORMATS).nullable().describe("Null when unknown."),
  location: optText("Venue or city as the page states it."),
  starts_on: optDate("Start date."),
  ends_on: optDate("End date."),
  deadline_on: optDate("Application or registration deadline."),
  dates_note: optText("Short note on dates the fields above cannot hold (e.g. 'Rolling admissions')."),
  internship_terms: z.array(z.enum(TERMS)).describe("Internship terms the page states. Empty unless the kind is internship."),
  pay: optText("Pay or stipend as stated."),
  eligibility: optText("Who can apply, as the page states it (year, major, location, work authorization)."),
  tags: z.array(z.string()).max(8).describe("Up to 8 short lowercase topic tags (e.g. 'ml', 'ieee', 'web')."),
  confidence_notes: z.array(z.string()).max(8).describe("Anything guessed or missing, e.g. 'No deadline on the page', 'Pay not stated'."),
});
export type OpportunityExtraction = z.infer<typeof OpportunityExtractionSchema>;

const isoDate = z.iso.date();

/** The draft handed to the edit form (JSON in FormState.data.draft). Absent keys = not found on the page. */
export const OpportunityDraftSchema = z.object({
  url: z.url({ protocol: /^https?$/ }),
  kind: z.enum(KIND_VALUES),
  confidence_notes: z.array(z.string()),
  title: z.string().optional(),
  organizer: z.string().optional(),
  organizer_url: z.url({ protocol: /^https?$/ }).nullable().optional(),
  organizer_blurb: z.string().nullable().optional(),
  posting_site: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  description: z.string().max(1200).nullable().optional(),
  area: z.enum(AREAS).optional(),
  format: z.enum(FORMATS).optional(),
  location: z.string().nullable().optional(),
  starts_on: isoDate.nullable().optional(),
  ends_on: isoDate.nullable().optional(),
  deadline_on: isoDate.nullable().optional(),
  dates_note: z.string().nullable().optional(),
  internship_terms: z.array(z.enum(TERMS)).optional(),
  job_type: z.enum(JOB_TYPES).optional(),
  pay: z.string().nullable().optional(),
  eligibility: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

export type OpportunityDraft = Partial<
  Pick<
    Opportunity,
    | "title"
    | "organizer"
    | "organizer_url"
    | "organizer_blurb"
    | "posting_site"
    | "summary"
    | "description"
    | "area"
    | "format"
    | "location"
    | "starts_on"
    | "ends_on"
    | "deadline_on"
    | "dates_note"
    | "internship_terms"
    | "job_type"
    | "pay"
    | "eligibility"
    | "tags"
  >
> & { url: string; kind: OpportunityKind; confidence_notes: string[] };

/** Parse FormState.data.draft back into a draft (null when missing or malformed).
 *  Returning the zod output as OpportunityDraft also checks the two agree at compile time. */
export function parseOpportunityDraft(json: string | undefined | null): OpportunityDraft | null {
  if (!json) return null;
  try {
    const parsed = OpportunityDraftSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
