-- SPARC website — Locator sync (0004)
--
-- Scheduled ingestion of internships, hackathons and networking events from
-- machine-readable sources (Greenhouse, Lever, Ashby, Workday, SimplifyJobs,
-- Devpost, MLH, Meetup). See docs/LOCATOR-SYNC.md.
--
--   opportunities  gains source attribution (source_name, source_url,
--                  external_id), sync bookkeeping (posted_at, first/last
--                  seen, closed_at, reviewed_at) and editor_edited_at, set
--                  by a trigger whenever an editor saves the row.
--   sync_runs      one row per source per run; editors read, nobody else;
--                  only the service role writes.
--
-- Same conventions as 0001/0003: explicit grants after a revoke, helpers in
-- `private`, (select auth.uid()) in policies and triggers.

-- ─────────────────────────────────────────────────────────────────────────
-- opportunities: attribution and sync bookkeeping
-- ─────────────────────────────────────────────────────────────────────────

alter table public.opportunities
  add column source_name      text,
  add column source_url       text,
  add column external_id      text,
  add column posted_at        timestamptz,
  add column first_seen_at    timestamptz,
  add column last_seen_at     timestamptz,
  add column closed_at        timestamptz,
  add column reviewed_at      timestamptz,
  add column editor_edited_at timestamptz;

comment on column public.opportunities.source_name is
  'Where the row came from: "Greenhouse", "Lever", "Ashby", "Workday", "SimplifyJobs", "Devpost", "MLH", "Meetup", "Research (16 Oct 2026)", "Import", "Manual".';
comment on column public.opportunities.source_url is
  'Where the information was read from (the API or feed URL for sync rows, the research page for seeded rows). Not the posting link; that is url.';
comment on column public.opportunities.external_id is
  'Stable id at the source, e.g. greenhouse:<token>:<job id>. Sync rows only; unique per source_name.';
comment on column public.opportunities.posted_at is 'When the source says the listing was posted, for "new since" ordering.';
comment on column public.opportunities.first_seen_at is 'The first sync run that saw the listing.';
comment on column public.opportunities.last_seen_at is 'The latest sync run that saw the listing.';
comment on column public.opportunities.closed_at is
  'Set (with published = false) when a successful sync of the source no longer returns the listing; cleared if it comes back.';
comment on column public.opportunities.reviewed_at is 'An editor looked at this sync row ("Mark reviewed"). Never set by the sync.';
comment on column public.opportunities.editor_edited_at is
  'Set by trigger whenever an editor saves the row through the session client. Once set, the sync stops overwriting summary, description, eligibility, tags, area, format, terms, dates_note and organizer_url.';

alter table public.opportunities drop constraint opportunities_source_check;
alter table public.opportunities add constraint opportunities_source_check
  check (source in ('manual', 'seed', 'import', 'sync'));

create unique index opportunities_source_external_idx
  on public.opportunities (source_name, external_id) where external_id is not null;
create index opportunities_closed_idx on public.opportunities (kind, closed_at);

-- Editors edit through the session client (auth.uid() set); the sync and the
-- seed use the service role (auth.uid() null), which leaves the column alone.
-- Only a change to a column the editor owns counts: summary, description,
-- eligibility, tags, area, format, internship_terms, dates_note, organizer,
-- organizer_url, organizer_blurb. Bookkeeping saves (published, verified_on,
-- reviewed_at, …) do not stamp it, so they never freeze the sync's fields.
create or replace function private.mark_editor_edit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and (
       new.summary          is distinct from old.summary
    or new.description      is distinct from old.description
    or new.eligibility      is distinct from old.eligibility
    or new.tags             is distinct from old.tags
    or new.area             is distinct from old.area
    or new.format           is distinct from old.format
    or new.internship_terms is distinct from old.internship_terms
    or new.dates_note       is distinct from old.dates_note
    or new.organizer        is distinct from old.organizer
    or new.organizer_url    is distinct from old.organizer_url
    or new.organizer_blurb  is distinct from old.organizer_blurb
  ) then
    new.editor_edited_at = now();
  end if;
  return new;
end;
$$;

create trigger mark_editor_edit before update on public.opportunities
  for each row execute function private.mark_editor_edit();

-- Backfill attribution for the rows that exist today.
update public.opportunities set source_name = 'Research (16 Oct 2026)' where source = 'seed'   and source_name is null;
update public.opportunities set source_name = 'Import'                 where source = 'import' and source_name is null;
update public.opportunities set source_name = 'Manual'                 where source = 'manual' and source_name is null;

-- ─────────────────────────────────────────────────────────────────────────
-- sync_runs
-- ─────────────────────────────────────────────────────────────────────────

create table public.sync_runs (
  id           uuid primary key default gen_random_uuid(),
  source_id    text not null,
  adapter      text not null,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  fetched      int not null default 0,
  kept         int not null default 0,
  inserted     int not null default 0,
  updated      int not null default 0,
  closed       int not null default 0,
  ok           boolean not null default false,
  error        text,
  created_at   timestamptz not null default now()
);

comment on table public.sync_runs is
  'One row per source per `npm run locator:sync` run, with counts. Editors read; only the service role writes.';
comment on column public.sync_runs.source_id is 'The id of the source in scripts/locator-sync/sources.json.';
comment on column public.sync_runs.ok is 'False when the source failed; a failed run closes nothing.';

create index sync_runs_source_started_idx on public.sync_runs (source_id, started_at desc);

-- grants: editors read through RLS; no client writes. The service role gets
-- everything through the default privileges in 0001; granted again here so
-- the result does not depend on them.
revoke all on public.sync_runs from anon, authenticated;
grant select on public.sync_runs to authenticated;
grant all privileges on public.sync_runs to service_role;

alter table public.sync_runs enable row level security;

create policy "sync_runs: editors read" on public.sync_runs
  for select to authenticated
  using ((select private.is_editor()));
