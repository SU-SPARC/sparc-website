-- SPARC website — hackathon details and member interest (0005)
--
-- Hackathon listings gain the signup window, team size, prizes and what the
-- event provides, and members can say they are interested in, or enrolling
-- in, a listing so others can find teammates. See docs/LOCATOR.md,
-- "Hackathon details and member interest".
--
--   opportunities          gains opens_on, team_size, prizes, provided. All four
--                          are editor-owned: an editor's change stamps
--                          editor_edited_at (mark_editor_edit, extended here).
--   opportunity_interest   one row per (listing, person): 'interested' or
--                          'enrolled', with an optional note. Every signed-in
--                          user reads every row (that is how teammates find
--                          each other); each person writes only their own.
--
-- Same conventions as 0001/0003/0004: explicit grants after a revoke,
-- helpers in `private`, (select auth.uid()) in policies and triggers.

-- ─────────────────────────────────────────────────────────────────────────
-- opportunities: hackathon details
-- ─────────────────────────────────────────────────────────────────────────

alter table public.opportunities
  add column opens_on  date,
  add column team_size text,
  add column prizes    text,
  add column provided  text;

comment on column public.opportunities.opens_on is
  'Signup or registration opens. deadline_on is when it closes. Date-only; travels as YYYY-MM-DD.';
comment on column public.opportunities.team_size is 'Plain text: "1–4", "Solo or up to 5". Mostly hackathons.';
comment on column public.opportunities.prizes is 'Plain text: the prize pool and tracks as the organizer states them.';
comment on column public.opportunities.provided is 'Plain text: meals, travel reimbursement, cloud credits, mentors, swag, …';

-- Same body as 0004, plus opens_on, team_size, prizes and provided in the
-- editor-owned column list. Bookkeeping saves (published, verified_on,
-- reviewed_at, …) still do not stamp editor_edited_at.
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
    or new.opens_on         is distinct from old.opens_on
    or new.team_size        is distinct from old.team_size
    or new.prizes           is distinct from old.prizes
    or new.provided         is distinct from old.provided
  ) then
    new.editor_edited_at = now();
  end if;
  return new;
end;
$$;

comment on column public.opportunities.editor_edited_at is
  'Set by trigger whenever an editor saves the row through the session client. Once set, the sync stops overwriting summary, description, eligibility, tags, area, format, terms, dates_note, organizer_url, opens_on, team_size, prizes and provided.';

-- ─────────────────────────────────────────────────────────────────────────
-- opportunity_interest
-- ─────────────────────────────────────────────────────────────────────────

create table public.opportunity_interest (
  opportunity_id  uuid not null references public.opportunities (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  status          text not null check (status in ('interested', 'enrolled')),
  note            text check (note is null or length(note) <= 200),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (opportunity_id, profile_id)
);

comment on table public.opportunity_interest is
  'Who in the club is interested in, or enrolling in, a Locator listing (mostly hackathons), so members can form teams. Every signed-in user reads every row; each person writes only their own.';
comment on column public.opportunity_interest.status is '''interested'' (thinking about it) or ''enrolled'' (signed up or signing up).';
comment on column public.opportunity_interest.note is 'Optional, one line, ≤ 200 characters: "Looking for a frontend teammate."';

create trigger set_updated_at before update on public.opportunity_interest
  for each row execute function private.set_updated_at();

-- The primary key covers lookups by opportunity; this one covers "my rows"
-- and the profile cascade.
create index opportunity_interest_profile_idx on public.opportunity_interest (profile_id);

-- grants: signed-in users only; anon gets nothing.
revoke all on public.opportunity_interest from anon, authenticated;
grant select, insert, update, delete on public.opportunity_interest to authenticated;
grant all privileges on public.opportunity_interest to service_role;

alter table public.opportunity_interest enable row level security;

create policy "opportunity_interest: signed-in users read all" on public.opportunity_interest
  for select to authenticated
  using (true);
create policy "opportunity_interest: insert own" on public.opportunity_interest
  for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy "opportunity_interest: update own" on public.opportunity_interest
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
create policy "opportunity_interest: delete own" on public.opportunity_interest
  for delete to authenticated
  using (profile_id = (select auth.uid()));
