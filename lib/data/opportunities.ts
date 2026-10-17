/* Locator reads (server only). Session client, so RLS decides: editors see
 * hidden rows, and the embedded eligibility check is the caller's own. */

import "server-only";

import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { KINDS } from "./locator";
import type { CareerProfile, EligibilityCheck, Opportunity, OpportunityKind } from "./types";

export type OpportunityWithCheck = Opportunity & { check: EligibilityCheck | null };

type OpportunityRow = Tables<"opportunities">;
type CheckRow = Tables<"eligibility_checks">;
type OpportunityRowWithCheck = OpportunityRow & { check: CheckRow[] | CheckRow | null };

export function toOpportunity(row: OpportunityRow): Opportunity {
  return {
    id: row.id,
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    organizer: row.organizer,
    organizer_url: row.organizer_url,
    organizer_blurb: row.organizer_blurb,
    url: row.url,
    posting_site: row.posting_site,
    summary: row.summary,
    description: row.description,
    area: row.area,
    format: row.format,
    location: row.location,
    starts_on: row.starts_on,
    ends_on: row.ends_on,
    deadline_on: row.deadline_on,
    dates_note: row.dates_note,
    internship_terms: row.internship_terms ?? [],
    pay: row.pay,
    eligibility: row.eligibility,
    tags: row.tags ?? [],
    source: row.source as Opportunity["source"],
    verified_on: row.verified_on,
    published: row.published,
    created_at: row.created_at,
    updated_at: row.updated_at,
    source_name: row.source_name,
    source_url: row.source_url,
    external_id: row.external_id,
    posted_at: row.posted_at,
    first_seen_at: row.first_seen_at,
    last_seen_at: row.last_seen_at,
    closed_at: row.closed_at,
    reviewed_at: row.reviewed_at,
    editor_edited_at: row.editor_edited_at,
  };
}

export function toEligibilityCheck(row: CheckRow): EligibilityCheck {
  return {
    opportunity_id: row.opportunity_id,
    profile_id: row.profile_id,
    verdict: row.verdict,
    confidence: row.confidence as EligibilityCheck["confidence"],
    reasons: row.reasons ?? [],
    blockers: row.blockers ?? [],
    unknowns: row.unknowns ?? [],
    next_steps: row.next_steps ?? [],
    fit_score: row.fit_score,
    fit_note: row.fit_note,
    model: row.model,
    inputs_hash: row.inputs_hash,
    checked_at: row.checked_at,
  };
}

export function toCareerProfile(row: Tables<"career_profiles">): CareerProfile {
  return {
    profile_id: row.profile_id,
    major: row.major,
    minor: row.minor,
    degree_level: row.degree_level as CareerProfile["degree_level"],
    expected_grad_year: row.expected_grad_year,
    skills: row.skills ?? [],
    interests: row.interests ?? [],
    goals: row.goals,
    constraints: row.constraints,
    work_auth: row.work_auth as CareerProfile["work_auth"],
    updated_at: row.updated_at,
  };
}

function withCheck(row: OpportunityRowWithCheck, uid: string | null): OpportunityWithCheck {
  const { check, ...rest } = row;
  const rows = Array.isArray(check) ? check : check ? [check] : [];
  const own = rows.find((c) => c.profile_id === uid) ?? null;
  return { ...toOpportunity(rest), check: own ? toEligibilityCheck(own) : null };
}

const SELECT = "*, check:eligibility_checks(*)";

async function session() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, uid: user?.id ?? null };
}

/** `publishedOnly`: the members' view. RLS already hides unpublished rows
 *  from members; the flag keeps an editor's /dashboard/locator identical to
 *  what members see. */
export type ReadOptions = { publishedOnly?: boolean };

/** One kind's rows. Internships: deadline_on asc nulls last; dated kinds:
 *  starts_on asc nulls last; then created_at desc. */
export async function listOpportunities(
  kind: OpportunityKind,
  { publishedOnly = false }: ReadOptions = {},
): Promise<OpportunityWithCheck[]> {
  const { supabase, uid } = await session();
  const dateCol = kind === "internship" ? "deadline_on" : "starts_on";
  let q = supabase.from("opportunities").select(SELECT).eq("kind", kind);
  if (publishedOnly) q = q.eq("published", true);
  const { data, error } = await q
    .order(dateCol, { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .order("id");
  if (error) throw new Error(`listOpportunities: ${error.message}`);
  return (data as unknown as OpportunityRowWithCheck[]).map((r) => withCheck(r, uid));
}

export async function getOpportunity(
  id: string,
  { publishedOnly = false }: ReadOptions = {},
): Promise<OpportunityWithCheck | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { supabase, uid } = await session();
  let q = supabase.from("opportunities").select(SELECT).eq("id", id);
  if (publishedOnly) q = q.eq("published", true);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`getOpportunity: ${error.message}`);
  return data ? withCheck(data as unknown as OpportunityRowWithCheck, uid) : null;
}

/** The caller's own Locator profile, or null (signed out or not filled in). */
export async function getCareerProfile(): Promise<CareerProfile | null> {
  const { supabase, uid } = await session();
  if (!uid) return null;
  const { data, error } = await supabase.from("career_profiles").select("*").eq("profile_id", uid).maybeSingle();
  if (error) throw new Error(`getCareerProfile: ${error.message}`);
  return data ? toCareerProfile(data) : null;
}

/** Per kind: rows the caller can see, and how many of them are hidden. */
export async function countOpportunities(): Promise<Record<OpportunityKind, { total: number; hidden: number }>> {
  const supabase = await createClient();
  const pairs = await Promise.all(
    KINDS.map(async (kind) => {
      const [total, hidden] = await Promise.all([
        supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("kind", kind),
        supabase
          .from("opportunities")
          .select("id", { count: "exact", head: true })
          .eq("kind", kind)
          .eq("published", false),
      ]);
      if (total.error) throw new Error(`countOpportunities: ${total.error.message}`);
      if (hidden.error) throw new Error(`countOpportunities: ${hidden.error.message}`);
      return [kind, { total: total.count ?? 0, hidden: hidden.count ?? 0 }] as const;
    }),
  );
  return Object.fromEntries(pairs) as Record<OpportunityKind, { total: number; hidden: number }>;
}
