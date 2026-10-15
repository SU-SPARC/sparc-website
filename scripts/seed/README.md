# Seed: repo content and photos into Supabase

One-time migration of the site's existing content into Supabase. It reads the
copies of the old content modules in `content/` (members, projects, events,
recordings, news) plus the home gallery and `/links` entries defined in
`index.ts`, compresses every photo from `public/` with sharp (`images.ts`: EXIF
orient, full ≤ 2000 px WebP q82, thumb ≤ 640 px q80, 24 px blur), uploads them to
the `media` bucket at fixed paths (`members/<slug>.webp`, `photos/<name>.webp`, …),
upserts the `media` rows and the content rows, and creates the shared e-board
admin account (`profiles.role = 'admin'`). It ends with a row count and a
before/after size table.

Env (read from `.env.local` or the shell): `NEXT_PUBLIC_SUPABASE_URL`,
`SUPABASE_SECRET_KEY`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`.

    npm run seed

Idempotent: rows are upserted on slug / path / url / media_id and uploads use
`upsert`, so re-running only re-uploads the same bytes. An existing admin user
keeps its password. It never deletes anything.

Hosted project (after `supabase db push`), from the repo root. Shell variables
win over `.env.local`:

    NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SECRET_KEY=sb_secret_... \
    SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm run seed
