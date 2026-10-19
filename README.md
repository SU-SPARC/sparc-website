# SPARC website

The website of SPARC, the Suffolk Programming, AI & Research Club at Suffolk
University: public pages for the club (about, projects, events, join, links),
a members area with project boards, and an admin panel the e-board uses to
edit all content.

Live: https://sparc-su.vercel.app/

## Stack

- Next.js 16 (App Router) and React 19, Tailwind CSS 4, deployed on Vercel
- Supabase: Postgres with row-level security, Auth (email and password), and
  Storage for images
- TypeScript throughout; zod for form validation; sharp for the one-time seed

## Quick start

Requires Node 20+ and Docker (for the local Supabase stack).

```
npm install
npm run db:start                # local Supabase on ports 55321-55329
cp .env.example .env.local      # fill keys from: npx supabase status -o env
npm run seed                    # content, photos and the admin login
npm run dev                     # http://localhost:3000
```

## Docs

- [`docs/CMS.md`](docs/CMS.md): operations guide (hosted setup, Vercel,
  accounts, day-to-day editing, troubleshooting)
- [`scripts/locator-sync/README.md`](scripts/locator-sync/README.md): the
  scheduled Locator sync and how to add a source
- [`scripts/seed/README.md`](scripts/seed/README.md): the one-time content seed
