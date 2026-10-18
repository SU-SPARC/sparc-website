# Locator sync: scheduled ingestion with source attribution

Status: design, October 2026. Extends `docs/LOCATOR.md`. Answers "how do the
four lists stay current without someone pasting links every day".

## What it does

A command, `npm run locator:sync`, pulls new and changed listings from
sources that publish machine-readable job and event data, writes them into
`opportunities` with full **source attribution**, marks postings that have
disappeared as closed, and records every run. GitHub Actions runs it twice a
day (07:00 and 19:00 Boston time) and on demand; the same command runs
locally against the local stack.

What it deliberately does not do: scrape LinkedIn, Indeed or Built In (they
block automated access and their terms forbid it; they remain the "Search
elsewhere" links), log in anywhere, or delete rows.

## Sources

| adapter | kind | how | identity |
|---|---|---|---|
| `greenhouse` | internship | `GET https://boards-api.greenhouse.io/v1/boards/<token>/jobs?content=true` | `greenhouse:<token>:<job id>` |
| `lever` | internship | `GET https://api.lever.co/v0/postings/<company>?mode=json` | `lever:<company>:<id>` |
| `ashby` | internship | `GET https://api.ashbyhq.com/posting-api/job-board/<board>?includeCompensation=true` | `ashby:<board>:<id>` |
| `workday` | internship | `POST https://<tenant>.<wd>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs` with `{appliedFacets:{}, limit, offset, searchText:"intern"}`; detail `GET …/wday/cxs/<tenant>/<site>/<externalPath>` | `workday:<tenant>:<externalPath>` |
| `simplify` | internship | raw `listings.json` from the SimplifyJobs internships repo (and New-Grad for later) | `simplify:<id>` |
| `devpost` | hackathon | `GET https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&page=n` | `devpost:<id or url slug>` |
| `mlh` | hackathon | the season events page (JSON if it exists, else the stable HTML cards) | `mlh:<event slug>` |
| `meetup_ical` | networking | `https://www.meetup.com/<group>/events/ical/` per configured group | `meetup:<group>:<uid>` |
| `luma_ical` | networking | `https://api.lu.ma/ics/get?entity=discover&id=discplace-VWeZ1zUvnawYHMj` (Boston discover calendar, iCal), keyword-filtered | `luma:<uid>` |
| `suffolk` | networking | Localist API `https://events.suffolk.edu/api/2/events?days=60&pp=100` and Engage API `https://suffolk.campuslabs.com/engage/api/discovery/event/search`, keyword-filtered, `area: suffolk` | `suffolk:<calendar>:<id>` |

Conferences stay curated (no reliable feed).

What the feed research (16 Oct 2026, live requests) settled:

- **SimplifyJobs** is the richest job source: the raw `listings.json` lives on the `dev` branch
  (13 MB; about 4,800 active rows, 260 in Greater Boston). No license file, so the sync links
  out and never republishes posting text beyond a short summary.
- **Workday** answers unauthenticated for Fidelity, Draper, Vertex, Moderna, Analog Devices,
  Mass General Brigham, RTX, Thermo Fisher, State Street and athenahealth; results come 20 at a
  time (paginate with `offset`), the search is fuzzy, and Liberty Mutual (iCIMS), Boston Scientific
  (SuccessFactors), Dell (HTTP 422), Akamai and MathWorks (403) are not reachable this way.
- **Greenhouse** Boston boards: Formlabs, Audax, Ginkgo, InterSystems, Datadog, Tulip, Lightmatter,
  Vestmark (interns now); Klaviyo, Toast, CarGurus, Hometap, Markforged (live, none now).
  **Lever**: Field AI, Tutor Intelligence, Palantir. **Ashby**: Cyvl, Ramp, Notion, Sierra, Perplexity.
- **MLH** has no JSON endpoint; the season page embeds an Inertia JSON blob
  (`<script data-page="app">`, `props.upcomingEvents`) that the adapter reads.
- **Meetup** iCal feeds carry no LOCATION field; ten Boston tech groups verified
  (bostonpython, boston-ai-machine-learning-data-science, boston-code-and-coffee, …).
  Boston New Technology is on Eventbrite, which needs a token; left manual.
- **Suffolk**: the Localist calendar API, the Engage events API and the careers-office RSS all
  work without login; Handshake does not.
- **Not automatable**: Built In (robots.txt disallows the Boston jobs paths), LinkedIn (429, terms),
  Indeed (403), Handshake (login), Work at a Startup (login-gated, truncated JSON), Eventbrite (token).
  These remain the "Search elsewhere" links. Each adapter is one file in
`scripts/locator-sync/adapters/` exporting `fetch(source, ctx) → SyncItem[]`.

Configuration lives in `scripts/locator-sync/sources.json`, committed, so an
editor adds a company by adding a line:

```json
{
  "jobs": [
    { "id": "klaviyo", "adapter": "greenhouse", "token": "klaviyo", "company": "Klaviyo",
      "careers_url": "https://www.klaviyo.com/careers", "office": "Boston, MA", "tags": ["software", "ecommerce"] },
    { "id": "liberty-mutual", "adapter": "workday", "tenant": "libertymutual", "host": "wd5", "site": "Careers",
      "company": "Liberty Mutual Insurance", "careers_url": "…", "office": "Boston, MA", "tags": ["insurance", "data"] },
    { "id": "simplify-internships", "adapter": "simplify", "repo": "SimplifyJobs/Summer2027-Internships", "path": ".github/scripts/listings.json" }
  ],
  "events": [
    { "id": "devpost-upcoming", "adapter": "devpost" },
    { "id": "bnt", "adapter": "meetup_ical", "group": "Boston-New-Technology", "name": "Boston New Technology", "area": "boston" }
  ]
}
```

## Normalised item

```ts
type SyncItem = {
  external_id: string;        // see the identity column
  source_name: string;        // "Greenhouse", "Lever", "Ashby", "Workday", "SimplifyJobs", "Devpost", "MLH", "Meetup"
  source_url: string;         // the API or feed URL the item came from (what we read)
  kind: OpportunityKind;
  title: string; organizer: string; organizer_url: string | null;
  url: string;                // the human posting / event page (what a student opens)
  posting_site: string | null;
  summary: string | null; description: string | null;   // plain text, description ≤ 6000
  area: OpportunityArea; format: OpportunityFormat; location: string | null;
  starts_on: DateOnly | null; ends_on: DateOnly | null; deadline_on: DateOnly | null; dates_note: string | null;
  internship_terms: InternshipTerm[]; pay: string | null; eligibility: string | null; tags: string[];
  posted_at: string | null;   // ISO, for "new since" ordering
};
```

Rules applied to job items before they are kept:

- Title must match `/\b(intern|internship|co-?op|apprentice)\b/i` and must not
  match `/\b(senior|staff|principal|manager|director|lead)\b/i`.
- Title must be in a technical field: a title naming a non-technical function (HR, talent,
  marketing, sales, finance, legal, contracts, supply chain, clinical, …) is dropped unless it
  also names a technical one (`engineer`, `software`, `data`, `analytics`, `research`, `cyber`,
  `hardware`, `product`, …). Workday facility codes ("US-MA-MARLBOROUGH-MA1 ~ …") are tidied
  to "Marlborough, MA" / "Remote (US)" before placement.
- Location must match the source's office, or `/boston|cambridge|somerville|waltham|burlington|massachusetts|\bMA\b/i`,
  or `/remote/i` (then `area = "online"`, `format = "online"`); anything else is dropped.
  `area = "boston"` for Massachusetts, `"outside_boston"` for other US cities.
  `format = "hybrid"` when the text says so.
- Terms are inferred from title and text: `summer` → `summer`; `co-op`/`coop` → `coop`;
  `winter`/`january`/`winternship` → `winter`; `fall`/`spring`/`part-time`/`year-round` → `semester_part_time`.
  Nothing inferable → `[]` and `dates_note = "Term not stated in the posting."`.
- `pay` from structured compensation when the source has it (Ashby, Greenhouse metadata), else null.
- `description` is the posting's plain text (HTML stripped) cut at 6000 characters; `summary` is
  its first sentence or two (≤ 300 chars). No AI call by default.

Event items: Devpost gives title, url, dates text (parsed to `starts_on`/`ends_on`), location
("Online" → `area: "online"`), prize (→ `prizes`, not `pay`), organizer, themes → tags; MLH gives name, dates, city/online;
Meetup iCal gives SUMMARY/DTSTART/DTEND/LOCATION/URL/DESCRIPTION for the next 120 days. Past events are skipped.

## Writes and ownership (who may change which column)

Schema change `supabase/migrations/0004_locator_sync.sql`:

```
alter table public.opportunities
  add column source_name      text,          -- "Greenhouse", "SimplifyJobs", "Research (16 Oct 2026)", "Import", "Manual"
  add column source_url       text,          -- where the information was read from
  add column external_id      text,          -- stable id at the source (sync rows only)
  add column posted_at        timestamptz,   -- when the source says it was posted
  add column first_seen_at    timestamptz,   -- first sync that saw it
  add column last_seen_at     timestamptz,   -- last sync that saw it
  add column closed_at        timestamptz,   -- set when a sync no longer sees it
  add column reviewed_at      timestamptz,   -- an editor looked at this sync row
  add column editor_edited_at timestamptz;   -- an editor saved this row (trigger, below)
alter table public.opportunities drop constraint opportunities_source_check;
alter table public.opportunities add constraint opportunities_source_check
  check (source in ('manual', 'seed', 'import', 'sync'));
create unique index opportunities_source_external_idx
  on public.opportunities (source_name, external_id) where external_id is not null;
create index opportunities_closed_idx on public.opportunities (kind, closed_at);

-- Editors edit through the session client (auth.uid() set); the sync and the seed use the
-- service role (auth.uid() null). So "an editor touched this row" needs no app change:
create function private.mark_editor_edit() returns trigger … set editor_edited_at = now()
  when (select auth.uid()) is not null;   -- before update on public.opportunities

create table public.sync_runs (
  id uuid pk, source_id text not null, adapter text not null,
  started_at timestamptz not null default now(), finished_at timestamptz,
  fetched int not null default 0, kept int not null default 0, inserted int not null default 0,
  updated int not null default 0, closed int not null default 0,
  ok boolean not null default false, error text,
  created_at timestamptz not null default now()
);  -- RLS: editors select; nobody else; service role writes.
```

Backfill in the same migration: `source_name = 'Research (16 Oct 2026)'` where `source = 'seed'`,
`'Import'` where `'import'`, `'Manual'` where `'manual'`. The seed script now also writes
`source_url` from the research files, so every one of the 63 rows names where it was read from.

Upsert rules in the sync (service role, `onConflict: source_name,external_id`):

| column group | on insert | on later runs |
|---|---|---|
| `title, url, location, pay, posting_site, posted_at, starts_on, ends_on, deadline_on, last_seen_at` | from the source | **always** from the source (the source is the truth for these) |
| `summary, description, eligibility, tags, area, format, internship_terms, dates_note, organizer_url`, and since 0005 `opens_on, team_size, prizes, provided` | from the source | from the source **only while `editor_edited_at` is null**; once an editor has saved the row, these are theirs |
| `published` | `true` | untouched, except re-opened rows (below) |
| `source = 'sync'`, `source_name`, `source_url`, `external_id`, `first_seen_at` | set | never changed |
| `closed_at` | null | set to now when a **successful** run of that source no longer returns the item; cleared (and `published` set back to true) if it returns |
| `reviewed_at` | null | never set by the sync; "Mark reviewed" in the admin sets it |

Closed postings stay in the table with `published = false` and `closed_at` set, so the
list's Hidden chip shows "Closed Oct 20" on them and the eligibility checks keep their history.
A source run that fails (network error, schema change) closes nothing.

## Command

```
npm run locator:sync                      # every source in sources.json
npm run locator:sync -- --source klaviyo  # one source id
npm run locator:sync -- --dry-run         # fetch, normalise, print counts and a sample; write nothing
npm run locator:sync -- --kind hackathon  # only adapters of that kind
```

`scripts/locator-sync/index.ts` reads `.env.local` like the seed (`NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SECRET_KEY`), validates `sources.json` with zod, runs adapters with a concurrency of 3,
a 20 s timeout and one retry per request, writes one `sync_runs` row per source, and exits
non-zero if every source failed (a single failing source is logged, not fatal). Output is one
line per source: `klaviyo (greenhouse): fetched 212, kept 9, inserted 2, updated 7, closed 1`.

## Schedule: GitHub Actions

`.github/workflows/locator-sync.yml`: `schedule: cron "0 11,23 * * *"` (UTC; 07:00/19:00 Boston
in daylight time) plus `workflow_dispatch` with an optional `source` input. Node 20, `npm ci`,
`npm run locator:sync`. Repository secrets: `NEXT_PUBLIC_SUPABASE_URL` (the hosted project URL)
and `SUPABASE_SECRET_KEY` (the legacy `service_role` key, same as Vercel). Timeout 20 minutes.

Why Actions and not Vercel Cron: a Vercel function has a short execution limit and the Hobby
plan allows one cron a day; the sync is a plain Node job that also runs on a laptop against the
local stack, and the secret stays in GitHub, not in the web app's runtime.

## Attribution in the admin (phase 2, after the members-facing Locator lands)

- Row meta gains "via Greenhouse" (or the research/import/manual source name); rows with
  `reviewed_at` null and `source = 'sync'` get an **Unreviewed** chip and filter; closed rows show
  "Closed Oct 20" in the meta and appear under Hidden.
- Edit page: a **Source** rail card: source name, "Open source ↗" (`source_url`), posting link,
  external id (monospace), first seen, last seen, posted, closed; buttons "Mark reviewed" and
  "Open posting ↗". Fields the sync owns show a one-line note under the section: "Title, link,
  location, pay and dates follow the source on every sync."
- Overview: a "Locator sync" line: last run time, inserted/closed counts, and failing sources.

## Optional AI enrichment

`npm run locator:sync -- --enrich` runs the existing import extraction (`lib/ai/locator.ts`
`extractOpportunity`) on **new** internship rows only, to fill summary, eligibility, pay and terms
from the job text, using `LOCATOR_SYNC_AI_MODEL` (default `claude-haiku-5-5`, the cheap tier) and
`ANTHROPIC_API_KEY`. Off by default; roughly 50 new postings a day cost well under a dollar on
Haiku. Enriched fields are written as if from the source (so an editor's later edits still win).

## Work split

| owner | files |
|---|---|
| research (Opus) | verified source list → `scripts/locator-sync/sources.json` seed |
| S1 sync (Opus) | `supabase/migrations/0004_locator_sync.sql`, `lib/supabase/database.types.ts` (regen), `lib/data/types.ts` (append the new columns), `scripts/locator-sync/**`, `scripts/seed/locator.ts` (source attribution), `.github/workflows/locator-sync.yml`, `package.json` script, `scripts/rls-check-locator.ts` (sync_runs read rule) |
| S2 attribution UI (Opus, after the members session) | `components/locator/**`, `app/(admin)/admin/locator/**`, `app/(admin)/admin/page.tsx`, `lib/data/opportunities.ts`, `lib/actions/opportunities.ts` (`markOpportunityReviewed`) |
| orchestrator | this file, `docs/CMS.md`, review, local run, browser QA |
