-- SPARC website — Locator (0003)
--
-- Internships, conferences, networking events and hackathons the e-board
-- collects for members (/admin/locator), each person's own Locator profile
-- and cached AI eligibility verdicts. See docs/LOCATOR.md.
--
--   opportunities       published rows to everyone (no public page in v1),
--                       everything to editors; editors write.
--   career_profiles     own row only, for every role. Editors and admins
--                       cannot read anyone else's profile.
--   eligibility_checks  own rows only, for every role.
--
-- Same conventions as 0001: explicit grants after a revoke, helpers in
-- `private`, (select auth.uid()) in policies, created_at / updated_at.

-- ─────────────────────────────────────────────────────────────────────────
-- enums
-- ─────────────────────────────────────────────────────────────────────────

create type public.opportunity_kind    as enum ('internship', 'conference', 'networking', 'hackathon');
create type public.internship_term     as enum ('coop', 'semester_part_time', 'summer', 'winter');
create type public.opportunity_area    as enum ('suffolk', 'boston', 'outside_boston', 'online');
create type public.opportunity_format  as enum ('in_person', 'online', 'hybrid');
create type public.eligibility_verdict as enum ('eligible', 'likely', 'unclear', 'not_eligible');

-- ─────────────────────────────────────────────────────────────────────────
-- tables
-- ─────────────────────────────────────────────────────────────────────────

create table public.opportunities (
  id                uuid primary key default gen_random_uuid(),
  kind              public.opportunity_kind not null,
  slug              text not null unique,
  title             text not null check (length(trim(title)) > 0),
  organizer         text not null check (length(trim(organizer)) > 0),
  organizer_url     text,
  organizer_blurb   text,
  url               text not null,
  posting_site      text,
  summary           text,
  description       text,
  area              public.opportunity_area not null default 'boston',
  format            public.opportunity_format not null default 'in_person',
  location          text,
  starts_on         date,
  ends_on           date,
  deadline_on       date,
  dates_note        text,
  internship_terms  public.internship_term[] not null default '{}',
  pay               text,
  eligibility       text,
  tags              text[] not null default '{}',
  source            text not null default 'manual' check (source in ('manual', 'seed', 'import')),
  verified_on       date,
  published         boolean not null default true,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  check (starts_on is null or ends_on is null or ends_on >= starts_on)
);

comment on table public.opportunities is
  'Locator listings: internships, conferences, networking events and hackathons, curated by editors. One table, split by kind.';
comment on column public.opportunities.internship_terms is 'Internships only; empty for the other kinds.';
comment on column public.opportunities.tags is 'Lowercase: ai, ieee, startups, …';
comment on column public.opportunities.created_by is
  'Set by the server action from the session user; null for seeded rows (no column default).';
comment on column public.opportunities.verified_on is 'When an editor last checked the listing. Date-only; travels as YYYY-MM-DD.';

create table public.career_profiles (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  major               text,
  minor               text,
  degree_level        text not null default 'undergrad' check (degree_level in ('undergrad', 'grad', 'other')),
  expected_grad_year  int check (expected_grad_year between 2020 and 2040),
  skills              text[] not null default '{}',
  interests           text[] not null default '{}',
  goals               text,
  constraints         text,
  work_auth           text not null default 'prefer_not_to_say'
                      check (work_auth in ('us_citizen_or_pr', 'needs_sponsorship', 'international_cpt_opt', 'prefer_not_to_say')),
  updated_at          timestamptz not null default now()
);

comment on table public.career_profiles is
  'One row per account: the person''s own Locator profile, read by the AI eligibility check. Readable only by its owner (not even admins).';

create table public.eligibility_checks (
  opportunity_id  uuid not null references public.opportunities (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  verdict         public.eligibility_verdict not null,
  confidence      text not null check (confidence in ('low', 'medium', 'high')),
  reasons         text[] not null default '{}',
  blockers        text[] not null default '{}',
  unknowns        text[] not null default '{}',
  next_steps      text[] not null default '{}',
  fit_score       int check (fit_score between 1 and 5),
  fit_note        text,
  model           text not null,
  inputs_hash     text not null,
  checked_at      timestamptz not null default now(),
  primary key (opportunity_id, profile_id)
);

comment on table public.eligibility_checks is
  'Cached AI verdicts, one per (opportunity, person). Own rows only.';
comment on column public.eligibility_checks.inputs_hash is
  'First 16 hex of sha256(opportunity.updated_at | career_profile.updated_at | model); a mismatch means the check is stale.';

-- updated_at triggers
create trigger set_updated_at before update on public.opportunities   for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.career_profiles for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- indexes
-- ─────────────────────────────────────────────────────────────────────────

create index opportunities_kind_published_idx on public.opportunities (kind, published);
create index opportunities_kind_deadline_idx  on public.opportunities (kind, deadline_on);
create index opportunities_kind_starts_idx    on public.opportunities (kind, starts_on);
create index opportunities_created_by_idx     on public.opportunities (created_by);
create index eligibility_checks_profile_idx   on public.eligibility_checks (profile_id);
-- opportunities.slug is indexed by its unique constraint.

-- ─────────────────────────────────────────────────────────────────────────
-- grants
-- ─────────────────────────────────────────────────────────────────────────

revoke all on public.opportunities, public.career_profiles, public.eligibility_checks
  from anon, authenticated;

grant select on public.opportunities to anon, authenticated;
grant insert, update, delete on public.opportunities to authenticated;
grant select, insert, update, delete on public.career_profiles, public.eligibility_checks to authenticated;

grant all privileges on public.opportunities, public.career_profiles, public.eligibility_checks
  to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- row-level security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.opportunities      enable row level security;
alter table public.career_profiles    enable row level security;
alter table public.eligibility_checks enable row level security;

-- opportunities: same two read policies and editor writes as the content tables.
create policy "opportunities: read published" on public.opportunities
  for select to anon, authenticated
  using (published = true);
create policy "opportunities: editors read all" on public.opportunities
  for select to authenticated
  using ((select private.is_editor()));
create policy "opportunities: editors insert" on public.opportunities
  for insert to authenticated
  with check ((select private.is_editor()));
create policy "opportunities: editors update" on public.opportunities
  for update to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));
create policy "opportunities: editors delete" on public.opportunities
  for delete to authenticated
  using ((select private.is_editor()));

-- career_profiles + eligibility_checks: own rows only, whatever the role.
do $$
declare
  t text;
begin
  foreach t in array array['career_profiles', 'eligibility_checks'] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (profile_id = (select auth.uid()))',
      t || ': read own', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (profile_id = (select auth.uid()))',
      t || ': insert own', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (profile_id = (select auth.uid())) with check (profile_id = (select auth.uid()))',
      t || ': update own', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (profile_id = (select auth.uid()))',
      t || ': delete own', t);
  end loop;
end;
$$;
