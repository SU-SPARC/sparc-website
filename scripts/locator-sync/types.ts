/* Locator sync: shared types and the sources.json schema. See docs/LOCATOR-SYNC.md. */

import { z } from "zod";

import type {
  DateOnly,
  InternshipTerm,
  OpportunityArea,
  OpportunityFormat,
  OpportunityKind,
} from "../../lib/data/types";

/** One normalised listing, ready to write into `opportunities`. */
export type SyncItem = {
  /** stable id at the source, e.g. `greenhouse:formlabs:8148283` */
  external_id: string;
  /** "Greenhouse", "Lever", "Ashby", "Workday", "SimplifyJobs", "Devpost", "MLH", "Meetup" */
  source_name: string;
  /** the API or feed URL the item was read from */
  source_url: string;
  kind: OpportunityKind;
  title: string;
  organizer: string;
  organizer_url: string | null;
  /** the human posting / event page */
  url: string;
  posting_site: string | null;
  summary: string | null;
  /** plain text, ≤ 6000 characters */
  description: string | null;
  area: OpportunityArea;
  format: OpportunityFormat;
  location: string | null;
  starts_on: DateOnly | null;
  ends_on: DateOnly | null;
  deadline_on: DateOnly | null;
  dates_note: string | null;
  internship_terms: InternshipTerm[];
  pay: string | null;
  eligibility: string | null;
  tags: string[];
  /** ISO instant */
  posted_at: string | null;
};

// ── sources.json ─────────────────────────────────────────────────────────

const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "id: lowercase letters, numbers, hyphens" });
const url = z.url({ protocol: /^https?$/ });
const tag = z.string().regex(/^[a-z0-9][a-z0-9 .+#-]*$/, { error: "tags must be lowercase" });

const base = {
  id,
  /** false keeps the source in the file without running it (see `note`) */
  enabled: z.boolean().default(true),
  note: z.string().optional(),
  tags: z.array(tag).default([]),
  /** "local" boards run first and are what the list is for; "national" boards only add MA/remote roles */
  priority: z.enum(["local", "national"]).default("local"),
};
const company = {
  /** display name, written to `organizer` */
  company: z.string().trim().min(1),
  careers_url: url.optional(),
  /** a location that always counts as local for this employer, e.g. "Somerville, MA" */
  office: z.string().trim().min(1).optional(),
};

export const GreenhouseSource = z.object({ ...base, ...company, adapter: z.literal("greenhouse"), token: z.string().min(1) }).strict();
export const LeverSource = z.object({ ...base, ...company, adapter: z.literal("lever"), account: z.string().min(1) }).strict();
export const AshbySource = z.object({ ...base, ...company, adapter: z.literal("ashby"), board: z.string().min(1) }).strict();
export const WorkdaySource = z
  .object({
    ...base,
    ...company,
    adapter: z.literal("workday"),
    tenant: z.string().regex(/^[a-z0-9-]+$/i),
    host: z.string().regex(/^wd\d+$/),
    /** one or more career sites of the tenant; a posting on two sites is kept once */
    sites: z.array(z.string().regex(/^[\w-]+$/)).min(1),
    /** Workday's search is fuzzy ("intern" also finds "International"); titles are filtered afterwards */
    searches: z.array(z.string().min(1)).default(["intern", "co-op"]),
  })
  .strict();
export const SimplifySource = z
  .object({
    ...base,
    adapter: z.literal("simplify"),
    repo: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
    branch: z.string().default("dev"),
    path: z.string().default(".github/scripts/listings.json"),
  })
  .strict();
export const DevpostSource = z
  .object({ ...base, adapter: z.literal("devpost"), pages: z.number().int().min(1).max(10).default(3) })
  .strict();
export const MlhSource = z
  .object({ ...base, adapter: z.literal("mlh"), season: z.string().regex(/^\d{4}$/) })
  .strict();
export const MeetupIcalSource = z
  .object({
    ...base,
    adapter: z.literal("meetup_ical"),
    group: z.string().regex(/^[\w-]+$/),
    name: z.string().trim().min(1),
    area: z.enum(["suffolk", "boston", "outside_boston", "online"]).default("boston"),
    days: z.number().int().min(1).max(365).default(120),
  })
  .strict();

const KEYWORDS_DEFAULT = "tech|startup|ai|founder|developer|engineer|data|hack|network|career";
const keywords = z
  .string()
  .default(KEYWORDS_DEFAULT)
  .refine((k) => {
    try {
      new RegExp(k);
      return true;
    } catch {
      return false;
    }
  }, { error: "keywords must be a valid regular expression" });

export const LumaIcalSource = z
  .object({
    ...base,
    adapter: z.literal("luma_ical"),
    /** the `id` of https://api.lu.ma/ics/get?entity=<entity>&id=<id> */
    entity: z.enum(["discover", "calendar"]).default("discover"),
    feed_id: z.string().regex(/^[\w-]+$/),
    name: z.string().trim().min(1),
    /** alternation matched as whole words against title + description */
    keywords,
    days: z.number().int().min(1).max(365).default(120),
  })
  .strict();
export const SuffolkSource = z
  .object({
    ...base,
    adapter: z.literal("suffolk"),
    feed: z.enum(["localist", "engage"]),
    keywords,
    days: z.number().int().min(1).max(365).default(60),
  })
  .strict();

export const SourceConfig = z.discriminatedUnion("adapter", [
  GreenhouseSource,
  LeverSource,
  AshbySource,
  WorkdaySource,
  SimplifySource,
  DevpostSource,
  MlhSource,
  MeetupIcalSource,
  LumaIcalSource,
  SuffolkSource,
]);
export type SourceConfig = z.infer<typeof SourceConfig>;
export type AdapterName = SourceConfig["adapter"];
export type SourceOf<A extends AdapterName> = Extract<SourceConfig, { adapter: A }>;

export const SourcesFile = z
  .object({ jobs: z.array(SourceConfig), events: z.array(SourceConfig) })
  .strict()
  .superRefine((f, ctx) => {
    const seen = new Set<string>();
    for (const s of [...f.jobs, ...f.events]) {
      if (seen.has(s.id)) ctx.addIssue({ code: "custom", message: `duplicate source id "${s.id}"` });
      seen.add(s.id);
    }
  });

// ── adapters ─────────────────────────────────────────────────────────────

export type Http = {
  json<T = unknown>(url: string, init?: { method?: "GET" | "POST"; body?: unknown; headers?: Record<string, string> }): Promise<T>;
  text(url: string, init?: { headers?: Record<string, string> }): Promise<string>;
};

export type AdapterContext = {
  http: Http;
  now: Date;
  log: (msg: string) => void;
};

export type AdapterResult = {
  /** listings the source returned before any filtering */
  fetched: number;
  /** listings that passed the rules, normalised */
  items: SyncItem[];
};

export type Adapter<A extends AdapterName> = {
  kind: SyncItem["kind"];
  /** value written to `source_name` */
  sourceName(source: SourceOf<A>): string;
  /** every external_id this source produces starts with this; closing is scoped to it */
  prefix(source: SourceOf<A>): string;
  fetch(source: SourceOf<A>, ctx: AdapterContext): Promise<AdapterResult>;
};
