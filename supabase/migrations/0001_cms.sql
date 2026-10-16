-- SPARC website — CMS schema (0001)
--
-- Supersedes supabase/schema.sql. That file assumed editing in the Supabase
-- table editor with "any authenticated user may write everything". Content is
-- now edited on the website itself, so access is decided here, by row-level
-- security keyed on a per-account role:
--
--   anon     reads published rows and public media
--   member   reads everything published (and every project, incl. requests);
--            edits a few columns of their OWN member card; requests projects
--   editor   all content CRUD and media upload
--   admin    everything an editor can, plus roles and account <-> card links
--
-- Conventions
--   * Every table lives in `public` with RLS on and EXPLICIT grants. Supabase
--     no longer grants new public tables to anon/authenticated by default; a
--     missing grant surfaces from PostgREST as 42501 "permission denied".
--     Each table first revokes everything from anon/authenticated so the
--     result is the same whatever default privileges the project has.
--   * Role helpers are SECURITY DEFINER functions in the `private` schema,
--     which is not exposed through the Data API. Policies always call them
--     wrapped in (select ...) so they are evaluated once per statement.
--   * Every policy uses (select auth.uid()), never bare auth.uid().
--   * created_at / updated_at on every table; updated_at kept by a trigger.
--   * Images are rows in `media` (paths into the public `media` bucket); other
--     tables reference media by id, never by URL.

-- ─────────────────────────────────────────────────────────────────────────
-- private schema + generic trigger
-- ─────────────────────────────────────────────────────────────────────────

create schema if not exists private;
grant usage on schema private to anon, authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- enums
-- ─────────────────────────────────────────────────────────────────────────

create type public.user_role       as enum ('member', 'editor', 'admin');
create type public.member_status   as enum ('current', 'alumni');
create type public.project_kind    as enum ('team', 'personal');
create type public.project_status  as enum ('proposed', 'in_progress', 'completed', 'archived');
create type public.methodology     as enum ('kanban', 'scrumban', 'scrum', 'safe');
create type public.supervisor_kind as enum ('faculty', 'student');

-- ─────────────────────────────────────────────────────────────────────────
-- media — the file registry, one row per uploaded image
-- ─────────────────────────────────────────────────────────────────────────

create table public.media (
  id             uuid primary key default gen_random_uuid(),
  bucket         text not null default 'media',
  path           text not null unique,
  thumb_path     text,
  width          int  not null check (width > 0),
  height         int  not null check (height > 0),
  bytes          int  check (bytes >= 0),
  mime           text,
  blur_data_url  text,
  alt            text not null default '',
  original_name  text,
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.media is
  'One row per uploaded image. Files live in the public `media` bucket and are never overwritten: every upload gets a fresh path, replacing an image creates a new row and object.';
comment on column public.media.path is
  'Object path inside the bucket: <kind>/<slug>-<8 hex>.<ext>, kind in members|projects|events|news|photos. Public URL = <SUPABASE_URL>/storage/v1/object/public/media/<path>.';
comment on column public.media.thumb_path is
  'Optional 640px variant: <kind>/<slug>-<8 hex>.thumb.<ext>. Null means use `path`.';
comment on column public.media.blur_data_url is
  '~24px data: URL used as the next/image blur placeholder.';
comment on column public.media.alt is
  'Alt text. Required by the uploader; empty string only for decorative images.';

-- ─────────────────────────────────────────────────────────────────────────
-- members
-- ─────────────────────────────────────────────────────────────────────────

create table public.members (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  nickname        text,
  photo_media_id  uuid references public.media (id) on delete set null,
  class_year      int  not null,
  status          public.member_status not null default 'current',

  role            text,
  role_term       text,
  role_history    text[] not null default '{}',

  badges          text[] not null default '{}',
  participated    int[]  not null default '{}',

  bio             text,
  linkedin        text,
  website         text,
  eboard          boolean not null default false,
  sort_order      int not null default 100,
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on table public.members is
  'Member cards on /about. A signed-in account may be linked to one card (profiles.member_id) and then edit nickname, photo, bio, linkedin and website on it.';
comment on column public.members.slug is 'Unique kebab-case id, e.g. kanan-guliyev. Used as a React key, not for routing.';
comment on column public.members.status is 'Sourced data (current | alumni). Never derived from class_year.';
comment on column public.members.role is 'Office held, e.g. President. Null = general member.';
comment on column public.members.role_term is 'Year of the office as displayed, e.g. 2026.';
comment on column public.members.badges is 'Free-form. Rendered values: founding, collegiatex.';
comment on column public.members.participated is 'Years participated, e.g. {2025,2026}.';
comment on column public.members.eboard is
  'E-Board flag. Replaces the old "sort_order < 100" convention; sort_order is only an ordering now.';
comment on column public.members.sort_order is 'Display order (ascending), ties broken by name.';

-- ─────────────────────────────────────────────────────────────────────────
-- profiles — one row per auth user
-- ─────────────────────────────────────────────────────────────────────────

create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text,
  display_name  text,
  role          public.user_role not null default 'member',
  member_id     uuid unique references public.members (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user, created by private.handle_new_user(). Clients may update display_name only; role and member_id change through admin_set_role / admin_link_member.';
comment on column public.profiles.member_id is 'The member card this account may edit (at most one account per card).';

-- ─────────────────────────────────────────────────────────────────────────
-- role helpers (SECURITY DEFINER so they read profiles without recursing
-- into its RLS; they only ever reveal facts about the caller)
-- ─────────────────────────────────────────────────────────────────────────

create function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create function private.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_user_role() in ('editor', 'admin'), false);
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(private.current_user_role() = 'admin', false);
$$;

create function private.own_member_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.member_id from public.profiles p where p.id = (select auth.uid());
$$;

-- New auth user -> profile row. Keep this trivial: if it throws, user
-- creation fails.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- projects
-- ─────────────────────────────────────────────────────────────────────────

create table public.projects (
  id                    uuid primary key default gen_random_uuid(),
  ref                   text not null unique,
  slug                  text not null unique,
  title                 text not null,
  kind                  public.project_kind   not null default 'team',
  status                public.project_status not null default 'proposed',
  term                  text not null,
  summary               text,
  highlights            text[] not null default '{}',
  cover_media_id        uuid references public.media (id) on delete set null,
  repo_url              text,
  live_url              text,
  sort_order            int not null default 100,
  methodology           public.methodology not null default 'kanban',
  supervisor_kind       public.supervisor_kind,
  supervisor_member_id  uuid references public.members (id) on delete set null,
  supervisor_name       text,
  requested_by          uuid references public.profiles (id) on delete set null,
  approved_by           uuid references public.profiles (id) on delete set null,
  approved_at           timestamptz,
  published             boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

comment on table public.projects is
  'Club projects. status = proposed is a pending request from a member; the public site shows only published rows that are not proposed.';
comment on column public.projects.ref is
  'Accession id shown on the page, e.g. SP-001. A request gets a temporary REQ-<6 hex> ref from the request form; an editor assigns the next SP-NNN on approval.';
comment on column public.projects.term is 'Display term, e.g. Spring 2025.';
comment on column public.projects.repo_url is 'The GitHub link. Wins over live_url on the public index.';
comment on column public.projects.sort_order is 'Display order (ascending); by convention follows ref.';
comment on column public.projects.supervisor_name is
  'Supervisor name for faculty, or for a student without a member card. When supervisor_member_id is set the card''s name wins.';

-- Requesters (non-editors) may only touch these columns while the project is
-- still proposed. The RLS policy decides WHICH rows; this decides WHICH columns.
create function private.guard_project_request_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;              -- service role / SQL editor
  end if;
  if private.is_editor() then
    return new;
  end if;
  if (to_jsonb(new) - array['title', 'slug', 'summary', 'highlights', 'methodology',
                            'repo_url', 'live_url', 'supervisor_kind', 'supervisor_name',
                            'updated_at'])
     is distinct from
     (to_jsonb(old) - array['title', 'slug', 'summary', 'highlights', 'methodology',
                            'repo_url', 'live_url', 'supervisor_kind', 'supervisor_name',
                            'updated_at'])
  then
    raise exception 'only title, slug, summary, highlights, methodology, links and supervisor of a request may be edited'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- project_gallery
-- ─────────────────────────────────────────────────────────────────────────

create table public.project_gallery (
  project_id  uuid not null references public.projects (id) on delete cascade,
  media_id    uuid not null references public.media (id) on delete cascade,
  sort_order  int not null default 100,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (project_id, media_id)
);

comment on table public.project_gallery is 'Ordered gallery images of a project (6–10 shots enable the strip layout).';

-- ─────────────────────────────────────────────────────────────────────────
-- events
-- ─────────────────────────────────────────────────────────────────────────

create table public.events (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,
  slug            text not null unique,
  title           text not null,
  kind            text not null,
  starts_at       timestamptz not null,
  location        text default '73 Tremont Room 8065',
  description     text,
  recording_url   text,
  cover_media_id  uuid references public.media (id) on delete set null,
  published       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

comment on column public.events.ref is 'Display id, e.g. #01. Editable; the admin form proposes the next one. Page order is by starts_at, never by ref.';
comment on column public.events.kind is 'Repo values: Development | Panel | Guest.';
comment on column public.events.starts_at is
  'An instant. The admin form takes a date and optional time in America/New_York; every formatter pins that zone.';

-- ─────────────────────────────────────────────────────────────────────────
-- recordings
-- ─────────────────────────────────────────────────────────────────────────

create table public.recordings (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  recorded_on  date not null,
  kind         text not null default 'Zoom Recording',
  url          text not null,
  description  text,
  event_id     uuid references public.events (id) on delete set null,
  sort_order   int not null default 100,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.recordings.recorded_on is 'Date-only; travels as YYYY-MM-DD end to end.';
comment on column public.recordings.event_id is 'Optional: the event this recording belongs to. Null when no event matches.';

-- ─────────────────────────────────────────────────────────────────────────
-- news
-- ─────────────────────────────────────────────────────────────────────────

create table public.news (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  title         text not null,
  published_on  date not null,
  media_id      uuid not null references public.media (id) on delete restrict,
  published     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.news is 'Home-page news cards. Every card links to /events; there is no detail page.';
comment on column public.news.published_on is 'Date-only; travels as YYYY-MM-DD end to end.';

-- ─────────────────────────────────────────────────────────────────────────
-- photos — the curated gallery
-- ─────────────────────────────────────────────────────────────────────────

create table public.photos (
  id          uuid primary key default gen_random_uuid(),
  media_id    uuid not null unique references public.media (id) on delete cascade,
  caption     text,
  taken_on    date,
  sort_order  int not null default 100,
  featured    boolean not null default false,
  published   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.photos is 'Curated gallery for the home photo strip.';
comment on column public.photos.featured is
  'The About page photo is the first published featured photo (falls back to the first gallery photo).';
comment on column public.photos.taken_on is 'Date-only; travels as YYYY-MM-DD end to end.';

-- ─────────────────────────────────────────────────────────────────────────
-- links — the /links page
-- ─────────────────────────────────────────────────────────────────────────

create table public.links (
  id           uuid primary key default gen_random_uuid(),
  label        text not null,
  url          text not null,
  description  text,
  icon         text,
  sort_order   int not null default 100,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on column public.links.icon is 'A lucide-react icon name, e.g. Github, MessageCircle.';

-- ─────────────────────────────────────────────────────────────────────────
-- members self-edit guard
-- ─────────────────────────────────────────────────────────────────────────

create function private.guard_member_self_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    return new;              -- service role / SQL editor
  end if;
  if private.is_editor() then
    return new;
  end if;
  if (to_jsonb(new) - array['nickname', 'photo_media_id', 'bio', 'linkedin', 'website', 'updated_at'])
     is distinct from
     (to_jsonb(old) - array['nickname', 'photo_media_id', 'bio', 'linkedin', 'website', 'updated_at'])
  then
    raise exception 'members may only edit nickname, photo, bio, linkedin and website on their own card'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger guard_member_self_edit
  before update on public.members
  for each row execute function private.guard_member_self_edit();

create trigger guard_project_request_edit
  before update on public.projects
  for each row execute function private.guard_project_request_edit();

-- updated_at triggers
create trigger set_updated_at before update on public.media           for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.members         for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.profiles        for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.projects        for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.project_gallery for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.events          for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.recordings      for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.news            for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.photos          for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.links           for each row execute function private.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- indexes (policy columns, ordering, foreign keys)
-- ─────────────────────────────────────────────────────────────────────────

create index media_created_by_idx          on public.media (created_by);
create index members_published_order_idx   on public.members (published, sort_order);
create index members_status_idx            on public.members (status, sort_order);
create index members_photo_idx             on public.members (photo_media_id);
create index profiles_role_idx             on public.profiles (role);
create index projects_published_status_idx on public.projects (published, status, sort_order);
create index projects_status_idx           on public.projects (status);
create index projects_requested_by_idx     on public.projects (requested_by);
create index projects_cover_idx            on public.projects (cover_media_id);
create index projects_supervisor_idx       on public.projects (supervisor_member_id);
create index project_gallery_media_idx     on public.project_gallery (media_id);
create index project_gallery_order_idx     on public.project_gallery (project_id, sort_order);
create index events_published_starts_idx   on public.events (published, starts_at);
create index events_starts_at_idx          on public.events (starts_at);
create index events_cover_idx              on public.events (cover_media_id);
create index recordings_published_idx      on public.recordings (published, recorded_on);
create index recordings_event_idx          on public.recordings (event_id);
create index news_published_idx            on public.news (published, published_on);
create index news_media_idx                on public.news (media_id);
create index photos_published_order_idx    on public.photos (published, sort_order);
create index links_published_order_idx     on public.links (published, sort_order);
-- profiles.member_id is indexed by its unique constraint.

-- ─────────────────────────────────────────────────────────────────────────
-- grants
-- ─────────────────────────────────────────────────────────────────────────

revoke all on public.media, public.members, public.profiles, public.projects,
              public.project_gallery, public.events, public.recordings,
              public.news, public.photos, public.links
  from anon, authenticated;

-- public content
grant select on public.media, public.members, public.projects, public.project_gallery,
                public.events, public.recordings, public.news, public.photos, public.links
  to anon, authenticated;
grant insert, update, delete on public.media, public.members, public.projects, public.project_gallery,
                                public.events, public.recordings, public.news, public.photos, public.links
  to authenticated;

-- profiles: read (RLS narrows to own row / admin), update display_name only.
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

-- service_role: everything, now and later (it bypasses RLS).
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
alter default privileges in schema public grant all privileges on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- row-level security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.media           enable row level security;
alter table public.members         enable row level security;
alter table public.profiles        enable row level security;
alter table public.projects        enable row level security;
alter table public.project_gallery enable row level security;
alter table public.events          enable row level security;
alter table public.recordings      enable row level security;
alter table public.news            enable row level security;
alter table public.photos          enable row level security;
alter table public.links           enable row level security;

-- profiles
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- media
create policy "media: read" on public.media
  for select to anon, authenticated
  using (true);
create policy "media: editors insert" on public.media
  for insert to authenticated
  with check ((select private.is_editor()));
create policy "media: linked member inserts own photo" on public.media
  for insert to authenticated
  with check (
    (select private.own_member_id()) is not null
    and path like 'members/%'
    and (thumb_path is null or thumb_path like 'members/%')
    and created_by = (select auth.uid())
  );
create policy "media: editors update" on public.media
  for update to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));
create policy "media: editors delete" on public.media
  for delete to authenticated
  using ((select private.is_editor()));

-- project_gallery
create policy "project_gallery: read" on public.project_gallery
  for select to anon, authenticated
  using (true);
create policy "project_gallery: editors insert" on public.project_gallery
  for insert to authenticated
  with check ((select private.is_editor()));
create policy "project_gallery: editors update" on public.project_gallery
  for update to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));
create policy "project_gallery: editors delete" on public.project_gallery
  for delete to authenticated
  using ((select private.is_editor()));

-- members, events, recordings, news, photos, links: published to everyone,
-- everything to editors.
do $$
declare
  t text;
begin
  foreach t in array array['members', 'events', 'recordings', 'news', 'photos', 'links'] loop
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (published = true)',
      t || ': read published', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select private.is_editor()))',
      t || ': editors read all', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_editor()))',
      t || ': editors insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_editor())) with check ((select private.is_editor()))',
      t || ': editors update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_editor()))',
      t || ': editors delete', t);
  end loop;
end;
$$;

-- members: a linked account edits its own card (columns limited by
-- private.guard_member_self_edit).
create policy "members: update own card" on public.members
  for update to authenticated
  using (id = (select private.own_member_id()))
  with check (id = (select private.own_member_id()));

-- projects
create policy "projects: anon reads public set" on public.projects
  for select to anon
  using (published and status <> 'proposed');
create policy "projects: signed-in read all" on public.projects
  for select to authenticated
  using (true);
create policy "projects: editors insert" on public.projects
  for insert to authenticated
  with check ((select private.is_editor()));
create policy "projects: members request" on public.projects
  for insert to authenticated
  with check (
    status = 'proposed'
    and published = false
    and requested_by = (select auth.uid())
    and approved_by is null
    and approved_at is null
  );
create policy "projects: editors update" on public.projects
  for update to authenticated
  using ((select private.is_editor()))
  with check ((select private.is_editor()));
create policy "projects: requester edits pending request" on public.projects
  for update to authenticated
  using (requested_by = (select auth.uid()) and status = 'proposed')
  with check (requested_by = (select auth.uid()) and status = 'proposed' and published = false);
create policy "projects: editors delete" on public.projects
  for delete to authenticated
  using ((select private.is_editor()));

-- ─────────────────────────────────────────────────────────────────────────
-- admin RPCs and the people view
-- ─────────────────────────────────────────────────────────────────────────

create function public.admin_set_role(target uuid, new_role public.user_role)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'only admins can change roles' using errcode = '42501';
  end if;
  if target = (select auth.uid()) and new_role <> 'admin' then
    raise exception 'admins cannot demote themselves' using errcode = '42501';
  end if;
  update public.profiles set role = new_role where id = target;
  if not found then
    raise exception 'no profile %', target using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.admin_set_role(uuid, public.user_role) is
  'Admin only. Sets profiles.role. Refuses to demote the caller (protects the shared e-board login from locking itself out).';

create function public.admin_link_member(target uuid, member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'only admins can link accounts to member cards' using errcode = '42501';
  end if;
  update public.profiles set member_id = member where id = target;
  if not found then
    raise exception 'no profile %', target using errcode = 'P0002';
  end if;
end;
$$;

comment on function public.admin_link_member(uuid, uuid) is
  'Admin only. Sets profiles.member_id (null unlinks). A card can be linked to at most one account.';

revoke execute on function public.admin_set_role(uuid, public.user_role) from public, anon;
revoke execute on function public.admin_link_member(uuid, uuid) from public, anon;
grant execute on function public.admin_set_role(uuid, public.user_role) to authenticated, service_role;
grant execute on function public.admin_link_member(uuid, uuid) to authenticated, service_role;

-- Every signed-in user may see who exists (assignee pickers) without seeing
-- emails or roles. Owner (definer) security on purpose: profiles RLS would
-- otherwise hide every row but the caller's.
create view public.people
with (security_invoker = false)
as
  select id, display_name, member_id from public.profiles;

comment on view public.people is 'id, display_name, member_id of every account; readable by every signed-in user.';

revoke all on public.people from public, anon, authenticated;
grant select on public.people to authenticated;
grant select on public.people to service_role;

-- private helpers: callable by signed-in users only (policies are `to
-- authenticated`; anon never needs them).
revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
grant execute on all functions in schema private to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- storage: one public bucket, `media`
-- ─────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 8388608,
        array['image/webp', 'image/jpeg', 'image/png', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- No anon SELECT policy: public URLs need none, and one would allow listing.
create policy "media bucket: editors select" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select private.is_editor()));
create policy "media bucket: editors insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select private.is_editor()));
create policy "media bucket: editors update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select private.is_editor()))
  with check (bucket_id = 'media' and (select private.is_editor()));
create policy "media bucket: editors delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select private.is_editor()));
create policy "media bucket: linked member uploads own photo" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = 'members'
    and (select private.own_member_id()) is not null
  );
