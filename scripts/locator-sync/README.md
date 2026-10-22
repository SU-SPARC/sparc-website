# Locator sync

`npm run locator:sync` pulls jobs (internships, co-ops, externships and new-grad
roles), hackathons and networking events from public, machine-readable sources
into `public.opportunities`, with source
attribution (`source_name`, `source_url`, `external_id`), and closes listings
that have disappeared. GitHub Actions runs it at 11:00 and 23:00 UTC
(`.github/workflows/locator-sync.yml`).

```
npm run locator:sync                         # every enabled source
npm run locator:sync -- --source formlabs    # one source (comma-separate several; runs even if disabled)
npm run locator:sync -- --kind hackathon     # internship | networking | hackathon
npm run locator:sync -- --dry-run            # fetch + normalise, print counts and 3 samples, write nothing
npm run locator:sync -- --limit 5            # at most 5 items per source; never closes anything
```

Needs `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY` (env or `.env.local`), except for `--dry-run`.

## Adding a company

Add one object to `jobs` in `sources.json`. `id` is lowercase-with-hyphens and
starts every slug the source creates; `company` becomes `organizer`; `office`
(e.g. `"Somerville, MA"`) counts as local even when a posting's location text
does not say Massachusetts; `priority: "national"` for boards outside Boston,
which only contribute Massachusetts, New York City or US-remote roles. Check it with
`npm run locator:sync -- --source <id> --dry-run`. Set `"enabled": false` with a
`note` instead of deleting a source that stopped working, so nobody re-adds it.
Two sources may not write the same external-id prefix; the command refuses to start
if they would.

```json
{ "id": "formlabs", "adapter": "greenhouse", "token": "formlabs", "company": "Formlabs",
  "careers_url": "https://job-boards.greenhouse.io/formlabs", "office": "Somerville, MA", "tags": ["hardware"] }
```

## What is kept

Jobs: the title says intern / internship / extern / externship / co-op /
apprentice or new grad / new graduate / university graduate / early career /
campus hire (or the source's structured employment type says intern) and not
senior / staff / principal / manager / director / lead / freelance; a location in
Massachusetts (or the source's office), New York City (tagged `nyc`, area
"outside_boston") or US remote (non-US
places such as "Cambridge, UK" or "Remote in Canada" are dropped); and not only for
terms that have already ended ("Winter 2026"). A listing whose posting (same ATS job
id, or the same URL without tracking parameters) already exists as a seed, manual or
import row is not inserted, and an existing sync row that matches one is closed, so
each posting shows once (`skipped … (curated)` / `deduped …` in the run line). Events:
not yet over and inside the source's day window. Each source's run is one row in
`sync_runs`.

Each job gets a `job_type` from its title: extern, externship → `externship`;
co-op → `coop`; new grad, new graduate, university graduate, early career,
campus hire → `new_grad`; else `internship`. The `externship` value needs
migration `0007_externships.sql` applied (`npx supabase db push`) before this
version of the sync runs, or the insert fails with an enum error.
Terms come from the title (else the text): summer, fall/autumn → fall, spring,
winter/january, part-time/year-round → `semester_part_time`. A co-op can have a
season ("Co-op (Spring 2027)" → `coop`, `spring`). A dry run prints the count per
job type under each jobs source.

## Who owns which column

The source always wins on title, url, location, pay, posting_site, posted_at and
the dates. Summary, description, eligibility, tags, area, format, terms, job_type,
dates_note and organizer_url follow the source until an editor changes one of the
editor-owned columns, which stamps `editor_edited_at` (trigger in
`0004_locator_sync.sql`, extended in 0005 and 0006); from then on they are the editor's. `published` is never
touched except that a closed listing that comes back is re-published. A
successful run without `--limit` closes (`closed_at = now()`, `published = false`)
that source's rows it no longer returned; a failed run closes nothing.

## Adapters

**greenhouse** (`token`): `GET boards-api.greenhouse.io/v1/boards/<token>/jobs?content=true&pay_transparency=true`.
Every open job in one request with entity-encoded HTML content; pay comes from
`pay_input_ranges`. Id `greenhouse:<token>:<job id>`.

**lever** (`account`): `GET api.lever.co/v0/postings/<account>?mode=json`. Location from
`categories.allLocations`, terms also from `categories.commitment`, pay from `salaryRange`.
Id `lever:<account>:<id>`.

**ashby** (`board`): `GET api.ashbyhq.com/posting-api/job-board/<board>?includeCompensation=true`.
`isRemote` adds a remote location; pay is the compensation summary when it shows
dollars. Id `ashby:<board>:<id>`.

**workday** (`tenant`, `host` e.g. `wd5`, `sites[]`, `searches` default `["intern", "co-op"]`):
undocumented candidate-experience API. `POST https://<tenant>.<host>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs`
with `{"appliedFacets":{},"limit":20,"offset":n,"searchText":…}`, paged to `total` (20 per page,
2000 max); the search is fuzzy, so titles are filtered here, then only likely-local postings get
`GET …/<site><externalPath>` for the description, locations, posting start/end dates and public
URL. Find a tenant's values in its careers URL `https://<tenant>.<host>.myworkdayjobs.com/<site>`.
Id `workday:<tenant>:<externalPath>`.

**simplify** (`repo`, `branch` default `dev`, `job_type` optional): the raw `.github/scripts/listings.json`
(about 13 MB) behind the SimplifyJobs README. Keeps `active && is_visible` rows in
Massachusetts or US remote whose terms have not all ended; terms map Summer → summer,
Fall → fall, Spring → spring, Winter → winter; the job type is the source's `job_type`, else
read from the title. `simplify-new-grad` (`SimplifyJobs/New-Grad-Positions`, `"job_type":
"new_grad"`) has no terms, and its rows must also pass the not-senior and technical-field
rules. The repo has no licence, so rows only link to the employer's posting. Id `simplify:<repo>:<id>`.

**devpost** (`pages` default 3): `GET devpost.com/api/hackathons?status[]=upcoming&status[]=open&page=n`
(9 per page) plus one `search=boston` page. The submission-period text ("Oct 05 - 27, 2026")
becomes `starts_on` / `ends_on` / `deadline_on`; themes become tags; the prize HTML becomes `prizes`
("$10,000 in prizes"; `pay`, the cost, stays null).
Online → area online; Massachusetts → boston; other US → outside_boston; elsewhere dropped.
Id `devpost:<id>`.

**mlh** (`season`): `www.mlh.com/seasons/<season>/events` has no JSON endpoint but embeds its
Inertia props in `<script data-page="app" type="application/json">`; `props.upcomingEvents[]`
gives name, slug, dates, location, format and website. Keeps digital events and in-person ones
in the US or Canada. Id `mlh:<slug>`.

**meetup_ical** (`group`, `name`, `area` default boston, `days` default 120):
`GET www.meetup.com/<group>/events/ical/`. The feed has no LOCATION, so an event is online when
its description mentions Zoom / online / virtual, otherwise it takes the source's area. The
group slug is the path segment of the group's Meetup URL. Id `meetup:<group>:<uid>`.

**luma_ical** (`feed_id`, `entity` default discover, `keywords`): `GET api.lu.ma/ics/get?entity=<entity>&id=<feed_id>`
(undocumented). LOCATION is the Luma link; the event's "Hosted by" line becomes the organizer; a
whole-word keyword filter (tech, startup, ai, founder, developer, engineer, data, hack, network,
career) keeps a city-wide feed relevant. Id `luma:<feed_id>:<uid>`.

**suffolk** (`feed`: `localist` | `engage`, `keywords`, `days` default 60): Suffolk's public
Localist calendar (`events.suffolk.edu/api/2/events?days=…&pp=100`, one item per event instance,
source name "Suffolk events") and the Engage student-org search
(`suffolk.campuslabs.com/engage/api/discovery/event/search`, public events only, source name
"Suffolk Engage"), with the same keyword filter; area `suffolk`. Ids
`suffolk:localist:<instance id>` and `suffolk:engage:<id>`.

## Network

Every request sends a browser User-Agent, times out after 20 s, is retried once on network
errors, 429 and 5xx, and follows at most three redirects, each re-checked so a hop to a
loopback, private or link-local address is refused (`http.ts`). A source that returns nothing
logs a warning, since the Workday, Devpost, MLH and Luma endpoints are undocumented.
