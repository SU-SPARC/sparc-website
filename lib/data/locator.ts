/* Locator: pure helpers shared by the server and client components.
 * No "server-only" here; client components import this module directly
 * (lib/data/index.ts is server-only). See docs/LOCATOR.md.
 *
 * The date words, the §13 date states and the list sections live in their
 * own files and are re-exported here, so callers import from this module
 * only. */

import { formatDateOnly, isoDateOnly } from "./dates";
import { dateStatus, deadlineStatus } from "./locator-dates";
import { isPastListing } from "./locator-state";
import { placeOf } from "./places";
import type {
  DateOnly,
  EligibilityVerdict,
  InterestStatus,
  InternshipTerm,
  JobType,
  Opportunity,
  OpportunityArea,
  OpportunityFormat,
  OpportunityKind,
  WorkAuth,
} from "./types";

export * from "./locator-dates";
export * from "./locator-sections";
export * from "./locator-state";

export const KINDS: readonly OpportunityKind[] = ["internship", "conference", "networking", "hackathon"];

export type KindSlug = "internships" | "conferences" | "networking" | "hackathons";

/** One FilterChip: its filter key and label. */
export type FilterOption = { key: string; label: string; editorOnly?: boolean };

export type KindConfig = {
  kind: OpportunityKind;
  slug: KindSlug;
  /** "Internships" */
  label: string;
  /** "internship" → "New internship", "Delete internship" */
  noun: string;
  /** "internships" */
  plural: string;
  /** one line for the empty state */
  purpose: string;
  /** false for internships (sorted by deadline); true for the event kinds (grouped by month) */
  dated: boolean;
  /** the kind's own FilterChips, after All / Published / Hidden / Closed.
   *  `editorOnly` chips (Unreviewed) never reach the members' list. Where a
   *  listing is goes in the list's own "Place" row (lib/data/places.ts). */
  filters: FilterOption[];
  /** internships only: the "Type" chip row under the search box (after its own All) */
  typeFilters?: FilterOption[];
  /** internships only: the "Term" chip row under the Type row (after its own All) */
  termFilters?: FilterOption[];
  /** internships only: a muted line under the list's h1 */
  subtitle?: string;
};

export const AREA_LABELS: Record<OpportunityArea, string> = {
  suffolk: "Suffolk",
  boston: "Boston",
  outside_boston: "Outside Boston",
  online: "Online",
};

export const FORMAT_LABELS: Record<OpportunityFormat, string> = {
  in_person: "In person",
  online: "Online",
  hybrid: "Hybrid",
};

export const JOB_TYPES: readonly JobType[] = ["internship", "coop", "new_grad"];

export const JOB_TYPE_LABELS: Record<JobType, string> = {
  internship: "Internship",
  coop: "Co-op",
  new_grad: "New grad",
};

/** The terms the Term chips, the form and the row pills show, in this order.
 *  The old 'coop' term is not one of them: co-ops are a job type now
 *  (docs/DESIGN-BRIEF.md §17). */
export const TERM_ORDER: readonly InternshipTerm[] = ["summer", "fall", "spring", "winter", "semester_part_time"];

export const TERM_LABELS: Record<InternshipTerm, string> = {
  summer: "Summer",
  fall: "Fall",
  spring: "Spring",
  winter: "Winter",
  semester_part_time: "Part-time",
  coop: "Co-op",
};

/** The filter key for a job type: "type:coop". Prefixed so it never clashes with the 'coop' term. */
export function jobTypeKey(type: JobType): string {
  return `type:${type}`;
}

/** An internship row's pills: the job type when it is not a plain internship
 *  ("Co-op", "New grad"), then its terms in TERM_ORDER ("Summer", "Fall"). */
export function jobPillLabels(o: Pick<Opportunity, "job_type" | "internship_terms">): string[] {
  const labels = o.job_type === "internship" ? [] : [JOB_TYPE_LABELS[o.job_type]];
  for (const term of TERM_ORDER) {
    if (o.internship_terms.includes(term)) labels.push(TERM_LABELS[term]);
  }
  return labels;
}

export const VERDICT_LABELS: Record<EligibilityVerdict, string> = {
  eligible: "Eligible",
  likely: "Likely eligible",
  unclear: "Unclear",
  not_eligible: "Not eligible",
};

export const WORK_AUTH_LABELS: Record<WorkAuth, string> = {
  us_citizen_or_pr: "US citizen or permanent resident",
  needs_sponsorship: "Will need visa sponsorship",
  international_cpt_opt: "International student (CPT / OPT)",
  prefer_not_to_say: "Prefer not to say",
};

/** The pill word for a member's interest ("Enrolling" reads better beside a name than "Enrolled"). */
export const INTEREST_LABELS: Record<InterestStatus, string> = {
  interested: "Interested",
  enrolled: "Enrolling",
};

const UNREVIEWED_CHIP = { key: "unreviewed", label: "Unreviewed", editorOnly: true };

/** The editors' Closed chip; the list puts it right after Hidden. */
export const CLOSED_CHIP = { key: "closed", label: "Closed" };

const SOURCE_LABELS: Record<Opportunity["source"], string> = {
  seed: "Research",
  import: "Import",
  manual: "Manual",
  sync: "Sync",
};

/** "Greenhouse", "Research (16 Oct 2026)", …; falls back on the source kind. */
export function sourceLabel(o: Pick<Opportunity, "source" | "source_name">): string {
  return o.source_name ?? SOURCE_LABELS[o.source];
}

/** A sync row no editor has looked at yet (and still open). */
export function isUnreviewed(o: Pick<Opportunity, "source" | "reviewed_at" | "closed_at">): boolean {
  return o.source === "sync" && !o.reviewed_at && !o.closed_at;
}

/** "Oct 20, 2026": the club-zone calendar date of `closed_at`, or null. */
export function closedOnLabel(o: Pick<Opportunity, "closed_at">): string | null {
  return o.closed_at ? formatDateOnly(isoDateOnly(new Date(o.closed_at))) : null;
}

export const KIND_CONFIG: Record<OpportunityKind, KindConfig> = {
  internship: {
    kind: "internship",
    slug: "internships",
    label: "Internships",
    noun: "internship",
    plural: "internships",
    purpose: "Internships, co-ops and new-grad roles for members, by type, term and deadline.",
    dated: false,
    filters: [
      { key: "closing_soon", label: "Closing soon" },
      { key: "deadline_passed", label: "Deadline passed" },
      UNREVIEWED_CHIP,
    ],
    typeFilters: JOB_TYPES.map((type) => ({ key: jobTypeKey(type), label: JOB_TYPE_LABELS[type] })),
    termFilters: TERM_ORDER.map((term) => ({ key: term, label: TERM_LABELS[term] })),
    subtitle: "Internships, co-ops and new-grad roles",
  },
  conference: {
    kind: "conference",
    slug: "conferences",
    label: "Conferences",
    noun: "conference",
    plural: "conferences",
    purpose: "Tech and research conferences worth attending or submitting to.",
    dated: true,
    filters: [
      { key: "upcoming", label: "Upcoming" },
      { key: "past", label: "Past" },
      { key: "ieee", label: "IEEE" },
      UNREVIEWED_CHIP,
    ],
  },
  networking: {
    kind: "networking",
    slug: "networking",
    label: "Networking",
    noun: "networking event",
    plural: "networking events",
    purpose: "Networking events at Suffolk, around Boston and online.",
    dated: true,
    filters: [
      { key: "upcoming", label: "Upcoming" },
      { key: "past", label: "Past" },
      UNREVIEWED_CHIP,
    ],
  },
  hackathon: {
    kind: "hackathon",
    slug: "hackathons",
    label: "Hackathons",
    noun: "hackathon",
    plural: "hackathons",
    purpose: "University hackathons in Greater Boston and online ones.",
    dated: true,
    filters: [
      { key: "upcoming", label: "Upcoming" },
      { key: "past", label: "Past" },
      UNREVIEWED_CHIP,
    ],
  },
};

const BY_SLUG = new Map<string, OpportunityKind>(KINDS.map((k) => [KIND_CONFIG[k].slug, k]));

export function kindFromSlug(slug: string): OpportunityKind | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Whose screens: the editors' /admin/locator or the members' read-only
 *  /dashboard/locator (docs/LOCATOR.md, "Members view"). */
export type LocatorMode = "admin" | "member";

const LOCATOR_BASE: Record<LocatorMode, string> = { admin: "/admin/locator", member: "/dashboard/locator" };

/** "/admin/locator/internships", or "/dashboard/locator/internships" for members. */
export function kindPath(kind: OpportunityKind, mode: LocatorMode = "admin"): string {
  return `${LOCATOR_BASE[mode]}/${KIND_CONFIG[kind].slug}`;
}

/** "/admin/locator/profile", or "/dashboard/locator/profile" for members. */
export function profilePath(mode: LocatorMode = "admin"): string {
  return `${LOCATOR_BASE[mode]}/profile`;
}

const SITE_BY_HOST: [RegExp, string][] = [
  [/(^|\.)linkedin\.com$/, "LinkedIn"],
  [/(^|\.)joinhandshake\.com$/, "Handshake"],
  [/(^|\.)indeed\.com$/, "Indeed"],
  [/(^|\.)greenhouse\.io$/, "Greenhouse"],
  [/(^|\.)lever\.co$/, "Lever"],
  [/(^|\.)myworkdayjobs\.com$|(^|\.)workday\.com$/, "Workday"],
  [/(^|\.)devpost\.com$/, "Devpost"],
  [/(^|\.)mlh\.(io|com)$/, "MLH"],
  [/(^|\.)lu\.ma$|(^|\.)luma\.com$/, "Luma"],
  [/(^|\.)eventbrite\.[a-z.]+$/, "Eventbrite"],
  [/(^|\.)meetup\.com$/, "Meetup"],
  [/(^|\.)ieee\.org$/, "IEEE"],
];

/** Posting URL → a site name ('LinkedIn', 'Devpost', …), else the host without www. */
export function postingSiteFromUrl(url: string): string | null {
  let host: string;
  try {
    host = new URL(url.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (!host) return null;
  for (const [re, name] of SITE_BY_HOST) if (re.test(host)) return name;
  return host.replace(/^www\./, "");
}

/** "3 interested"; null for none. Counts interested and enrolled alike. */
export function interestLabel(n: number): string | null {
  return n > 0 ? `${n} interested` : null;
}

/** The timing chip a row matches. Event kinds: 'past' (Closed or Ended) or
 *  'upcoming' (upcoming or under way). Internships: 'deadline_passed'
 *  (Closed or past the deadline) or 'closing_soon'. A past row gets only
 *  its past key, so the chip shows exactly the collapsed section. */
function timingKeys(o: Opportunity, today: DateOnly): string[] {
  const past = isPastListing(o, today);
  if (o.kind === "internship") {
    if (past) return ["deadline_passed"];
    return deadlineStatus(o.deadline_on, today) === "closing_soon" ? ["closing_soon"] : [];
  }
  if (past) return ["past"];
  return dateStatus(o, today) === "undated" ? [] : ["upcoming"];
}

/** Every filter key the row matches: its terms, its job type ('type:coop',
 *  internships only), its place ('place:boston', lib/data/places.ts), its timing key (above), 'ieee' when tagged,
 *  'unreviewed' (open sync rows nobody has reviewed) and 'closed'. */
export function rowFilterKeys(o: Opportunity, today: DateOnly): string[] {
  const keys = new Set<string>(o.internship_terms);
  if (o.kind === "internship") keys.add(jobTypeKey(o.job_type));
  keys.add(`place:${placeOf(o)}`);
  for (const key of timingKeys(o, today)) keys.add(key);
  if (o.tags.includes("ieee")) keys.add("ieee");
  if (isUnreviewed(o)) keys.add("unreviewed");
  if (o.closed_at) keys.add("closed");
  return [...keys];
}

/* Outbound searches. Each URL shape was checked with a GET in October 2026.
 * Handshake is login-gated and IEEE's search has no stable query URL, so both
 * link to their base page. Indeed blocks scripted requests (403) but the
 * query URL is its public search page. */
const enc = encodeURIComponent;
const ELSEWHERE = {
  handshake: () => ({ label: "Handshake", href: "https://suffolk.joinhandshake.com/" }),
  linkedin: (q: string) => ({
    label: "LinkedIn Jobs",
    href: `https://www.linkedin.com/jobs/search/?keywords=${enc(q ? `${q} intern` : "intern")}&location=Boston%2C%20Massachusetts`,
  }),
  indeed: (q: string) => ({
    label: "Indeed",
    href: `https://www.indeed.com/jobs?q=${enc(q ? `${q} intern` : "intern").replace(/%20/g, "+")}&l=Boston%2C+MA`,
  }),
  ieee: () => ({ label: "IEEE conference search", href: "https://conferences.ieee.org/conferences_events/" }),
  luma: () => ({ label: "Luma Boston", href: "https://luma.com/boston" }),
  eventbrite: (q: string) => ({
    label: "Eventbrite Boston",
    href: q
      ? `https://www.eventbrite.com/d/ma--boston/${enc(q)}/`
      : "https://www.eventbrite.com/d/ma--boston/events/",
  }),
  meetup: (q: string) => ({
    label: "Meetup",
    href: `https://www.meetup.com/find/?${q ? `keywords=${enc(q)}&` : ""}location=us--ma--Boston`,
  }),
  devpost: (q: string) => ({
    label: "Devpost",
    href: q ? `https://devpost.com/hackathons?search=${enc(q)}` : "https://devpost.com/hackathons",
  }),
  mlh: () => ({ label: "MLH", href: "https://www.mlh.com/seasons/2027/events" }),
};

/** "Search elsewhere" links for a list screen, carrying the current query. */
export function searchElsewhere(kind: OpportunityKind, query: string): { label: string; href: string }[] {
  const q = query.trim().replace(/\s+/g, " ");
  switch (kind) {
    case "internship":
      return [ELSEWHERE.handshake(), ELSEWHERE.linkedin(q), ELSEWHERE.indeed(q)];
    case "conference":
      return [ELSEWHERE.ieee(), ELSEWHERE.luma(), ELSEWHERE.eventbrite(q)];
    case "networking":
      return [ELSEWHERE.luma(), ELSEWHERE.meetup(q), ELSEWHERE.eventbrite(q)];
    case "hackathon":
      return [ELSEWHERE.devpost(q), ELSEWHERE.mlh(), ELSEWHERE.luma()];
  }
}

/** True for hackathons and networking events held in person somewhere other than
 *  Greater Boston (docs/DESIGN-BRIEF.md §18): they get the red "Outside Boston" word. */
export function isOutsideBoston(o: Pick<Opportunity, "kind" | "area">): boolean {
  return (o.kind === "hackathon" || o.kind === "networking") && o.area === "outside_boston";
}
