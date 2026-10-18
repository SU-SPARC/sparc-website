/* Locator reads (server only). Session client, so RLS decides: editors see
 * hidden rows, and the embedded eligibility check is the caller's own.
 * Interest rows (0005) are readable by every signed-in user, so the count
 * and getInterest() show the whole club. */

import "server-only";

import type { Tables } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

import { KINDS } from "./locator";
import type {
  CareerProfile,
  EligibilityCheck,
  InterestedMember,
  InterestStatus,
  Opportunity,
  OpportunityInterest,
  OpportunityKind,
} from "./types";

export type OpportunityWithCheck = Opportunity & {
  check: EligibilityCheck | null;
  /** members who marked the listing interested or enrolled (0 when signed out) */
  interest_count: number;
};

type OpportunityRow = Tables<"opportunities">;
type CheckRow = Tables<"eligibility_checks">;
type CountEmbed = { count: number }[] | { count: number } | null;
type OpportunityRowWithCheck = OpportunityRow & { check: CheckRow[] | CheckRow | null; interest?: CountEmbed };

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
    opens_on: row.opens_on,
    team_size: row.team_size,
    prizes: row.prizes,
    provided: row.provided,
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

function countOf(embed: CountEmbed | undefined): number {
  const first = Array.isArray(embed) ? embed[0] : embed;
  return first?.count ?? 0;
}

function withCheck(row: OpportunityRowWithCheck, uid: string | null): OpportunityWithCheck {
  const { check, interest, ...rest } = row;
  const rows = Array.isArray(check) ? check : check ? [check] : [];
  const own = rows.find((c) => c.profile_id === uid) ?? null;
  return { ...toOpportunity(rest), check: own ? toEligibilityCheck(own) : null, interest_count: countOf(interest) };
}

/** anon has no grant on opportunity_interest, so the count is embedded only
 *  for a signed-in caller. */
const selectFor = (uid: string | null) =>
  uid ? "*, check:eligibility_checks(*), interest:opportunity_interest(count)" : "*, check:eligibility_checks(*)";

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
  let q = supabase.from("opportunities").select(selectFor(uid)).eq("kind", kind);
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
  let q = supabase.from("opportunities").select(selectFor(uid)).eq("id", id);
  if (publishedOnly) q = q.eq("published", true);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(`getOpportunity: ${error.message}`);
  return data ? withCheck(data as unknown as OpportunityRowWithCheck, uid) : null;
}

type InterestRow = Pick<Tables<"opportunity_interest">, "opportunity_id" | "profile_id" | "status" | "note" | "updated_at"> & {
  person: { display_name: string | null; member_id: string | null } | { display_name: string | null; member_id: string | null }[] | null;
};

const STATUS_ORDER: Record<InterestStatus, number> = { enrolled: 0, interested: 1 };

/** Everyone's interest in one listing, and the caller's own row. Names come
 *  from the `people` view (display name, else the linked member card's
 *  name); no emails. Enrolled first, then most recently updated. Signed
 *  out: nothing. */
export async function getInterest(
  opportunityId: string,
): Promise<{ mine: OpportunityInterest | null; members: InterestedMember[] }> {
  const empty = { mine: null, members: [] };
  if (!/^[0-9a-f-]{36}$/i.test(opportunityId)) return empty;
  const { supabase, uid } = await session();
  if (!uid) return empty;
  const { data, error } = await supabase
    .from("opportunity_interest")
    .select("opportunity_id, profile_id, status, note, updated_at, person:people(display_name, member_id)")
    .eq("opportunity_id", opportunityId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`getInterest: ${error.message}`);
  const rows = (data ?? []) as unknown as InterestRow[];
  const person = (r: InterestRow) => (Array.isArray(r.person) ? r.person[0] : r.person) ?? null;

  // Accounts without a display name fall back on their member card's name.
  const memberIds = [
    ...new Set(
      rows.flatMap((r) => {
        const p = person(r);
        return p && !p.display_name?.trim() && p.member_id ? [p.member_id] : [];
      }),
    ),
  ];
  const cardNames = new Map<string, string>();
  if (memberIds.length) {
    const { data: cards } = await supabase.from("members").select("id, name").in("id", memberIds);
    for (const c of cards ?? []) cardNames.set(c.id, c.name);
  }

  const members: InterestedMember[] = rows
    .map((r) => {
      const p = person(r);
      const name = p?.display_name?.trim() || (p?.member_id ? cardNames.get(p.member_id) : undefined) || "A member";
      return {
        profile_id: r.profile_id,
        display_name: name,
        status: r.status as InterestStatus,
        note: r.note,
        updated_at: r.updated_at,
      };
    })
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.updated_at.localeCompare(a.updated_at));
  const own = rows.find((r) => r.profile_id === uid);
  const mine: OpportunityInterest | null = own
    ? {
        opportunity_id: own.opportunity_id,
        profile_id: own.profile_id,
        status: own.status as InterestStatus,
        note: own.note,
        updated_at: own.updated_at,
      }
    : null;
  return { mine, members };
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
