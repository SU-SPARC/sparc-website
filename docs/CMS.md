# Running the SPARC website CMS

This guide is for e-board members who look after the website. You don't need
to have read the code.

## 1. What lives where

The public site runs on Next.js on Vercel. Its content (people, projects,
events, recordings, news, photos, links) and every uploaded image are stored in
**Supabase**: a Postgres database, Auth for logins, and a public Storage bucket
called `media`. Editors change content at `/admin`. Members sign in at
`/dashboard` to edit their own card and work on project boards. Public pages
rebuild themselves within 5 minutes of a change, and saving in the admin
refreshes them straight away.

| Content | Admin page | Public page |
|---|---|---|
| People (member cards, E-Board flag) | `/admin/members` | `/about` |
| Projects | `/admin/projects` | `/projects` |
| Project requests | `/admin/projects/requests` | none (members request at `/dashboard/projects/new`) |
| Events and their recordings | `/admin/events` | `/events` |
| News | `/admin/news` | `/` (home) |
| Photo gallery (one "featured" photo) | `/admin/photos` | `/` strip, `/about` group photo |
| Links (link-in-bio) | `/admin/links` | `/links` |
| Accounts and roles (admin only) | `/admin/accounts` | none |
| Locator: internships, conferences, networking events, hackathons (editors curate; members browse) | `/admin/locator/<kind>` | `/dashboard/locator` (signed-in members) |

These files stay in the repo because they aren't content: `public/advisor.webp`,
`public/og.webp`, `public/wordmark/*` (footer masks), `public/logo/sparc-mark.svg`,
`app/icon.svg` and `app/apple-icon.png`.

## 2. One-time setup of the hosted Supabase project

1. Create a project at supabase.com (the **Free** plan is enough). Write down
   the **project ref**, which is the `<ref>` in `https://<ref>.supabase.co`.
2. From the repo root, run:
   ```
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push        # applies supabase/migrations/0001_cms.sql, 0002_project_management.sql and 0003_locator.sql
   ```
3. In **Storage**, check that a public bucket named `media` exists. The
   migration creates it.
4. **Authentication → URL Configuration**:
   - Site URL: the production URL, e.g. `https://sparc-su.vercel.app`.
   - Redirect URLs: the production URL followed by `/**`, `https://*-<vercel-team-slug>.vercel.app/**`
     (preview deploys) and `http://localhost:3000/**`.
5. **Authentication → Sign In / Providers**: turn **off** "Allow new users to
   sign up". Public sign-up is closed, and the e-board creates accounts. Leave the
   Email provider itself **enabled**.
6. **Authentication → Emails → Templates**: switch the links to the
   `token_hash` form so they go through `/auth/confirm`. Replace the link in
   each template with these:
   - **Invite user**
     `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept the invite</a>`
   - **Magic Link**
     `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">Sign in</a>`
   - **Reset Password**
     `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a>`
   - **Change Email Address**
     `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/dashboard/profile">Confirm the new address</a>`

   Invite and recovery links go to `/auth/update-password`, where the person
   sets a password. `{{ .SiteURL }}` is the Site URL from step 4, so emails
   always point to production, even when they're triggered from a preview.

   Two things to know, learned on the first deployment (October 2026):
   - **Free projects can't change email templates until custom SMTP is
     configured** (the API answers "Email template modification is not
     available for free tier projects using the default email provider"). Do
     step 7 first, then come back to this step. Until then the default
     templates are used; their links go through `/auth/callback`, which the
     site also handles, so invites and resets still work once SMTP exists.
   - Ready-made bodies for all five templates are in `supabase/templates/`.
     Paste them into the dashboard, or push them from the CLI with a minimal
     `config.toml` that declares only `project_id`, the `[auth]` URL settings
     and the `[auth.email.template.*]` entries (`supabase config push
     --workdir <that folder> --project-ref <ref>`); the full local
     `supabase/config.toml` must not be pushed, since it carries local-only
     settings.
7. **Email caveat: set up custom SMTP before you rely on email.** Supabase's
   built-in sender only delivers to members of your Supabase organisation, and
   only 2 emails an hour. Until you add SMTP, create accounts with a temporary
   password (section 5). This path needs no email.
   - Create a free **Resend** account, verify a sending domain (or use their
     test domain at first), and create an API key.
   - In Supabase, go to **Authentication → Emails → SMTP Settings** and enable
     custom SMTP: host `smtp.resend.com`, port `465`, username `resend`,
     password = the Resend API key, sender e.g. `SPARC <noreply@your-domain>`.
   - **Authentication → Rate Limits**: with custom SMTP the email limit starts
     at 30 an hour. Raise it if you invite a whole class at once.
   - In Vercel, set `AUTH_SMTP_CONFIGURED=true` and redeploy. This turns on
     the "Send invite email" option in `/admin/accounts/new`. Leave it `false`
     until a test reset email has actually arrived.
8. **Pausing:** Free projects pause after about a week without traffic, and
   the site then shows no content. Either upgrade to Pro, or keep the project
   awake with a weekly ping. A free cron service (or a GitHub Action) can request
   `https://<ref>.supabase.co/rest/v1/links?select=id` with header
   `apikey: <publishable key>` once a week.

## 3. Vercel

Set these under **Project → Settings → Environment Variables** for
Production, Preview and Development (names as in `.env.example`):

| Variable | Value | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` (Supabase → Project Settings → API Keys) | public |
| `NEXT_PUBLIC_SITE_URL` | the production URL, no trailing slash | public |
| `SUPABASE_SECRET_KEY` | the legacy **`service_role`** key (Project Settings → API Keys → Legacy API keys); see note below | **server only** |
| `AUTH_SMTP_CONFIGURED` | `false`, then `true` after step 2.7 | server only |
| `ANTHROPIC_API_KEY` | the club's Anthropic API key (console.anthropic.com → API keys). Powers the Locator eligibility checks and "Import from a link". Leave unset to run without AI. | **server only** |
| `LOCATOR_AI_MODEL` | optional; default `claude-opus-5-5` | server only |

`SUPABASE_SECRET_KEY` bypasses every security rule. The site uses it in one
place only: the admin's account actions (create an account, reset a password)
and reading a member's own hidden card. Never give it a `NEXT_PUBLIC_`
prefix, and never paste it into chat or an issue. `scripts/verify.sh` fails if
any other app file mentions it.

`NEXT_PUBLIC_*` values are baked into the build, so **redeploy** after you
change one.

The Locator sync runs on GitHub, not Vercel, so the repository needs two
**Actions secrets** (GitHub → Settings → Secrets and variables → Actions):
`NEXT_PUBLIC_SUPABASE_URL` (the hosted project URL) and `SUPABASE_SECRET_KEY`
(the same `service_role` key as Vercel). Nothing else; the sync does not use
the AI key.

**Why the legacy `service_role` key.** On the first deployment (16 October
2026) the project's new-format `sb_secret_…` key was rejected by the Auth
admin API ("Invalid API key") and by Storage ("Invalid Compact JWS"), while the
legacy `service_role` key worked everywhere. The server-only `SUPABASE_SECRET_KEY`
therefore holds the `service_role` key, and the seed uses it too. Supabase
plans to retire legacy keys; when you switch, test `/admin/accounts/new` and
the seed against the new key first. The public key is already the new
`sb_publishable_…` format, which works fine.

## 4. First run: seed production

The seed copies the original site's content and photos (from
`scripts/seed/content/` and `scripts/seed/assets/`) into the hosted project.
Run it once from the repo root after `supabase db push`. Values set in the
shell override `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SECRET_KEY=$(supabase projects api-keys --project-ref <ref> -o json | python3 -c "import json,sys; print(next(k['api_key'] for k in json.load(sys.stdin) if k['name']=='service_role'), end='')") \
SEED_ADMIN_EMAIL=sparc@studentorgs.suffolk.edu SEED_ADMIN_PASSWORD= npm run seed
```

The key is read straight from the CLI so it is never typed or shown. Leaving
`SEED_ADMIN_PASSWORD` empty makes the seed **generate a strong admin password**
and save it to `scripts/seed/.env.seed-admin` (gitignored, never printed); open
that file for the first sign-in, then change the password on
`/dashboard/profile` and delete the file. Set `SEED_ADMIN_PASSWORD` explicitly
only if you have a reason to.

The seed creates 12 member cards (6 on the E-Board), 3 projects, 3 events
with 3 recordings, 3 news items, 22 gallery photos (one featured), 6 links and
40 media rows. It compresses the photos to WebP: about 48 MB of originals
becomes about 8 MB. It also creates the shared e-board **admin** account from
`SEED_ADMIN_EMAIL`.

The seed is idempotent, so running it again only re-uploads the same files. It
never deletes anything, and an existing admin keeps its password.

Then sign in at `/login` with the admin email and password.

After the production seed has run, `scripts/seed/assets/` can be deleted in a
follow-up commit. The originals remain in git history.

## 5. Day to day

**Editing content.** Open the list in `/admin`, click a row, edit, then Save.
**Published** means the row is visible on the public site. Unpublished rows
are drafts that only editors see. Use the up/down buttons to set the order.
Delete asks for confirmation, and it can't be undone.

**Images.** Pick a JPEG, PNG or WebP file. The browser resizes and compresses
it before upload (2000 px full size and a 640 px thumbnail), so large phone
photos are fine. Alt text is required. **HEIC** photos from iPhones can't be
read by browsers, so export them as JPEG first (Share → Save as JPEG, or
Settings → Camera → Formats → Most Compatible).

**Creating accounts** (admin only): go to `/admin/accounts/new`.
- *Temporary password* is the default and works without email. The password is
  shown **once**. Copy it and give it to the person privately. They sign in
  at `/login` and change it on `/dashboard/profile`.
- *Send invite email* appears only when `AUTH_SMTP_CONFIGURED=true`.
- Link the account to an existing member card, or create a new card. A linked
  member can edit their own card's bio, nickname, website and photo from
  `/dashboard/profile`. They can't change their role, their order or the
  E-Board flag.

**Promoting an editor.** In `/admin/accounts`, change the role to *Editor*.
Editors manage all content and project requests, but they can't manage
accounts. *Admin* is meant for the shared e-board login.

**Resetting a password.** In `/admin/accounts`, open the row menu and choose
**Reset password**. A new temporary password is shown once. Once SMTP is set
up, people can also use "Forgot password" on `/login`.

**Project requests.** Any signed-in member can propose a project at
`/dashboard/projects/new`. They give a title, summary, description, kind,
methodology, proposed supervisor and an optional GitHub repo. While the
request is pending, the member can edit it or withdraw it from "My
requests" on `/dashboard` or from the project's page. Editors see pending requests at
`/admin/projects/requests`, and the sidebar shows how many are waiting.
- **Approve:** confirm or change the ref (the next free `SP-…` is suggested),
  the methodology and the supervisor. The project becomes *In progress*, gets
  a board with that methodology's template columns (Kanban, Scrumban, Scrum or
  SAFe), and the requester becomes its lead. The project is still unpublished
  on the public site, so publish it from `/admin/projects/<id>` when it's
  ready.
- **Decline:** add an optional reason. The project is archived. The member sees
  the decline and the reason once, in "My requests" on `/dashboard`.

Every member can view every board. Project members, the project's supervisor
and editors can edit it. The lead and editors add or remove members on the
board's Members tab.

**Locator** (`/admin/locator`, editors). Four lists the e-board keeps for
members: Internships (filter by Co-op, Semester part-time, Summer, Winter),
Conferences, Networking and Hackathons. Each row links to the posting or event
page. Add an item with **New**, or paste the posting URL into **Import from a
link** and let the club's AI fill the form; check every field before saving.
**Check my eligibility** on an item uses your own Locator profile
(`/admin/locator/profile`: major, year, skills, goals, availability) and
answers Eligible / Likely eligible / Unclear / Not eligible with reasons and a
1–5 career-fit score; the result is cached and shown on the list. Your Locator
profile is readable only by you. Use **Mark verified today** after you
re-check a listing; the seed data was verified on 16 October 2026 and events
with unannounced dates say so in their dates note. Load or refresh the
researched starter set with `npm run seed:locator` (it upserts by slug, so
edits to other fields survive).

**Hackathon details and who's going.** On a hackathon's edit page, fill in
**Signup opens** and **Signup closes** (the registration window; the event's
own dates stay in Starts / Ends), then **Hackathon details**: Team size
("1–4"), Prizes and What's provided (meals, travel, credits, mentors, swag),
as plain text from the event page. Members see these on the listing and can
press **I'm interested** or **I'm enrolling** with a short note ("looking for a
frontend teammate"); everyone signed in sees who is going, so teams form on
their own. The edit page's **Members interested** card lists those names (no
emails), and the list shows "3 interested" on the row. Members change only
their own interest; editors can't change it for them.

**Locator sync** (twice a day, automatic). A GitHub Actions workflow
(`.github/workflows/locator-sync.yml`) runs `npm run locator:sync` at 07:00 and
19:00 Boston time. It reads public job and event feeds listed in
`scripts/locator-sync/sources.json` (Greenhouse, Lever and Ashby job boards of
Boston employers, several Workday career sites, the SimplifyJobs internship
list, Devpost and MLH hackathons, Boston Meetup and Luma calendars, and the
Suffolk events calendars) and adds what it finds to Locator with the source
named on every row ("via Greenhouse", "via SimplifyJobs", …). New rows arrive
published and marked **Unreviewed** until an editor opens them and presses
**Mark reviewed**. Postings that disappear from their feed are marked
**Closed** and hidden, never deleted. The sync always refreshes a listing's
title, link, location, pay and dates; once an editor has saved a listing, its
summary, description, eligibility, tags and hackathon details are the
editor's and are left alone.
To add a company, add a line to `sources.json` (its README says how) and open a
pull request; to run the sync by hand, use the workflow's **Run workflow**
button on GitHub, or locally `npm run locator:sync -- --dry-run` first. The
overview page shows the last run and any failing source. LinkedIn, Indeed,
Handshake and Built In cannot be read automatically (terms or login), so they
stay as the "Search elsewhere" links on each list.

**Yearly handover.**
1. Sign in as the shared login and change its password on `/dashboard/profile`.
2. Review `/admin/accounts`. Demote graduates to *Member* (or unlink their
   cards) and promote the new editors.
3. Update the E-Board flags and the order in `/admin/members`.

## 6. Local development

You need Docker and Node 20+. This project's Supabase runs on ports
**55321–55329**, so it can sit beside other local Supabase projects.

```
npm install
npm run db:start          # supabase start; first run downloads images
cp .env.example .env.local  # then fill keys from: npx supabase status -o env
npm run db:reset          # recreate the local DB from supabase/migrations
npm run seed              # local content, photos and the admin login
npm run seed:locator      # the researched Locator starter set (scripts/seed/locator/*.json)
npm run locator:sync -- --dry-run   # fetch the live feeds and print what would change; drop --dry-run to write
npm run dev               # http://localhost:3000
```

- `npm run rls:check` proves the content rules (anon, member, editor, admin,
  storage, sign-up). `npm run rls:check-pm` proves the project-board rules
  (requests, approve/decline, board edits by members versus non-members,
  template columns). `npm run rls:check-locator` proves the Locator rules
  (editors write opportunities; Locator profiles and eligibility checks are
  own-row only). All three create throwaway users against the local database.
  Run them after you change a migration. Sign-in is rate-limited to 30 per
  5 minutes, so wait a few minutes if a run fails at sign-in.
- `npm run db:types` regenerates `lib/supabase/database.types.ts`.
- Studio (the database UI): http://127.0.0.1:55323. Local emails (invites,
  resets) go to Mailpit at http://127.0.0.1:55324, not to real inboxes.
- `./scripts/verify.sh` runs the style, secret-key and build gates.

**Developing from an external FAT32/exFAT drive.** Develop on an APFS volume
if you can. macOS writes `._*` AppleDouble files on these drives, and Next can
serve one of them as a cached image ("source image cannot be decoded"). It can
also confuse lint and git. `npm run dev` clears them from `.next` automatically.
If images or lint still misbehave, run `find .next -name '._*' -delete`.
Before git commands, run `find . -name '._*' -not -path './node_modules/*' -delete`.

## 7. Troubleshooting

| Symptom | Cause and fix |
|---|---|
| An error mentions `42501` / "permission denied" | A grant or RLS policy is missing for that table or role. Every table needs explicit `grant`s in its migration (new Supabase projects add none by default). Add them in a new migration, then `db push`. |
| "Email logins are disabled" | `[auth.email] enable_signup` (or the Email provider in the dashboard) was turned off. Turn it back on. Public sign-up is closed by "Allow new users to sign up" / `[auth] enable_signup = false` instead. |
| Images don't load (broken image or a 400 from `/_next/image`) | `NEXT_PUBLIC_SUPABASE_URL` doesn't match the host allowed in `next.config.ts` `images.remotePatterns` (it is read from the same variable at build time). Fix the env var and redeploy. Locally, see the FAT32 note above. |
| A member sees "You can view this board. Only project members can edit it." | Expected for anyone who isn't on the project. To let them edit, the project lead or an editor adds them on the board's Members tab (`/dashboard/projects/<id>`). Boards of requests that are still pending can't be edited by anyone until the request is approved. |
| Invite or reset emails never arrive | Custom SMTP isn't set up (section 2.7), or the email rate limit was hit. |
| The admin is locked out (forgot the password, no email) | From the repo, run `npm run admin:magic-link -- sparc@studentorgs.suffolk.edu` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SITE_URL` and `SUPABASE_SECRET_KEY` (the `service_role` key) set in the shell. It prints a one-time sign-in link; open it, then set a new password on `/dashboard/profile`. Works for any account. Too many failed sign-ins also trips a 30-per-5-minutes limit per IP; waiting five minutes clears that. |
| "Token has expired or is invalid" from an email link | The link was already used, or an email scanner opened it first. Send a new one, or use a temporary password. |
| The site is up but empty | The Free Supabase project paused. Restore it from the dashboard (section 2.8). |
| Locator says "AI checks need `ANTHROPIC_API_KEY`" | Set `ANTHROPIC_API_KEY` (and optionally `LOCATOR_AI_MODEL`) in Vercel for Production and Preview, then redeploy. The lists work without it; only the two AI features wait for the key. |
| The overview says a Locator sync source is failing, or a source returns nothing for days | The feed changed or is down (Workday, Devpost, MLH and Luma are undocumented endpoints). Open the failed run under GitHub → Actions → Locator sync for the error, try `npm run locator:sync -- --source <id> --dry-run` locally, and fix or disable that entry in `scripts/locator-sync/sources.json`. A failing source never closes listings. |
| A synced listing shows stale text after an editor fixed it | Expected: title, link, location, pay and dates always follow the feed. Everything else stays as the editor saved it. If the feed's title is wrong, unpublish the row or fix the source. |
| "The AI declined to assess this listing" or "Couldn't read that page" | The model refused (rare; try again or fill the form by hand), or the posting page blocks automated readers (LinkedIn and some job boards do). Paste the company's own careers page instead, or enter the fields manually. |
