-- SPARC website — job types and seasons (0006)
--
-- The Internships list becomes a jobs list: every internship-kind listing
-- says whether it is an internship, a co-op or a new-grad role, and the
-- term enum gains the two school-year seasons. See docs/DESIGN-BRIEF.md §17
-- and docs/LOCATOR.md, "List screen".
--
--   job_type           new enum and column on opportunities, default
--                      'internship'. Rows whose terms already say 'coop' are
--                      backfilled to 'coop'. Editor-owned: an editor's change
--                      stamps editor_edited_at (mark_editor_edit, extended
--                      here), and the sync then stops overwriting it.
--   internship_term    gains 'spring' and 'fall'. Postgres does not allow a
--                      new enum value to be used in the transaction that adds
--                      it, so nothing below uses them.
--
-- Same conventions as 0001/0003/0004/0005.

-- ─────────────────────────────────────────────────────────────────────────
-- opportunities: job type
-- ─────────────────────────────────────────────────────────────────────────

create type public.job_type as enum ('internship', 'coop', 'new_grad');

alter table public.opportunities
  add column job_type public.job_type not null default 'internship';

comment on column public.opportunities.job_type is
  'Internship-kind listings only: internship, co-op or new-grad role. Set by the editor, the seed or the sync (from the title). The other kinds keep the default and ignore it.';

update public.opportunities
set job_type = 'coop'
where 'coop' = any (internship_terms);

-- ─────────────────────────────────────────────────────────────────────────
-- internship_term: the two school-year seasons
-- ─────────────────────────────────────────────────────────────────────────

alter type public.internship_term add value if not exists 'spring';
alter type public.internship_term add value if not exists 'fall';

-- ─────────────────────────────────────────────────────────────────────────
-- editor ownership
-- ─────────────────────────────────────────────────────────────────────────

-- Same body as 0005, plus job_type in the editor-owned column list.
-- Bookkeeping saves (published, verified_on, reviewed_at, …) still do not
-- stamp editor_edited_at.
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
    or new.job_type         is distinct from old.job_type
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
  'Set by trigger whenever an editor saves the row through the session client. Once set, the sync stops overwriting summary, description, eligibility, tags, area, format, terms, job_type, dates_note, organizer_url, opens_on, team_size, prizes and provided.';
