-- SPARC website — externships (0007)
--
-- The Jobs list (kind 'internship') gains a fourth job type: an externship, a
-- short shadowing or project placement of days to a few weeks. The list was
-- renamed from Internships to Jobs in the app at the same time
-- (lib/data/locator.ts); that is a label and URL change only, so the
-- opportunity_kind value stays 'internship' and nothing here touches it.
--
--   job_type           gains 'externship'. Postgres does not allow a new enum
--                      value to be used in the transaction that adds it, so
--                      nothing below uses it: the editor, the seed and the
--                      sync (from the title) write it.
--
-- Same conventions as 0001/0003/0004/0005/0006.

-- ─────────────────────────────────────────────────────────────────────────
-- job_type: externship
-- ─────────────────────────────────────────────────────────────────────────

alter type public.job_type add value if not exists 'externship';

comment on column public.opportunities.job_type is
  'Job listings (kind internship) only: internship, co-op, externship or new-grad role. Set by the editor, the seed or the sync (from the title). The other kinds keep the default and ignore it.';
