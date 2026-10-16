# SPARC website — Supabase CMS architecture

Status: design, October 2026. Supersedes `supabase/schema.sql`, whose header
assumed editing in the Supabase table editor and no admin UI.

## Goals

1. People, photos, projects, events, news and links are edited **on the
   website**, not by pushing files to the repo.
2. **Accounts.** One shared e-board admin login is created by the seed. The
   e-board creates a login for each member from the site; members manage their
   own card (photo, bio, links). Public sign-up is off. What an account may do is
   decided by Postgres row-level security (RLS), never by UI code alone.
3. Photos live in **Supabase Storage**, not in `public/`. Every upload passes
   through a **compression layer in the browser** before it leaves the device.
4. **Project management.** Signed-in members can request projects and work
   them on a board (Kanban, Scrumban, Scrum or SAFe template). Every project has
   a supervisor (faculty or an experienced student), timestamps and a GitHub link.
5. **`/links`**: a link-in-bio page whose entries are edited on the site.
6. The public site stays a fast, mostly-static Next.js site. Edits appear
   within seconds via on-demand revalidation.

Non-goals for this phase: a visual redesign of the public pages (the September
rebuild stands), rich text, comments, realtime collaboration on boards, OAuth.

## Roles

| role     | who                                   | can                                                                       |
|----------|---------------------------------------|---------------------------------------------------------------------------|
| anon     | any visitor                           | read published rows and public media                                      |
| member   | anyone the e-board created a login for | read everything incl. all project boards; edit **own** member card; request projects; edit boards of projects they belong to |
| editor   | an e-board member given elevated rights | all content CRUD, media upload, approve project requests, edit any board  |
| admin    | the shared e-board login              | everything an editor can, plus create/invite accounts and manage roles     |

Flow: the seed creates the admin account (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`).
Admins create members' accounts at `/admin/accounts/new` with a **temporary
password** shown once (the default: it needs no email at all), or by **invite
email** once custom SMTP is configured. An account is linked to a member card at
creation (pick an existing card or create one). Admins can also reset a
member's password to a new temporary one. Yearly rotation of the shared login
is a password change on `/dashboard/profile`.

Email caveat: Supabase's built-in sender only delivers to the project's own
team members, two per hour. Invites and self-service password resets therefore
need custom SMTP (for example Resend's free tier) before they work in
production. `docs/CMS.md` covers the setup; until then the temporary-password
path is the one that works.

## Schema

Two migrations. All tables in `public`, RLS enabled on every one;
`created_at`/`updated_at` are `timestamptz`, `updated_at` kept by a trigger.

### `supabase/migrations/0001_cms.sql`

```
user_role        enum ('member', 'editor', 'admin')
member_status    enum ('current', 'alumni')
project_kind     enum ('team', 'personal')
project_status   enum ('proposed', 'in_progress', 'completed', 'archived')
methodology      enum ('kanban', 'scrumban', 'scrum', 'safe')
supervisor_kind  enum ('faculty', 'student')

media            one row per uploaded image (the file registry)
  id uuid pk, bucket text default 'media', path text unique,
  thumb_path text, width int, height int, bytes int, mime text,
  blur_data_url text, alt text default '', original_name text,
  created_by uuid → auth.users (set null), created_at

profiles         one row per auth user, created by trigger on auth.users insert
  id uuid pk → auth.users (cascade), email text, display_name text,
  role user_role default 'member',
  member_id uuid → members (set null),      -- links an account to its member card
  created_at, updated_at

members          as schema.sql, except:
  photo text          →  photo_media_id uuid → media (set null)
  + eboard bool default false   -- replaces the "sort_order < 100" convention
  + published bool default true, + updated_at

projects         as schema.sql, except:
  cover text          →  cover_media_id uuid → media (set null)
  gallery text[]      →  project_gallery (project_id, media_id, sort_order)
  + methodology methodology default 'kanban'
  + supervisor_kind supervisor_kind, supervisor_member_id → members (set null),
    supervisor_name text            -- used for faculty, or a student without a card
  + requested_by uuid → profiles (set null), approved_by, approved_at
  + published bool default false, + updated_at
  (repo_url is the GitHub link; status 'proposed' = a pending request)

events           as schema.sql (starts_at stays timestamptz), plus:
  cover_media_id → media (set null), published bool default true, updated_at

recordings       NEW — Zoom recordings, optionally attached to an event
  id, title, recorded_on date, kind text default 'Zoom Recording', url text,
  description text, event_id → events (set null), sort_order, published

news             NEW — the home-page news cards
  id, slug unique, title, published_on date, media_id → media, published

photos           NEW — the curated gallery the home photo strip draws from
  id, media_id → media (unique), caption text, taken_on date,
  sort_order int, featured bool default false, published bool default true

links            NEW — the /links page
  id, label text, url text, description text, icon text,   -- lucide icon name
  sort_order int, published bool default true, created_at, updated_at
```

### `supabase/migrations/0002_project_management.sql`

```
task_priority    enum ('low', 'medium', 'high', 'urgent')

project_members  (project_id → projects cascade, profile_id → profiles cascade,
                  role text default 'member' check in ('lead','member'),
                  joined_at)  pk (project_id, profile_id)
project_sprints  id, project_id, name, goal, starts_on date, ends_on date,
                  position int, created_at           -- Scrum/Scrumban/SAFe only
project_columns  id, project_id, name, position int, wip_limit int null,
                  is_done bool default false          -- cards here count as completed
project_tasks    id, project_id, column_id → project_columns, sprint_id null,
                  title, description, priority default 'medium', points int null,
                  assignee_profile_id → profiles (set null), due_on date null,
                  github_url text null, position int,
                  created_by → profiles, created_at, updated_at, completed_at
project_activity id, project_id, task_id null, actor_profile_id, action text,
                  detail jsonb, created_at           -- the timeline / timestamps
```

Board templates (columns created when a project is approved, editable after):

| methodology | columns (• = `is_done`)                                        | sprints |
|-------------|-----------------------------------------------------------------|---------|
| kanban      | Backlog · To Do · In Progress (WIP 3) · Review · Done•          | no      |
| scrumban    | Backlog · Ready (WIP 5) · In Progress (WIP 3) · Review · Done•  | optional |
| scrum       | Product Backlog · Sprint Backlog · In Progress · Review · Done• | yes     |
| safe        | Program Backlog · Iteration Backlog · In Progress · Review · Done• | yes, named "Iteration", grouped by a "PI" field in `project_sprints.name` convention |

Why a `media` registry instead of URL strings: the same upload can be reused,
width/height/blur are available to the renderer without a round trip, and
deleting an image can find every reference.

Decisions driven by the survey:

- **E-Board** is the explicit `members.eboard` flag. The seed sets it from the
  old `sort_order < 100` rule; `sort_order` is only an ordering afterwards.
- **Dates.** `events.starts_at` is an instant; the admin form takes a date and an
  optional time in **America/New_York**, and every formatter pins
  `timeZone: "America/New_York"`. `recordings.recorded_on`, `news.published_on`,
  `photos.taken_on`, `project_sprints.*_on`, `project_tasks.due_on` are
  **date-only** and travel as `YYYY-MM-DD` strings end to end; a shared
  `formatDateOnly()` formats them with no timezone arithmetic.
- **Refs** (`#01`, `SP-001`) stay editable text; the admin form proposes the next
  one. Event order on the page is by `starts_at`, never by array position.
- **The About page photo** is the first published photo with `featured = true`
  (falls back to the first gallery photo).
- **Not content, stays in the repo:** the five footer wordmark mask images
  (hand-tuned crops, re-encoded small under `public/wordmark/`), the advisor
  portrait on `/join` (`public/advisor.webp`), icons/logos, placeholders, one
  local OG image (`public/og.webp`).
- **`/preview`** (the design catalogue) stops importing content modules and
  renders from a small static fixture file. It must not depend on the database.

### Helper functions

All `security definer`, `stable`, `set search_path = ''`, and kept in a
`private` schema that is not exposed through the Data API (a security-definer
function in `public` would be callable over REST with the owner's privileges):

```
private.current_user_role() → user_role | null
private.is_editor()         → role in ('editor','admin')
private.is_admin()          → role = 'admin'
private.own_member_id()     → profiles.member_id for auth.uid()
private.is_project_member(project_id) → member of, supervisor of, or is_editor()
```

Grants are explicit on every table (Supabase no longer grants new `public`
tables to `anon`/`authenticated` automatically; a missing grant surfaces as
`42501` from PostgREST). `service_role` gets everything via default privileges.

Role and card linking are not writable by clients at all: `profiles` gets
`grant update (display_name)` only, and admins change `role` / `member_id`
through two RPCs, `public.admin_set_role(uuid, user_role)` and
`public.admin_link_member(uuid, uuid)`, which check `private.is_admin()` first.
A `public.people` view (`id, display_name, member_id`) is readable by every
signed-in user for assignee pickers.

### Policies (summary; the migrations are the source of truth)

| table            | select                                | insert / update / delete                                                   |
|------------------|---------------------------------------|----------------------------------------------------------------------------|
| media            | everyone                              | `is_editor()`; **insert also allowed** for any authenticated user with a linked member card (own photo) and for project members (task attachments are out of scope, so this is only `members/`) |
| members          | `published or is_editor()`            | `is_editor()`; **update also allowed** where `id = own_member_id()`, and a `before update` trigger rejects any change outside `nickname, photo_media_id, bio, linkedin, website` unless `is_editor()`. The trigger skips its check when `auth.uid()` is null (service role, SQL editor). |
| projects         | anon: `published and status <> 'proposed'`; authenticated: all | `is_editor()`; **insert allowed** for any authenticated user with `status = 'proposed'`, `published = false`, `requested_by = auth.uid()`; **update allowed** for the requester while still `proposed` (trigger restricts columns) and for `is_project_member()` on `summary, highlights, repo_url, live_url, cover_media_id` |
| events, recordings, news, photos, links, project_gallery | `published or is_editor()` | `is_editor()` |
| profiles         | own row, or `is_admin()`; everyone signed in reads `id, display_name, member_id` via the `people` view | update own row, `display_name` only (column grant); `role`/`member_id` only via the admin RPCs; no client inserts; no deletes |
| project_members, project_columns, project_sprints, project_tasks, project_activity | `authenticated` | `is_project_member(project_id)`; `project_members` rows: lead of that project or `is_editor()` |
| storage.objects  | everyone (bucket is public)           | `bucket_id = 'media'` and (`is_editor()` or a linked member uploading under `members/`) |

Every policy references `(select auth.uid())`, not bare `auth.uid()`.

## Storage

One public bucket, `media`:

- `file_size_limit` 8 MiB, `allowed_mime_types` `image/webp, image/jpeg, image/png, image/avif`.
  The limit is the server-side guarantee that the compression layer cannot be bypassed.
- Paths: `<kind>/<slug>-<8 hex>.webp` and `<kind>/<slug>-<8 hex>.thumb.webp`,
  kinds `members | projects | events | news | photos`.
- **Never overwrite.** Every upload gets a fresh suffix; the CDN caches forever
  (`cacheControl: '31536000'`). Replacing an image creates a new object and the
  old one is removed by the server action after the row is updated.
- Storage image transformations are not used (Pro-plan feature).

## Image pipeline

Browser (every upload), hand-rolled in `lib/images/encode.ts` with no
dependency (`browser-image-compression` is unmaintained and loads its worker
from a third-party CDN):

1. Decode once with `createImageBitmap(file, { imageOrientation: 'from-image' })`
   so phone photos come out upright.
2. Produce three outputs on an `OffscreenCanvas`:
   - **full**: long edge ≤ 2000 px, WebP quality 0.82
   - **thumb**: long edge ≤ 640 px, WebP quality 0.80 (admin lists, cards)
   - **blur**: 24 px wide as a `data:` URL (~400 bytes) for placeholders
   Safari cannot encode WebP from a canvas and silently returns PNG, so the
   encoder checks `blob.type` and falls back to JPEG at the same quality. The
   stored `mime` and file extension follow what was actually produced.
3. Show the user original vs compressed size before they save.
4. Upload full + thumb to Storage **directly from the browser** (Vercel caps
   server-action bodies at 4.5 MB), then insert the `media` row with
   dimensions, bytes, blur and the required `alt` text.

Expected results: a 3–5 MB phone JPEG → 150–350 KB full, 25–50 KB thumb.
HEIC (iPhone default) cannot be decoded by browsers; the uploader rejects it with
a message telling the user to export as JPEG.

Node (one-time migration, `scripts/seed/`): the same policy via `sharp`,
reading the **original** JPEG/PNG in `public/` where one exists (three of the
`.webp` re-exports are mislabelled JPEG/PNG; `sharp` sniffs content).

Rendering: `next/image` with `fill` and the optimizer **on**, exactly as the
site does today (`verify.sh` bans `unoptimized`). `next.config.ts` adds a
`remotePatterns` entry derived from `NEXT_PUBLIC_SUPABASE_URL`, and sets
`images.dangerouslyAllowLocalIP` only when that URL points at the local stack
(Next 16 blocks local IPs by default). `placeholder="blur"` uses `blur_data_url`.

## Data layer contract (`lib/data/*.ts`, server-only)

Pages never import `@supabase/*` directly. They call:

```ts
type ImageRef = { src: string; thumb: string; width: number; height: number; blur: string | null; alt: string };
type DateOnly = string;            // 'YYYY-MM-DD'

getMembers():    Promise<Member[]>      // published, by sort_order; photo: ImageRef | null; eboard: boolean
getProjects():   Promise<Project[]>     // public set: published and not proposed; cover: ImageRef | null; gallery: ImageRef[]; supervisor
getEvents():     Promise<SparcEvent[]>  // starts_at: Date (instant), by starts_at
getRecordings(): Promise<Recording[]>   // recorded_on: DateOnly
getNews():       Promise<News[]>        // image: ImageRef; published_on: DateOnly
getPhotos():     Promise<Photo[]>       // the gallery, by sort_order; image: ImageRef; featured
getLinks():      Promise<Link[]>        // published, by sort_order
```

The DB-backed types live in `lib/data/types.ts` and keep the old names;
image fields are `ImageRef` instead of `string`, date-only fields are
`DateOnly`. The pure helpers `upcoming`, `past`, `currentTerm` move to
`lib/data/events-helpers.ts` unchanged, and date formatting lives in
`lib/data/dates.ts` (`formatInstant`, `formatDateOnly`). The legacy
`lib/content/*` modules stay untouched until the integration phase deletes them,
so parallel work never edits the same file.

Caching: public routes read through a cookie-less client (`lib/supabase/public.ts`)
so they stay static, and export `revalidate = 300`. Every admin server action
ends with `revalidatePath('/', 'layout')`. Signed-in routes (`/dashboard/**`,
`/admin/**`) read cookies, are dynamic, and are never cached. Next's
`cacheComponents` stays off.

## Routing and layouts

The root layout keeps `<html>`, fonts, metadata and the theme provider only.
The public chrome moves to a route group layout:

```
app/layout.tsx                      html/body/fonts/ThemeProvider/metadata
app/not-found.tsx                   renders Navbar + Footer itself
app/(site)/layout.tsx               skip link + Navbar + Footer
app/(site)/{page,home-sections}.tsx, about/, events/, projects/, join/, links/, preview/
app/(auth)/login, forgot-password, auth/update-password      minimal chrome
app/auth/confirm/route.ts           verifyOtp handler (invite, recovery, email change)
app/(members)/layout.tsx            signed-in shell: top bar with SPARC mark, Dashboard · Projects · Profile (· Admin if editor+), sign out
app/(members)/dashboard/            hub: my card, my projects, pending requests I made
app/(members)/dashboard/profile/    display name, password change, own member card editor
app/(members)/dashboard/projects/   all projects as cards; "Request a project"
app/(members)/dashboard/projects/new
app/(members)/dashboard/projects/[id]/   board (columns, cards, drag and drop), members, sprints, activity
app/(admin)/admin/**                admin shell with a sidebar
```

URLs do not change for existing pages. The `/team` and `/contact` redirects stay.

## Auth and admin surface

| route                | who          | what                                                        |
|----------------------|--------------|-------------------------------------------------------------|
| `/login`             | anon         | email + password                                             |
| `/forgot-password`, `/auth/update-password` | anon / signed-in | reset and invite-acceptance flow        |
| `/auth/confirm`      | —            | `verifyOtp({ token_hash, type })`, then redirect by type     |
| `/dashboard/**`      | signed-in    | see above                                                    |
| `/admin`             | editor+      | dashboard with counts and pending project requests           |
| `/admin/{members,projects,events,news,photos,links}` | editor+ | list → edit form; publish toggle; delete with confirm |
| `/admin/events/[id]` | editor+      | includes the event's recordings                              |
| `/admin/projects/requests` | editor+ | approve (creates board from template, assigns supervisor) or decline |
| `/admin/accounts`    | admin        | list profiles, change role, link to member card              |
| `/admin/accounts/new`| admin        | invite by email or create with temporary password; link/create member card |

`proxy.ts` (Next 16's name for middleware; `middleware.ts` is deprecated and
having both is a build error) refreshes the session cookie and bounces
unauthenticated requests off `/admin/*` and `/dashboard/*`. Layouts re-check
the role on the server; the proxy is a convenience, RLS is the guard. Account
creation uses the Supabase admin API with the secret key **inside a server
action that first verifies `is_admin()`**; the secret key is a server-only env var.

Forms are server actions with `useActionState` and `zod` validation. The UI
reuses the site's tokens and primitives (`components/ui/*`, Martian Mono only,
no Ultra). Shared form primitives (Field, Input, Textarea, Select, Checkbox,
ImageUpload, ConfirmButton, Table, status message, EmptyState) live in
`components/forms/*`. `globals.css` gains `danger`, `success` and `warning`
colours in all three themes. `cn()` has no merge logic, so primitives expose
props rather than relying on className overrides. The Mobbin design brief
(`docs/DESIGN-BRIEF.md`) governs layout and interaction patterns for the admin,
dashboard, board and `/links` screens.

## What leaves the repo

- `public/*.{jpg,jpeg,png}` originals and `public/images/*.webp` re-exports,
  except placeholders, logos/icons, the five wordmark masks, the advisor photo
  and one OG image.
- `lib/content/{members,projects,events,news}.ts` move to `scripts/seed/content/`
  and become the one-time seed source. Pages read from `lib/data/*`.
- `supabase/schema.sql` is replaced by `supabase/migrations/`.

## Environment

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  # sb_publishable_… (a legacy anon JWT also works)
NEXT_PUBLIC_SITE_URL                  # for auth redirect links
SUPABASE_SECRET_KEY                   # server only: account-creation actions + seed script; never NEXT_PUBLIC_
SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD # seed script only
```

Local development uses `supabase start` (Docker). This project is pinned to
ports 55321–55329 in `supabase/config.toml` so it can run beside other local
Supabase projects. Email confirmation is off locally; local emails (invites,
resets) land in Mailpit at http://127.0.0.1:55324.

## Work split and file ownership

| phase | owner | files |
|-------|-------|-------|
| C1 backend core | agent C | route-group move, `supabase/migrations/0001_cms.sql`, `supabase/config.toml`, `lib/supabase/*`, `lib/auth.ts`, `lib/data/*` (incl. `types.ts`, `dates.ts`, `events-helpers.ts`), `next.config.ts`, `eslint.config.mjs`, `package.json`, `.env.example`, `scripts/rls-check.ts` |
| R design brief | agent R | `docs/DESIGN-BRIEF.md` (Mobbin research) |
| C2 seed | agent C | `scripts/seed/**` |
| D auth + admin + members shell | agent D | `proxy.ts`, `app/(auth)/**`, `app/auth/**`, `app/(members)/layout.tsx`, `app/(members)/dashboard/{page,profile}/**`, `app/(admin)/**`, `components/forms/**`, `components/admin/**`, `lib/actions/**`, `lib/images/**`, `app/globals.css` (new tokens only) |
| E public pages | agent E | `app/(site)/**`, `app/not-found.tsx`, `components/ui/**`, `components/theme-toggle.tsx` |
| G project boards | agent G | `supabase/migrations/0002_project_management.sql`, `app/(members)/dashboard/projects/**`, `components/board/**`, `lib/actions/projects-pm.ts`, `lib/data/pm.ts`, `app/(admin)/admin/projects/requests/**` |
| F integration | agent F | run seed locally, delete migrated assets from `public/`, `docs/CMS.md`, `README.md`, `scripts/verify.sh` scope |

C1 and R run first, in parallel. D, E and C2 run in parallel against C1's
contract. G starts once D's `components/forms/*` and the members shell exist.
F runs last, then review and browser QA.
