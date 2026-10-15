# Running the SPARC website CMS

This guide is for e-board members who look after the website. You don't need
to have read the code. The design is explained in `docs/ARCHITECTURE.md`.

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
   npx supabase db push        # applies supabase/migrations/0001_cms.sql and 0002_project_management.sql
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
| `SUPABASE_SECRET_KEY` | `sb_secret_…` | **server only** |
| `AUTH_SMTP_CONFIGURED` | `false`, then `true` after step 2.7 | server only |

`SUPABASE_SECRET_KEY` bypasses every security rule. The site uses it in one
place only: the admin's account actions (create an account, reset a password)
and reading a member's own hidden card. Never give it a `NEXT_PUBLIC_`
prefix, and never paste it into chat or an issue. `scripts/verify.sh` fails if
any other app file mentions it.

`NEXT_PUBLIC_*` values are baked into the build, so **redeploy** after you
change one.

## 4. First run: seed production

The seed copies the original site's content and photos (from
`scripts/seed/content/` and `scripts/seed/assets/`) into the hosted project.
Run it once from the repo root after `supabase db push`. Values set in the
shell override `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=sb_secret_... \
SEED_ADMIN_EMAIL=sparc@studentorgs.suffolk.edu SEED_ADMIN_PASSWORD='<a strong password>' npm run seed
```

The seed creates 12 member cards (6 on the E-Board), 3 projects, 3 events
with 3 recordings, 3 news items, 22 gallery photos (one featured), 6 links and
40 media rows. It compresses the photos to WebP: about 48 MB of originals
becomes about 8 MB. It also creates the shared e-board **admin** account from
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

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

**Project requests.** Members request a project at `/dashboard/projects/new`.
Editors review requests at `/admin/projects/requests`. Approving a request
creates the project's board from its methodology template and assigns the
supervisor. Members see the status of their requests on `/dashboard`.

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
npm run dev               # http://localhost:3000
```

- `npm run rls:check` and `npm run rls:check-pm` prove the security rules
  against the local database. Run them after you change a migration.
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
| A member sees "You can view this board" | They can read every board but edit only the boards of projects they belong to. Add them to the project's members on its board (`/dashboard/projects/<id>`, as an editor). |
| Invite or reset emails never arrive | Custom SMTP isn't set up (section 2.7), or the email rate limit was hit. |
| "Token has expired or is invalid" from an email link | The link was already used, or an email scanner opened it first. Send a new one, or use a temporary password. |
| The site is up but empty | The Free Supabase project paused. Restore it from the dashboard (section 2.8). |
