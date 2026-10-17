# Locator: internships, conferences, networking events, hackathons

Status: design and build, October 2026. Extends `docs/ARCHITECTURE.md`
(schema conventions, roles, data layer) and `docs/DESIGN-BRIEF.md` (admin
patterns, §0 rules, §2 list, §3 edit form). For Locator screens this file
wins on layout; token rules in `app/globals.css` win over everything.

## What it is

Four screens under `/admin/locator` where the e-board collects and searches
opportunities for members, and the same four lists read-only under
`/dashboard/locator` for every signed-in member ("Members view" below):

| screen | URL | what goes in it |
|---|---|---|
| Internships | `/admin/locator/internships` | internship and co-op postings, filtered by term: Co-op, Semester part-time, Summer, Winter |
| Conferences | `/admin/locator/conferences` | tech and research conferences: MIT URTC, Stanford's undergraduate research conference, IEEE and non-IEEE programs |
| Networking | `/admin/locator/networking` | networking events inside Suffolk and outside: Boston Tech Week, startup gatherings, open and formal meetings |
| Hackathons | `/admin/locator/hackathons` | university hackathons in Greater Boston (BU, Harvard, MIT, …) and online ones (Microsoft, OpenAI, Anthropic, Google, MLH, Devpost) |

Every screen is a curated, searchable, filterable list stored in Supabase: one
table, `opportunities`, with a `kind` column. Two AI helpers run on the club's
Anthropic account (`ANTHROPIC_API_KEY`, server only):

1. **Check my eligibility.** On any item, the signed-in person asks whether
   they are eligible and how good the item is for their career path. The
   answer is a verdict with reasons, blockers, unknowns, next steps and a
   1–5 fit score, computed from the item and the person's own **Locator
   profile** (major, year, skills, goals, availability). Results are cached
   per person per item and shown on the list.
2. **Import from a link.** On the "New" screen, paste a posting URL; the
   server fetches the page and Claude fills the form (company, role, job
   description summary, posting site, dates, pay, eligibility, tags). Nothing
   is saved until the editor reviews and presses Save.

The surface is editor+ only because it lives in `/admin` (the brief asked for
that). RLS on the new tables mirrors the content tables, so a members-facing
page can be added later with no schema change.

**Keeping the lists current.** A scheduled sync (`docs/LOCATOR-SYNC.md`,
migration 0004) pulls listings twice a day from public job boards (Greenhouse,
Lever, Ashby, Workday, SimplifyJobs) and event feeds (Devpost, MLH, Meetup, Luma,
Suffolk calendars), names the source on every row (`source_name`, `source_url`,
`external_id`), marks vanished postings closed, and leaves an editor's saved
summary, description, eligibility and tags alone. New sync rows carry an
**Unreviewed** chip until an editor presses "Mark reviewed".

Non-goals for v1: live search of external job boards (no APIs or keys; each
screen instead has "Search elsewhere" outbound links carrying the current
query), applying from the site, email digests, a public page.

## Roles

| role | Locator |
|---|---|
| anon | nothing (published rows are readable by RLS, but no page exists) |
| member | read-only `/dashboard/locator`: the four lists (published rows only), each listing's page, eligibility checks against their **own** profile, and their own Locator profile at `/dashboard/locator/profile`. No `/admin` (existing 403) |
| editor / admin | all four `/admin/locator` screens: create, edit, publish, verify, delete; AI import and eligibility checks against their **own** profile. `/dashboard/locator` works for them too and shows exactly what members see |

## Schema: `supabase/migrations/0003_locator.sql`

Same conventions as 0001: `public` schema, RLS on, explicit grants after a
revoke, `(select auth.uid())`, `private.is_editor()` helpers, `updated_at`
trigger (`private.set_updated_at`), comments on tables.

```
opportunity_kind    enum ('internship', 'conference', 'networking', 'hackathon')
internship_term     enum ('coop', 'semester_part_time', 'summer', 'winter')
opportunity_area    enum ('suffolk', 'boston', 'outside_boston', 'online')
opportunity_format  enum ('in_person', 'online', 'hybrid')
eligibility_verdict enum ('eligible', 'likely', 'unclear', 'not_eligible')

opportunities
  id               uuid pk default gen_random_uuid()
  kind             opportunity_kind not null
  slug             text not null unique
  title            text not null                    -- role title / conference / event / hackathon name
  organizer        text not null                    -- company / organizer / host
  organizer_url    text
  organizer_blurb  text                             -- one line about the company or host
  url              text not null                    -- the posting or event page
  posting_site     text                             -- 'Handshake', 'LinkedIn', 'Devpost', 'Luma', 'Company careers site', …
  summary          text                             -- 1–2 sentences (JD summary for internships)
  description      text                             -- longer plain text
  area             opportunity_area not null default 'boston'
  format           opportunity_format not null default 'in_person'
  location         text                             -- 'Cambridge, MA' / 'Online'
  starts_on        date                             -- events; null for internships
  ends_on          date
  deadline_on      date                             -- application / registration / CFP deadline
  dates_note       text                             -- 'Rolling', '2027 dates TBA; 2026 ran Oct 3–4', …
  internship_terms internship_term[] not null default '{}'   -- internships only
  pay              text                             -- '$35/hr', 'Unpaid', 'Free to attend', …
  eligibility      text                             -- who can apply, as the source states it
  tags             text[] not null default '{}'     -- lowercase: 'ai', 'ieee', 'startups', …
  source           text not null default 'manual' check (source in ('manual', 'seed', 'import'))
  verified_on      date                             -- when an editor last checked the listing
  published        boolean not null default true
  created_by       uuid references public.profiles (id) on delete set null
  created_at, updated_at timestamptz
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
  indexes: (kind, published), (kind, deadline_on), (kind, starts_on)

career_profiles            one row per account; the person's own Locator profile
  profile_id         uuid pk references public.profiles (id) on delete cascade
  major              text
  minor              text
  degree_level       text not null default 'undergrad' check (degree_level in ('undergrad', 'grad', 'other'))
  expected_grad_year int check (expected_grad_year between 2020 and 2040)
  skills             text[] not null default '{}'
  interests          text[] not null default '{}'
  goals              text                           -- free text: the career path
  constraints        text                           -- availability, travel, hours
  work_auth          text not null default 'prefer_not_to_say'
                     check (work_auth in ('us_citizen_or_pr', 'needs_sponsorship', 'international_cpt_opt', 'prefer_not_to_say'))
  updated_at         timestamptz

eligibility_checks         cached AI verdicts, one per (item, person)
  opportunity_id   uuid references public.opportunities (id) on delete cascade
  profile_id       uuid references public.profiles (id) on delete cascade
  verdict          eligibility_verdict not null
  confidence       text not null check (confidence in ('low', 'medium', 'high'))
  reasons          text[] not null default '{}'    -- requirements met / supporting points
  blockers         text[] not null default '{}'    -- requirements not met
  unknowns         text[] not null default '{}'    -- information the check could not settle
  next_steps       text[] not null default '{}'
  fit_score        int check (fit_score between 1 and 5)
  fit_note         text
  model            text not null
  inputs_hash      text not null                    -- sha256(opportunity.updated_at | career_profile.updated_at | model), first 16 hex
  checked_at       timestamptz not null default now()
  primary key (opportunity_id, profile_id)
```

Policies:

| table | select | insert / update / delete |
|---|---|---|
| opportunities | `published or is_editor()` (same two policies as the content tables) | `is_editor()` |
| career_profiles | own row: `profile_id = (select auth.uid())` | own row only (insert `with check`, update, delete). Editors and admins **cannot** read other people's profiles |
| eligibility_checks | own rows: `profile_id = (select auth.uid())` | own rows only |

Grants: `select` on `opportunities` to `anon, authenticated`; `insert, update,
delete` on `opportunities` to `authenticated`; `select, insert, update, delete`
on `career_profiles` and `eligibility_checks` to `authenticated` only;
`service_role` gets everything via the existing default privileges.

`created_by` is set by the server action from `auth.uid()`, not by a column
default, so the seed (service role) can leave it null.

## Types: additions to `lib/data/types.ts`

Field names mirror the columns; date-only columns stay `DateOnly`.

```ts
export type OpportunityKind = "internship" | "conference" | "networking" | "hackathon";
export type InternshipTerm = "coop" | "semester_part_time" | "summer" | "winter";
export type OpportunityArea = "suffolk" | "boston" | "outside_boston" | "online";
export type OpportunityFormat = "in_person" | "online" | "hybrid";
export type EligibilityVerdict = "eligible" | "likely" | "unclear" | "not_eligible";
export type OpportunitySource = "manual" | "seed" | "import";
export type DegreeLevel = "undergrad" | "grad" | "other";
export type WorkAuth = "us_citizen_or_pr" | "needs_sponsorship" | "international_cpt_opt" | "prefer_not_to_say";
export type Confidence = "low" | "medium" | "high";

export type Opportunity = {
  id: string; kind: OpportunityKind; slug: string; title: string;
  organizer: string; organizer_url: string | null; organizer_blurb: string | null;
  url: string; posting_site: string | null; summary: string | null; description: string | null;
  area: OpportunityArea; format: OpportunityFormat; location: string | null;
  starts_on: DateOnly | null; ends_on: DateOnly | null; deadline_on: DateOnly | null; dates_note: string | null;
  internship_terms: InternshipTerm[]; pay: string | null; eligibility: string | null; tags: string[];
  source: OpportunitySource; verified_on: DateOnly | null; published: boolean;
  created_at: string; updated_at: string;
};

export type CareerProfile = {
  profile_id: string; major: string | null; minor: string | null; degree_level: DegreeLevel;
  expected_grad_year: number | null; skills: string[]; interests: string[];
  goals: string | null; constraints: string | null; work_auth: WorkAuth; updated_at: string;
};

export type EligibilityCheck = {
  opportunity_id: string; profile_id: string; verdict: EligibilityVerdict; confidence: Confidence;
  reasons: string[]; blockers: string[]; unknowns: string[]; next_steps: string[];
  fit_score: number | null; fit_note: string | null; model: string; inputs_hash: string; checked_at: string;
};
```

## Pure helpers: `lib/data/locator.ts` (no `server-only`; client components may import it)

```ts
export const KINDS: readonly OpportunityKind[];
export type KindSlug = "internships" | "conferences" | "networking" | "hackathons";
export type KindConfig = {
  kind: OpportunityKind; slug: KindSlug;
  label: string;          // "Internships"
  noun: string;           // "internship"  → "New internship", "Delete internship"
  plural: string;         // "internships"
  purpose: string;        // one line for the empty state
  dated: boolean;         // false for internships (sorted by deadline); true for the three event kinds (grouped by month)
  filters: { key: string; label: string }[];   // the type-specific FilterChips, see "List screen"
};
export const KIND_CONFIG: Record<OpportunityKind, KindConfig>;
export function kindFromSlug(slug: string): OpportunityKind | null;
export type LocatorMode = "admin" | "member";                         // whose screens: /admin/locator or /dashboard/locator
export function kindPath(kind: OpportunityKind, mode?: LocatorMode): string;   // "/admin/locator/internships"; mode "member" → "/dashboard/locator/internships"
export function profilePath(mode?: LocatorMode): string;              // "/admin/locator/profile" | "/dashboard/locator/profile"
export const AREA_LABELS: Record<OpportunityArea, string>;          // Suffolk · Boston · Outside Boston · Online
export const FORMAT_LABELS: Record<OpportunityFormat, string>;      // In person · Online · Hybrid
export const TERM_LABELS: Record<InternshipTerm, string>;           // Co-op · Semester part-time · Summer · Winter
export const VERDICT_LABELS: Record<EligibilityVerdict, string>;    // Eligible · Likely eligible · Unclear · Not eligible
export const WORK_AUTH_LABELS: Record<WorkAuth, string>;
export function postingSiteFromUrl(url: string): string | null;     // host → 'LinkedIn' | 'Handshake' | 'Indeed' | 'Greenhouse' | 'Lever' | 'Workday' | 'Devpost' | 'MLH' | 'Luma' | 'Eventbrite' | 'Meetup' | 'IEEE' | else the host without www.
export function deadlineStatus(deadline_on: DateOnly | null, today: DateOnly): "none" | "open" | "closing_soon" | "closed";   // closing_soon = within 14 days
export function dateStatus(o: { starts_on: DateOnly | null; ends_on: DateOnly | null }, today: DateOnly): "undated" | "upcoming" | "ongoing" | "past";
export function formatDateRange(starts_on: DateOnly | null, ends_on: DateOnly | null): string | null;  // "Oct 3–4, 2026", "Oct 3, 2026", "Oct 30 – Nov 1, 2026"; uses formatDateOnly, never new Date(str)
export function monthKey(d: DateOnly): string;                      // "2026-10"
export function monthLabel(key: string): string;                    // "October 2026"
export function rowFilterKeys(o: Opportunity, today: DateOnly): string[];  // every filter key the row matches: its terms, its area, 'upcoming' | 'past', 'closing_soon', 'ieee' when tags include it
export function searchElsewhere(kind: OpportunityKind, query: string): { label: string; href: string }[];
```

## Server-only reads: `lib/data/opportunities.ts`

Uses the session client (`lib/supabase/server.ts`), so editors see hidden rows
and the embedded check is the caller's own (RLS).

```ts
export type OpportunityWithCheck = Opportunity & { check: EligibilityCheck | null };
export type ReadOptions = { publishedOnly?: boolean };               // the members' view adds .eq("published", true)
export async function listOpportunities(kind: OpportunityKind, opts?: ReadOptions): Promise<OpportunityWithCheck[]>;
  // internships: deadline_on asc nulls last, then created_at desc
  // dated kinds: starts_on asc nulls last, then created_at desc (the UI regroups: upcoming by month, undated, past)
export async function getOpportunity(id: string, opts?: ReadOptions): Promise<OpportunityWithCheck | null>;
export async function getCareerProfile(): Promise<CareerProfile | null>;     // the caller's own row
export async function countOpportunities(): Promise<Record<OpportunityKind, { total: number; hidden: number }>>;
```

Embed: `select("*, check:eligibility_checks(*)")` returns only the caller's
rows because of RLS; map to a single object or null. If PostgREST needs the
filter spelled out, add `.eq("eligibility_checks.profile_id", uid)`.

## Server actions

`lib/actions/opportunities.ts` ("use server"), every action `editorSession()` first:

```ts
saveOpportunity(prev: FormState, fd: FormData): Promise<FormState>
  // fd: id?, kind, title, slug, organizer, organizer_url, organizer_blurb, url, posting_site, summary,
  //     description, area, format, location, starts_on, ends_on, deadline_on, dates_note,
  //     internship_terms (repeated checkbox values), pay, eligibility, tags (comma-separated),
  //     verified_on, published, source (hidden: 'import' when the form was prefilled by import, else omitted)
  // zod via lib/actions/form-data helpers. Field errors: slug taken → "{slug} is taken by '{title}'";
  // ends_on before starts_on → on ends_on; internship_terms non-empty only for kind internship.
  // New: insert with created_by = user id → redirect(withNotice(`${kindPath(kind)}/${id}`, `Created '${title}'.`))
  // Edit: update → ok(). Always revalidateSite().
setOpportunityPublished(id: string, published: boolean): Promise<void>
markOpportunityVerified(id: string): Promise<void>     // verified_on = today in America/New_York (isoDateOnly(new Date()))
deleteOpportunity(id: string): Promise<void>           // redirect(withNotice(kindPath(kind), `Deleted '${title}'.`))
```

`lib/actions/career-profile.ts` ("use server"), `requireUser()` (any signed-in account):

```ts
saveCareerProfile(prev: FormState, fd: FormData): Promise<FormState>
  // fd: major, minor, degree_level, expected_grad_year, skills (comma), interests (comma), goals, constraints, work_auth
  // upsert own row (profile_id = user id) → ok()
```

`lib/actions/locator-ai.ts` ("use server"): `checkEligibility` is
`requireUser()` (any signed-in account, so members can run it from
`/dashboard/locator`; RLS limits them to published listings and their own
check row), `importOpportunityFromUrl` is `editorSession()`:

```ts
export type EligibilityActionResult =
  | { ok: true; check: EligibilityCheck; profileComplete: boolean }
  | { ok: false; code: "not_configured" | "no_profile" | "refused" | "rate_limited" | "failed"; error: string };
export async function checkEligibility(opportunityId: string): Promise<EligibilityActionResult>;
  // reads the opportunity (session client) and the caller's career profile; no profile row → code 'no_profile'
  // (profileComplete = major, expected_grad_year and goals are all set). Calls lib/ai/locator.ts, upserts
  // eligibility_checks (own row), returns the stored row.
export async function importOpportunityFromUrl(prev: FormState, fd: FormData): Promise<FormState>;
  // fd: url, kind. Success → ok({ draft: JSON.stringify(draft) }) with draft: OpportunityDraft.
  // Failure → { error: "Couldn't read that page: …" } / { error: "AI import isn't configured …" }.
```

## AI module: `lib/ai/*` (server only)

Built with the official SDK (`@anthropic-ai/sdk`, already installed). Before
writing it, load the `claude-api` skill and read its `typescript/claude-api/tool-use.md`
structured-outputs section; do not write API shapes from memory.

| file | contents |
|---|---|
| `lib/ai/client.ts` | `aiConfigured(): boolean`; `getAnthropic(): Anthropic` (throws when not configured); `LOCATOR_MODEL = process.env.LOCATOR_AI_MODEL ?? "claude-opus-5-5"`. **The only file that reads `ANTHROPIC_API_KEY`** (`scripts/verify.sh` enforces this). |
| `lib/ai/fetch-page.ts` | `fetchPageText(url): Promise<{ finalUrl: string; title: string | null; text: string; site: string | null }>`. http(s) only; resolve the host and refuse loopback, link-local, private and metadata ranges (SSRF); 10 s timeout; follow ≤ 3 redirects re-checking each hop; `text/html` or `text/plain` only; ≤ 2 MB; strip `script`/`style`/`nav`/`footer`, collapse whitespace, decode common entities; cap at 40 000 characters; a browser-like `User-Agent`. No new dependency. |
| `lib/ai/locator-schemas.ts` | zod schemas and inferred types, client-safe (no `server-only`): `EligibilityOutputSchema` → `{ verdict, confidence, reasons[], blockers[], unknowns[], next_steps[], fit_score 1–5, fit_note }`; `OpportunityDraftSchema` → `OpportunityDraft = Partial<Pick<Opportunity, "title" | "organizer" | "organizer_url" | "organizer_blurb" | "posting_site" | "summary" | "description" | "area" | "format" | "location" | "starts_on" | "ends_on" | "deadline_on" | "dates_note" | "internship_terms" | "pay" | "eligibility" | "tags">> & { url: string; kind: OpportunityKind; confidence_notes: string[] }`. |
| `lib/ai/locator.ts` | `runEligibilityCheck(opportunity: Opportunity, profile: CareerProfile): Promise<EligibilityOutput>` and `extractOpportunity(kind, url, page): Promise<OpportunityDraft>`. Structured outputs against the zod schemas; adaptive thinking left on; `output_config.effort: "medium"`; `max_tokens` ≥ 4000; 60 s timeout; check `stop_reason === "refusal"` before reading content and surface it as `code: "refused"`; map `RateLimitError` → `rate_limited`; everything else → `failed`. `inputsHash(opportunity, profile, model)` = first 16 hex of sha256(`${opportunity.updated_at}|${profile.updated_at}|${model}`). |

Prompt rules for the eligibility check (system prompt):

- You are a career advisor for a university computing club (SPARC, Suffolk University, Boston). Judge one opportunity for one student.
- Verdicts: `eligible` = every stated requirement is met by the profile; `likely` = no stated requirement is unmet but something is unstated or soft; `unclear` = a stated requirement cannot be settled from the profile (put it in `unknowns`); `not_eligible` = a stated requirement is clearly unmet (put it in `blockers`).
- Use only what the opportunity text states. Never infer protected characteristics, citizenship or visa status. If the posting mentions work authorization and the profile says `prefer_not_to_say`, add an `unknowns` line and do not downgrade the verdict below `unclear`.
- `fit_score` 1–5 = how well this serves the student's stated goals: for internships the career path (role, stack, employer type, term fit); for conferences, networking and hackathons the learning and networking value at their level. `fit_note` ≤ 40 words, concrete.
- Each list entry ≤ 12 words, at most 5 entries per list, `next_steps` at most 3 (what to do this week: check a page, email an organizer, prepare a thing).

Prompt rules for import: extract only what the page states; leave fields null when absent; `description` ≤ 1200 characters in plain words; `posting_site` from `postingSiteFromUrl` unless the page names one; dates as `YYYY-MM-DD`; `internship_terms` only for kind `internship`; `confidence_notes` lists anything guessed or missing ("No deadline on the page", "Pay not stated").

## Routes and files

```
app/(admin)/admin/locator/page.tsx                   redirect("/admin/locator/internships")
app/(admin)/admin/locator/profile/page.tsx           "Your Locator profile" (CareerProfileForm), editorPage guard
app/(admin)/admin/locator/[kind]/page.tsx            the list; kindFromSlug(kind) ?? notFound()
app/(admin)/admin/locator/[kind]/loading.tsx         header + 5 static rows (brief §2)
app/(admin)/admin/locator/[kind]/error.tsx           "Couldn't load …" + Try again
app/(admin)/admin/locator/[kind]/new/page.tsx        ImportFromUrl + OpportunityForm
app/(admin)/admin/locator/[kind]/[id]/page.tsx       OpportunityForm + EligibilityCard rail + DangerZone
app/(members)/dashboard/locator/layout.tsx           members: "Dashboard / Locator" line + LocatorMemberNav tabs
app/(members)/dashboard/locator/page.tsx             redirect("/dashboard/locator/internships")
app/(members)/dashboard/locator/profile/page.tsx     members: "Your Locator profile" (CareerProfileForm), requireUser
app/(members)/dashboard/locator/[kind]/page.tsx      members: LocatorList mode="member", listOpportunities(kind, { publishedOnly: true })
app/(members)/dashboard/locator/[kind]/loading.tsx   same skeleton as the admin list
app/(members)/dashboard/locator/[kind]/error.tsx     same error body as the admin list
app/(members)/dashboard/locator/[kind]/[id]/page.tsx members: OpportunityDetail + EligibilityCard rail (mode="member"); 404 unless published
components/locator/locator-list.tsx                  client: search, chips, grouping, rows, ⋯ menu, delete dialog; `mode` prop
components/locator/opportunity-form.tsx              client: the edit form (EditForm + EditColumns)
components/locator/opportunity-detail.tsx            read-only facts for the members' listing page
components/locator/member-nav.tsx                    client: the members' kind tabs + "My Locator profile"
components/locator/import-from-url.tsx               client: URL field + Import, fills the form
components/locator/eligibility-card.tsx              client: rail card, all states below; `mode` prop
components/locator/career-profile-form.tsx           client (both profile pages)
components/locator/search-elsewhere.tsx              outbound links row
components/admin/admin-sidebar.tsx                   new group "Locator" + SECTION_NAMES entries
components/admin/members-topbar.tsx                  "Locator" between Projects and Profile
app/(admin)/admin/page.tsx                           four Locator rows in the counts table (countOpportunities)
```

Sidebar group **Locator**, placed between Content and Review: Internships
(`Briefcase`), Conferences (`Presentation`), Networking (`Handshake`),
Hackathons (`Trophy`), Locator profile (`UserRound`). Prefix matching as
today; `/admin/locator/profile` highlights "Locator profile" only.

## List screen (all four kinds, one component)

References are in the Reference index at the end; open them before building.

1. **Header**: `h1` with the kind label + count (`text-ink-muted`), right: primary button "New internship" (≤640px: "New"). Same as brief §2.
2. **Toolbar**: search input (client-side; matches title, organizer, location, tags, posting site) + `FilterChip`s with counts: always All / Published / Hidden, then the kind's own:

   | kind | extra chips |
   |---|---|
   | internships | Co-op · Semester part-time · Summer · Winter · Closing soon |
   | conferences | Upcoming · Past · Boston · Online · IEEE |
   | networking | Upcoming · Suffolk · Boston · Outside Boston · Online |
   | hackathons | Upcoming · Boston · Outside Boston · Online |

   Chips use `rowFilterKeys`. One chip active at a time (brief §2 pattern). Counts beside each chip (R-L12).
3. **Search elsewhere** line under the toolbar, `text-xs text-ink-muted`: "Search elsewhere:" followed by text links (new tab, `ArrowUpRight` 12px) that carry the current query via `searchElsewhere(kind, query)`. Internships: Handshake, LinkedIn Jobs, Indeed. Conferences: IEEE conference search, Luma Boston, Eventbrite Boston. Networking: Luma Boston, Meetup, Eventbrite Boston. Hackathons: Devpost, MLH, Luma Boston. Use the base page when a query URL cannot be verified by a quick GET.
4. **Status banner** slot (`?notice=`), then the list.
5. **Rows** (`ListTable` / `ListRow` from `components/forms/list`), 64px:
   - Thumb: internships → organizer initials on `bg-surface-2` (R-L04, R-L08 for the idea of a block at the left). Dated kinds → a **date block**: day number `text-sm font-medium` over month `text-label uppercase`, 40px square `rounded-control bg-surface-2` (R-L08, R-L09, R-L18). Undated → `CalendarDays` icon in the same block.
   - Title = the edit link (`/admin/locator/<kind>/<id>`).
   - Meta line (`text-xs text-ink-muted`): `organizer · location · when`, where `when` is "Due Jan 15, 2027" / "Rolling" (dates_note) for internships and `formatDateRange` for events; append "Closing soon" in `text-warning` when `deadlineStatus` says so (R-L06 shows the "days left" idea).
   - `extra` slot: `Pill`s with words only: the internship terms (or the area for other kinds), the posting site, and the person's cached verdict when a check exists ("Eligible" `text-success`, "Likely eligible" `text-ink`, "Unclear" `text-warning`, "Not eligible" `text-danger`), else nothing (no "Not checked" noise).
   - State: `StatePill` Published / Hidden. Controls: `ActionMenu` ("View posting ↗" → `url`, "Check my eligibility" (runs `checkEligibility`, then `router.refresh()`), "Mark verified today", Publish/Unpublish, divider, "Delete…"). No order buttons: lists sort by date.
6. **Grouping** (dated kinds only): sections headed by `MicroLabel as="h2"`: one per month for upcoming and ongoing items ("October 2026", "November 2026", …), then "Undated" (items with no `starts_on`, in `created_at` desc), then "Past" (most recent first, rows `text-ink-muted`). Internships: a single table in the data layer's order (R-L01, R-L02).
7. **States**: empty, filtered-empty, loading, error exactly as brief §2. Delete uses `ConfirmDialog` and the list-notice redirect.

Mobile (≤640px): as brief §2; chips scroll horizontally; the "Search elsewhere" links wrap.

## Edit and New screens

A header in `EditHeader`’s markup ("Internships / Wayfair SWE Intern", "View posting ↗" to `url` on the right; `EditHeader` itself only knows "View on site", so the edit page renders its own) plus a muted organizer line, then `OpportunityForm` in `EditColumns`:

Main column `FormSection`s:

| section | fields |
|---|---|
| Basics | Title; Slug (`RefField`-style monospace, proposed from the title via `slugifyTitle` on new items); Organizer (label "Company" for internships, "Organizer" for conferences and hackathons, "Host" for networking); Organizer website (optional URL); About the organizer (optional, one line); Posting URL (required, `type="url"`); Posting site (optional text, auto-filled from the URL on blur when empty, via `postingSiteFromUrl`). |
| Details | Summary (Input, ≤ 200 chars); Description (Textarea, rows 8); Eligibility (Textarea, rows 3, helper "Who can apply, as the source says it. The AI check reads this."); Pay or cost (optional); Tags (comma-separated, helper lists the common tags). |
| When and where | Area (`RadioCards`: Suffolk / Boston / Outside Boston / Online, one line each); Format (`Select`); Location (optional); Starts / Ends (date inputs, hidden for internships); Deadline (date input, label "Application deadline" / "Registration deadline"); Dates note (optional, helper "Rolling, TBA, last year's dates, …"). |
| Terms (internships only) | `Checkbox` group `name="internship_terms"`: Co-op, Semester part-time, Summer, Winter. |

Rail: `PublishCard` (helperOn "Listed in Locator"); **Eligibility** card (below); **Verified** card (`RailCard`: "Verified Oct 16, 2026" or "Never verified" in `text-warning`, a "Mark verified today" outline button calling `markOpportunityVerified`, and a `Field` for the verified-on date inside the form); `RecordCard`. Then `DangerZone` ("Removes this internship from Locator. Eligibility checks for it are removed too.").

New screen: `EditHeader` title "New internship", then **ImportFromUrl** above the form (R-L16, R-L17): a `SurfaceCard` with `MicroLabel` "Import from a link", helper "Paste the posting page. The club's AI fills the form; check every field before saving.", a URL `Input` + outline button "Import" (pending: "Reading page…"). On success the form's fields are set from the draft (controlled inputs keyed by a `draftVersion` counter so `defaultValue` re-applies), a `StatusBanner` tone "info" says "Imported from <host>. <confidence_notes joined>. Check every field before saving.", and the hidden `source` is "import". When `aiConfigured()` is false the card shows one line: "AI import needs the club’s Anthropic API key on the server. See docs/LOCATOR.md." and no button. Field errors from the action show under the URL field.

## Eligibility card (rail, edit screen)

`RailCard` titled "Your eligibility". States:

| state | shows |
|---|---|
| not configured | one line "AI checks need the club’s Anthropic API key on the server. See docs/LOCATOR.md." (the env var name itself may appear only in `lib/ai/client.ts`; `verify.sh` enforces it). `mode="member"`: "AI eligibility checks aren’t set up on this site yet. Ask the e-board." |
| no profile | "Fill in your Locator profile so the check knows your year, major and goals." + text link "Locator profile →" (`profilePath(mode)`: `/admin/locator/profile`, or `/dashboard/locator/profile` for members) |
| idle | outline button "Check my eligibility" + `text-xs text-ink-muted` "Uses your Locator profile and this listing. Takes a few seconds." |
| checking | button disabled, label "Checking…", `aria-live="polite"` |
| result | verdict line: icon + word (`CircleCheck` + "Eligible" `text-success`; `CircleCheck` + "Likely eligible" `text-ink`; `CircleHelp` + "Unclear" `text-warning`; `CircleX` + "Not eligible" `text-danger`), then "Confidence: medium" `text-xs`. Lists with a leading glyph per line (R-L13, R-L14): reasons (`Check` 14px), blockers (`X` 14px `text-danger`), unknowns (`CircleHelp` 14px `text-warning`), next steps (numbered). "Career fit" line: "4/5" `tabular-nums` + `fit_note`. Footer: `<time>` "Checked 2d ago" (`TimeAgo`) + text button "Re-check". When `inputs_hash` differs from the current hash (the listing or the profile changed since), a `text-xs text-warning` line "The listing or your profile changed since this check." |
| error | inline `text-xs text-danger` with the action's message; `code === "refused"` reads "The AI declined to assess this listing." |

No modals, no toasts, no progress rings (brief §12). The result is persisted, so a reload shows the same card.

## Locator profile (`/admin/locator/profile`)

Single column `max-w-text`, `EditForm` → `saveCareerProfile`. One `FormSection` "About you": Major, Minor (optional), Degree level (`Select`), Expected graduation year (number), Skills (comma), Interests (comma), Career goals (Textarea, helper "What roles or fields you're aiming for. The eligibility check scores fit against this."), Availability and constraints (Textarea, helper "Hours per week, travel, terms you can work."), Work authorization (`Select`, default "Prefer not to say", helper "Only you can see this. It's used so the check can read sponsorship requirements."). Rail: `RailCard` "Privacy": "Your Locator profile is readable only by you. Editors and admins can't see it." Save bar as brief §3.

## Members view (`/dashboard/locator`)

Every signed-in account, member included, gets the same four lists
read-only inside the members shell (brief §6; "Locator" sits between
Projects and Profile in the top bar). Editors keep `/admin/locator` for
editing; `/dashboard/locator` shows them exactly what members see.

- **Shell** (`app/(members)/dashboard/locator/layout.tsx`): a "Dashboard /
  Locator" line, then `LocatorMemberNav`: Internships · Conferences ·
  Networking · Hackathons · My Locator profile as a tab row (kinds match by
  prefix, the profile exactly; the top bar's active style). Each page renders
  its own `h1` below.
- **Lists** (`/dashboard/locator/<kind>`): `LocatorList mode="member"` over
  `listOpportunities(kind, { publishedOnly: true })`. Differences from the
  admin list: no "New" button, no Published / Hidden chips or state pills, no
  Status column, the ⋯ menu keeps "View posting ↗" and "Check my eligibility"
  (when `aiConfigured()`), rows link to the member listing page, the empty
  state reads "The e-board hasn't listed any internships yet. Check back
  soon." with the "Search elsewhere" links and no action. A `no_profile`
  check error links to `/dashboard/locator/profile`.
- **Listing** (`/dashboard/locator/<kind>/<id>`): header "Internships /
  Wayfair SWE Intern", a primary "View posting ↗" button (new tab), the
  organizer line (linked to `organizer_url` when set). `EditColumns` with
  `OpportunityDetail` in the main column: Overview (summary, description,
  pills for terms or area, posting site, tags), Who can apply (`eligibility`
  text, else "The listing doesn't say…"), When and where (`dl`: Dates,
  deadline with "Closing soon" / "Passed", Format, Location, Pay or Cost,
  Terms), then a `text-xs` freshness line from `verified_on`. Rail:
  `EligibilityCard mode="member"`. `getOpportunity(id, { publishedOnly:
  true })`, so an unpublished id is a 404 for everyone.
- **Profile** (`/dashboard/locator/profile`): `CareerProfileForm`, same as
  the admin page; `saveCareerProfile` revalidates both `/admin/locator` and
  `/dashboard/locator`.
- **Actions**: `checkEligibility` is `requireUser()`; the opportunity read
  goes through RLS, so a member can only check a published listing.
  `importOpportunityFromUrl` and every `lib/actions/opportunities.ts` action
  stay editor-only.

## Seed and scripts

- `scripts/seed/locator/{internships,conferences,networking,hackathons}.json`: research output. Shape = the `opportunities` columns minus bookkeeping, plus `source_url` (kept out of the table; used only for the report). Validated by zod in the seed.
- `scripts/seed/locator.ts` (`npm run seed:locator`): reads the four files, validates, upserts on `slug` with `source = 'seed'`, `created_by = null`, `verified_on` from the file. Idempotent; prints per-kind counts. Env as the main seed (`.env.local`: URL + `SUPABASE_SECRET_KEY`).
- `scripts/rls-check-locator.ts` (`npm run rls:check-locator`): throwaway users as in `rls-check.ts`; proves anon reads published rows only; member cannot insert/update `opportunities`; editor can; `career_profiles` and `eligibility_checks` are own-row only for select and write (a second user sees nothing); service role bypasses. Target ≥ 16 checks.

## Environment

```
ANTHROPIC_API_KEY      # server only. The club's Anthropic account key. Read only in lib/ai/client.ts.
LOCATOR_AI_MODEL       # optional, default claude-opus-5-5
```

Add both to Vercel (Production + Preview). Without the key the Locator screens
work; only the two AI features show their "not configured" line.

## Also in this change

- Footer: the member sign-in moves to its own row at the very bottom of every
  public page, labelled "Member login" (`components/ui/footer.tsx`).
- `scripts/verify.sh`: `components/locator` joins the migrated-path list; a
  gate confines `ANTHROPIC_API_KEY` to `lib/ai/client.ts`.
- `docs/CMS.md`: Locator row in §1, env vars in §2/§3, seed in §6,
  "AI not configured" in §7. `README.md`: docs list.

## Work split and file ownership

| owner | files |
|---|---|
| R1–R4 research (Opus) | `scripts/seed/locator/<kind>.json`, one file each |
| A schema + data (Opus) | `supabase/migrations/0003_locator.sql`, `lib/supabase/database.types.ts` (regenerated), `lib/data/types.ts` (append), `lib/data/locator.ts`, `lib/data/opportunities.ts`, `lib/actions/opportunities.ts`, `lib/actions/career-profile.ts`, `scripts/seed/locator.ts`, `scripts/rls-check-locator.ts`, `lib/actions/content-helpers.ts` (only to widen `takenBy`'s table union if needed) |
| B AI (Opus) | `lib/ai/client.ts`, `lib/ai/fetch-page.ts`, `lib/ai/locator-schemas.ts`, `lib/ai/locator.ts`, `lib/actions/locator-ai.ts` |
| C UI (Opus) | `app/(admin)/admin/locator/**`, `components/locator/**`, `components/admin/admin-sidebar.tsx`, `app/(admin)/admin/page.tsx` |
| orchestrator | this file, `docs/CMS.md`, `README.md`, `.env.example`, `scripts/verify.sh`, `components/ui/footer.tsx`, `package.json` (done: SDK + scripts), review, browser QA |

A and B run in parallel against this contract (B codes against the types
above; A produces them). C starts when A's types exist. Then seed, RLS check,
build, verify, browser QA.

## Review gates

`npm run build`, `npm run lint`, `./scripts/verify.sh`, `npm run rls:check-locator`
(local stack), `npm run seed:locator` twice with no diff the second time, and a
browser pass over the four lists, a new-from-link flow, an eligibility check
and the profile form in light and dark.

## Reference index (Mobbin)

Local files live in the session scratchpad under `design-refs/` (third-party
screenshots are not committed). `img:` links expire about 30 days after
October 2026.

| id | app | screen | Mobbin | image | local | what to take |
|---|---|---|---|---|---|---|
| L01 | Remote | Jobs list | [open](https://mobbin.com/screens/1eaeb200-c03d-41cd-9fd3-9065a16610ac) | https://mobbin.com/api/mcp/short/einDjK8q | L01-remote-jobs-list.webp | Filter chips row (Job type, Workplace, Pay…), rows: logo, title, company, small meta chips, pay right, posted-ago, "Most recent" sort |
| L02 | Wellfound | Company + roles | [open](https://mobbin.com/screens/b9c48a73-babe-422a-92c8-f0bbe3363291) | https://mobbin.com/api/mcp/short/DPWMw92x | L02-wellfound-company-roles.webp | Company name + one-line blurb + size above the role row: title · location · pay; "posted 2 days ago" |
| L03 | Glassdoor | Filters + AI match | [open](https://mobbin.com/screens/a45b1185-eb4d-4167-8eeb-34349d103f05) | https://mobbin.com/api/mcp/short/kBJVVqur | L03-glassdoor-filters-ai-match.webp | Filter panel with sections; the green "Is your resume a good match? Use AI…" card with one button (our eligibility card, toned down) |
| L04 | Dribbble | Job board | [open](https://mobbin.com/screens/8325a445-cc7e-42e9-9e4a-058d6e514701) | https://mobbin.com/api/mcp/short/1VANfHi2 | L04-dribbble-job-board.webp | Row: logo square, small company line, large title, posted-ago right, location bottom-right; checkbox filters at right |
| L05 | Dribbble | Job detail | [open](https://mobbin.com/screens/da43ef96-6751-427b-aecb-e66885bea3d0) | https://mobbin.com/api/mcp/short/KQ4ghi0s | L05-dribbble-job-detail.webp | Title, "About <company>", "Role overview"; right card: logo, company, Visit website, Apply, Job type / Location / Date posted |
| L06 | Remote | Job detail rail | [open](https://mobbin.com/screens/4d5fe158-f5c2-47d4-82b3-9946b03060ef) | https://mobbin.com/api/mcp/short/lOVAgxko | L06-remote-job-detail-rail.webp | Rail facts: Workplace, Location, Work authorization ("Not open to sponsorship"), Job type, Pay, Published, "Applications ends · 8 days left" |
| L07 | Glassdoor | Resume match card | [open](https://mobbin.com/screens/df140ae1-cfe1-42fc-8370-220f34be4325) | https://mobbin.com/api/mcp/short/S8oS72PW | L07-glassdoor-resume-match-card.webp | One tinted card, one question, one button; pay card with two numbers |
| L08 | Circle | Events by month | [open](https://mobbin.com/screens/bbb7b785-2793-4264-9123-5a7a24f8191b) | https://mobbin.com/api/mcp/short/D0dcaRFn | L08-circle-events-by-month.webp | Month headings; date block (11 / OCT) left; title, time, "Virtual" tag; status at right; ⋯ |
| L09 | Luma | Events timeline | [open](https://mobbin.com/screens/01732b58-0dc7-4c31-9965-6002f42611fa) | https://mobbin.com/api/mcp/short/eLcfv3YE | L09-luma-events-timeline.webp | Upcoming / Past toggle; day labels at left; card: time, title, host, venue |
| L10 | Apple | Sessions list | [open](https://mobbin.com/screens/efb24f4c-8f64-43ce-a22e-f466b96ec847) | https://mobbin.com/api/mcp/short/H52gfDy1 | L10-apple-sessions-list.webp | Plain rows: title, time range, venue, one outline "Details"; filter summary line |
| L11 | Eventbrite | Event cards | [open](https://mobbin.com/screens/bc4e8635-b81f-4f7a-baf1-1fd7e5458923) | https://mobbin.com/api/mcp/short/MXAwnlLU | L11-eventbrite-event-cards.webp | Date line + venue + price under the title (what to show, not the card layout) |
| L12 | Klarna | Filter counts | [open](https://mobbin.com/screens/35cf8624-dbaf-4865-a0b6-1a2a3fabde74) | https://mobbin.com/api/mcp/short/cS2D7YLF | L12-klarna-filter-counts.webp | Counts beside each filter option; active filter shown as a removable chip |
| L13 | X | Eligibility checklist | [open](https://mobbin.com/screens/f8dbc003-c6e0-408c-8975-178cd07f327d) | https://mobbin.com/api/mcp/short/pKZAdAKe | L13-x-eligibility-checklist.webp | "Not yet eligible… you'll need to meet…" then one line per requirement with a check (met) or empty circle (not met) |
| L14 | Revolut Business | Verify details | [open](https://mobbin.com/screens/874b18b7-720b-45eb-aeee-3ad124804e1f) | https://mobbin.com/api/mcp/short/JlrCAWCd | L14-revolut-verify-requests.webp | Grouped list of items each with a status word ("Requires action") under the label |
| L15 | Relevance AI | Running checks | [open](https://mobbin.com/screens/58b52b1e-6230-4e53-b5a2-fce5b257c1fe) | https://mobbin.com/api/mcp/short/jorVVdbR | L15-relevance-running-checks.webp | The checking state as a short checklist with one spinner line (we use one "Checking…" line, no modal) |
| L16 | Synthesia | Import from URL | [open](https://mobbin.com/screens/5e7c0ca4-ecc9-46be-8459-962de4513d98) | https://mobbin.com/api/mcp/short/bPVHk2X5 | L16-synthesia-url-import.webp | URL tab + field at the top; generated content on the right to review before continuing |
| L17 | Flodesk | Link preview fields | [open](https://mobbin.com/screens/8b309c3d-37b4-4062-b760-7bedbc0931e9) | https://mobbin.com/api/mcp/short/6tAc7h40 | L17-flodesk-link-preview-fields.webp | Title / Description fields with character counts beside a preview |
| L18 | Unity | Sessions, expandable | [open](https://mobbin.com/screens/feacd322-bdc8-4a73-b81b-d141fdb4f4f3) | https://mobbin.com/api/mcp/short/dkGo3UPE | L18-unity-sessions-expandable.webp | Date block (MAR / 27) + time + topic + title; "Who should attend" inside the expanded row |
| L19 | Contra | Hackathon page | [open](https://mobbin.com/screens/c7fda5c2-51fb-408a-8529-3de3ac4fe737) | https://mobbin.com/api/mcp/short/RA4OwAtE | L19-contra-hackathon-stats.webp | Prize / time-until-start / participants as three plain stats; "Guidelines" tab with submission rules |

Searches run: job listings with filters, job detail with company sidebar and
match indicator, events grouped by date, hackathon listing cards, eligibility
checklist with verdict, paste-a-link import form, Devpost-style hackathon list.
No screen covered "career fit score"; that spec comes from the brief's rule
"every status has its word" (a number plus a sentence, no gauge).
