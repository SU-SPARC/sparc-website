-- SPARC — content tables
--
-- Design constraint: the e-board turns over every May and edits through
-- Supabase's own table editor. No custom CMS, no admin UI to maintain.
-- That means: readable column names, sensible defaults, and arrays for
-- anything that might grow, so adding a badge never needs a migration.

create extension if not exists "pgcrypto";

-- ── members ────────────────────────────────────────────────────────────

create type member_status as enum ('current', 'alumni');

create table members (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,          -- 'kanan-guliyev'
  name          text not null,
  nickname      text,                          -- 'Monty'
  photo         text,                          -- '/images/kanan.webp'
  class_year    int  not null,
  status        member_status not null default 'current',

  role          text,                          -- 'President'; null = general member
  role_term     text,                          -- '2026–27'
  role_history  text[] not null default '{}',  -- {'Founding Member'}

  -- Free-form so a new badge is a data change, not a schema change.
  -- Known values: 'founding', 'collegiatex'
  badges        text[] not null default '{}',
  -- Years participated: {2025, 2026}
  participated  int[]  not null default '{}',

  bio           text,
  linkedin      text,
  website       text,
  sort_order    int not null default 100,      -- e-board first, then alphabetical
  created_at    timestamptz not null default now()
);

create index members_status_idx on members (status, sort_order);

-- ── projects ───────────────────────────────────────────────────────────

create type project_kind   as enum ('team', 'personal');
create type project_status as enum ('completed', 'in_progress', 'archived');

create table projects (
  id          uuid primary key default gen_random_uuid(),
  ref         text unique not null,            -- 'SP-001' — accession id, shown on the page
  slug        text unique not null,
  title       text not null,
  kind        project_kind   not null default 'team',
  status      project_status not null default 'completed',
  term        text not null,                   -- 'Spring 2025'
  summary     text,
  highlights  text[] not null default '{}',
  cover       text,                            -- hover preview on the index
  gallery     text[] not null default '{}',    -- 6–10 shots enable the strip layout
  repo_url    text,
  live_url    text,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now()
);

create index projects_kind_idx on projects (kind, sort_order);

-- ── events ─────────────────────────────────────────────────────────────

create table events (
  id           uuid primary key default gen_random_uuid(),
  ref          text unique not null,           -- '#01'
  slug         text unique not null,
  title        text not null,
  kind         text not null,                  -- 'Development' | 'Panel' | 'Guest Lecture'
  starts_at    timestamptz not null,           -- upcoming vs past is derived from this,
                                               -- never from a hardcoded term string
  location     text default '73 Tremont, Room 8065',
  description  text,
  recording_url text,
  created_at   timestamptz not null default now()
);

create index events_starts_at_idx on events (starts_at desc);

-- ── access ─────────────────────────────────────────────────────────────
-- Public site reads with the anon key. Writes happen in the Supabase
-- table editor as an authenticated user. Nothing on the site writes.

alter table members  enable row level security;
alter table projects enable row level security;
alter table events   enable row level security;

create policy "public read" on members  for select using (true);
create policy "public read" on projects for select using (true);
create policy "public read" on events   for select using (true);

create policy "authenticated write" on members
  for all to authenticated using (true) with check (true);
create policy "authenticated write" on projects
  for all to authenticated using (true) with check (true);
create policy "authenticated write" on events
  for all to authenticated using (true) with check (true);

-- ── seed ───────────────────────────────────────────────────────────────
-- DELIBERATELY EMPTY.
--
-- The previous seed was reconstructed from memory rather than read from the
-- repo. It contained three wrong LinkedIn URLs, one missing, four truncated
-- bios, and a founding-member badge nobody claimed. It also dropped three
-- live Zoom recording links.
--
-- Source of truth is the repo: app/team/page.tsx, app/events/page.tsx,
-- app/projects/page.tsx. Populate lib/content/*.ts from those, then export
-- to SQL from the working data — never the other way round.
--
-- Unknown and not to be guessed: which members did the CollegiateX
-- internship, and which years each person participated.
