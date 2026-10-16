/* Locator: pure helpers shared by the server and client components.
 * No "server-only" here; client components import this module directly
 * (lib/data/index.ts is server-only). See docs/LOCATOR.md. */

import { formatDateOnly, parseDateOnly } from "./dates";
import type {
  DateOnly,
  EligibilityVerdict,
  InternshipTerm,
  Opportunity,
  OpportunityArea,
  OpportunityFormat,
  OpportunityKind,
  WorkAuth,
} from "./types";

export const KINDS: readonly OpportunityKind[] = ["internship", "conference", "networking", "hackathon"];

export type KindSlug = "internships" | "conferences" | "networking" | "hackathons";

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
  /** the kind's own FilterChips, after All / Published / Hidden */
  filters: { key: string; label: string }[];
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

export const TERM_LABELS: Record<InternshipTerm, string> = {
  coop: "Co-op",
  semester_part_time: "Semester part-time",
  summer: "Summer",
  winter: "Winter",
};

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

export const KIND_CONFIG: Record<OpportunityKind, KindConfig> = {
  internship: {
    kind: "internship",
    slug: "internships",
    label: "Internships",
    noun: "internship",
    plural: "internships",
    purpose: "Internship and co-op postings for members, by term and deadline.",
    dated: false,
    filters: [
      { key: "coop", label: TERM_LABELS.coop },
      { key: "semester_part_time", label: TERM_LABELS.semester_part_time },
      { key: "summer", label: TERM_LABELS.summer },
      { key: "winter", label: TERM_LABELS.winter },
      { key: "closing_soon", label: "Closing soon" },
    ],
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
      { key: "boston", label: AREA_LABELS.boston },
      { key: "online", label: AREA_LABELS.online },
      { key: "ieee", label: "IEEE" },
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
      { key: "suffolk", label: AREA_LABELS.suffolk },
      { key: "boston", label: AREA_LABELS.boston },
      { key: "outside_boston", label: AREA_LABELS.outside_boston },
      { key: "online", label: AREA_LABELS.online },
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
      { key: "boston", label: AREA_LABELS.boston },
      { key: "outside_boston", label: AREA_LABELS.outside_boston },
      { key: "online", label: AREA_LABELS.online },
    ],
  },
};

const BY_SLUG = new Map<string, OpportunityKind>(KINDS.map((k) => [KIND_CONFIG[k].slug, k]));

export function kindFromSlug(slug: string): OpportunityKind | null {
  return BY_SLUG.get(slug) ?? null;
}

/** "/admin/locator/internships" */
export function kindPath(kind: OpportunityKind): string {
  return `/admin/locator/${KIND_CONFIG[kind].slug}`;
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

/** Whole days from `a` to `b` (both date-only), with no zone arithmetic. */
function daysBetween(a: DateOnly, b: DateOnly): number {
  const pa = parseDateOnly(a);
  const pb = parseDateOnly(b);
  return Math.round(
    (Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86_400_000,
  );
}

const CLOSING_SOON_DAYS = 14;

/** closing_soon = the deadline is today or within the next 14 days. */
export function deadlineStatus(
  deadline_on: DateOnly | null,
  today: DateOnly,
): "none" | "open" | "closing_soon" | "closed" {
  if (!deadline_on) return "none";
  const left = daysBetween(today, deadline_on);
  if (left < 0) return "closed";
  if (left <= CLOSING_SOON_DAYS) return "closing_soon";
  return "open";
}

/** YYYY-MM-DD strings compare correctly as strings. */
export function dateStatus(
  o: { starts_on: DateOnly | null; ends_on: DateOnly | null },
  today: DateOnly,
): "undated" | "upcoming" | "ongoing" | "past" {
  if (!o.starts_on) return "undated";
  const end = o.ends_on ?? o.starts_on;
  if (end < today) return "past";
  if (o.starts_on > today) return "upcoming";
  return "ongoing";
}

/** "Oct 3–4, 2026", "Oct 3, 2026", "Oct 30 – Nov 1, 2026", "Dec 30, 2026 – Jan 2, 2027". */
export function formatDateRange(starts_on: DateOnly | null, ends_on: DateOnly | null): string | null {
  const start = starts_on ?? ends_on;
  if (!start) return null;
  const end = starts_on && ends_on ? ends_on : null;
  if (!end || end === start) return formatDateOnly(start);
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  if (s.year !== e.year) return `${formatDateOnly(start)} – ${formatDateOnly(end)}`;
  const md = (v: DateOnly) => formatDateOnly(v, { month: "short", day: "numeric" });
  if (s.month === e.month) return `${md(start)}–${e.day}, ${e.year}`;
  return `${md(start)} – ${md(end)}, ${e.year}`;
}

/** "2026-10" */
export function monthKey(d: DateOnly): string {
  return d.slice(0, 7);
}

/** "2026-10" → "October 2026" */
export function monthLabel(key: string): string {
  return formatDateOnly(`${key}-01`, { month: "long", year: "numeric" });
}

/** Every filter key the row matches: its terms, its area, 'upcoming' | 'past',
 *  'closing_soon', and 'ieee' when tagged. ('ongoing' counts as upcoming.) */
export function rowFilterKeys(o: Opportunity, today: DateOnly): string[] {
  const keys = new Set<string>(o.internship_terms);
  keys.add(o.area);
  const ds = dateStatus(o, today);
  if (ds === "upcoming" || ds === "ongoing") keys.add("upcoming");
  if (ds === "past") keys.add("past");
  if (deadlineStatus(o.deadline_on, today) === "closing_soon") keys.add("closing_soon");
  if (o.tags.includes("ieee")) keys.add("ieee");
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
