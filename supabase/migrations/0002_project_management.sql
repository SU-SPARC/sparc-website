-- SPARC website — project management (0002)
--
-- Boards for approved projects: members, columns (from a methodology
-- template), tasks, sprints / iterations and an activity timeline.
--
--   read     every signed-in account reads every board (members are a small
--            club; boards are not secret). anon reads nothing here.
--   write    columns, sprints, tasks: project members, the project's
--            supervisor (when linked to a member card) and editors
--            (private.is_project_member). Membership rows: the project's
--            leads and editors. Activity: written by triggers; editors may
--            delete rows, nobody updates them.
--   requests a member requests a project (0001), may withdraw it while it is
--            still proposed (here), and an editor approves or declines it
--            through two RPCs that build the board.
--
-- Same conventions as 0001: explicit grants after a revoke, helpers in
-- `private`, (select auth.uid()) in policies, created_at / updated_at.

-- ─────────────────────────────────────────────────────────────────────────
-- enum + projects additions
-- ─────────────────────────────────────────────────────────────────────────

create type public.task_priority as enum ('low', 'medium', 'high', 'urgent');

alter table public.projects
  add column declined_at    timestamptz,
  add column decline_reason text;

comment on column public.projects.declined_at is
  'Set by decline_project_request(); a declined request is archived, not deleted, so the requester can see the reason.';

-- ─────────────────────────────────────────────────────────────────────────
-- tables
-- ─────────────────────────────────────────────────────────────────────────

create table public.project_members (
  project_id  uuid not null references public.projects (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  role        text not null default 'member' check (role in ('lead', 'member')),
  joined_at   timestamptz not null default now(),
  primary key (project_id, profile_id)
);

comment on table public.project_members is
  'Who works on a project. Leads (and editors) add and remove members. The supervisor is not a row here; see projects.supervisor_*.';

create table public.project_sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  goal        text,
  starts_on   date,
  ends_on     date,
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, project_id),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

comment on table public.project_sprints is
  'Sprints (Scrum, Scrumban) or iterations (SAFe). SAFe names them "PI 2 · Iteration 3"; the UI groups by the "PI n" prefix.';
comment on column public.project_sprints.starts_on is 'Date-only; travels as YYYY-MM-DD end to end.';

create table public.project_columns (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  name        text not null check (length(trim(name)) > 0),
  position    int not null default 0,
  wip_limit   int check (wip_limit is null or wip_limit > 0),
  is_done     boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, project_id)
);

comment on table public.project_columns is
  'Board columns, created from the methodology template on approval. Tasks in an is_done column count as completed.';

create table public.project_tasks (
  id                   uuid primary key default gen_random_uuid(),
  project_id           uuid not null references public.projects (id) on delete cascade,
  column_id            uuid not null,
  sprint_id            uuid,
  title                text not null check (length(trim(title)) > 0),
  description          text,
  priority             public.task_priority not null default 'medium',
  points               int check (points is null or points >= 0),
  assignee_profile_id  uuid references public.profiles (id) on delete set null,
  due_on               date,
  github_url           text,
  position             int not null default 0,
  created_by           uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  completed_at         timestamptz,
  -- A task's column and sprint must belong to the task's own project.
  foreign key (column_id, project_id)
    references public.project_columns (id, project_id) on delete cascade,
  foreign key (sprint_id, project_id)
    references public.project_sprints (id, project_id) on delete set null (sprint_id)
);

comment on column public.project_tasks.position is 'Order inside its column (ascending). Renumbered 0..n-1 by moveTask.';
comment on column public.project_tasks.completed_at is
  'Set by trigger when the task enters an is_done column, cleared when it leaves.';
comment on column public.project_tasks.due_on is 'Date-only; travels as YYYY-MM-DD end to end.';

create table public.project_activity (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  task_id           uuid references public.project_tasks (id) on delete set null,
  actor_profile_id  uuid default auth.uid() references public.profiles (id) on delete set null,
  action            text not null,
  detail            jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now()
);

comment on table public.project_activity is
  'Board timeline. Written by triggers (task_created, task_moved, task_completed, task_edited, task_deleted, member_added, member_removed, sprint_created) and the approve/decline RPCs. detail stays small: {title, from, to, field, name}.';

-- ─────────────────────────────────────────────────────────────────────────
-- helpers
-- ─────────────────────────────────────────────────────────────────────────

create function private.is_project_member(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1 from public.project_members m
      where m.project_id = p and m.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.projects pr
      where pr.id = p
        and pr.supervisor_member_id is not null
        and pr.supervisor_member_id = private.own_member_id()
    )
    or private.is_editor();
$$;

comment on function private.is_project_member(uuid) is
  'Caller is on the project, is its supervisor (linked member card), or is an editor.';

create function private.is_project_lead(p uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p and m.profile_id = (select auth.uid()) and m.role = 'lead'
  );
$$;

-- Requests (status = proposed) keep 0001's rule: the requester edits the
-- request columns. Approved projects: members edit the public description
-- columns only. Editors and the service role are unrestricted.
create or replace function private.guard_project_request_edit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  allowed text[];
begin
  if (select auth.uid()) is null then
    return new;              -- service role / SQL editor
  end if;
  if private.is_editor() then
    return new;
  end if;
  if old.status = 'proposed' then
    allowed := array['title', 'slug', 'summary', 'highlights', 'methodology',
                     'repo_url', 'live_url', 'supervisor_kind', 'supervisor_name',
                     'updated_at'];
  else
    allowed := array['summary', 'highlights', 'repo_url', 'live_url', 'cover_media_id', 'updated_at'];
  end if;
  if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
    if old.status = 'proposed' then
      raise exception 'only title, slug, summary, highlights, methodology, links and supervisor of a request may be edited'
        using errcode = '42501';
    else
      raise exception 'project members may only edit the summary, highlights, links and cover'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- triggers: completed_at, updated_at, activity
-- ─────────────────────────────────────────────────────────────────────────

create function private.task_set_completed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  done boolean;
begin
  if tg_op = 'UPDATE' and new.column_id is not distinct from old.column_id then
    return new;
  end if;
  select c.is_done into done from public.project_columns c where c.id = new.column_id;
  if coalesce(done, false) then
    new.completed_at := coalesce(case when tg_op = 'UPDATE' then old.completed_at end, now());
  else
    new.completed_at := null;
  end if;
  return new;
end;
$$;

create trigger task_set_completed
  before insert or update of column_id on public.project_tasks
  for each row execute function private.task_set_completed();

create trigger set_updated_at before update on public.project_tasks   for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.project_sprints for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.project_columns for each row execute function private.set_updated_at();

create function private.log_activity(p uuid, t uuid, act text, det jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Skip when the project itself is being deleted (cascade).
  if not exists (select 1 from public.projects where id = p) then
    return;
  end if;
  insert into public.project_activity (project_id, task_id, actor_profile_id, action, detail)
  values (p, t, (select auth.uid()), act, jsonb_strip_nulls(det));
end;
$$;

create function private.column_name(c uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select name from public.project_columns where id = c;
$$;

create function private.task_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_done boolean;
  old_done boolean;
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.project_id, new.id, 'task_created',
      jsonb_build_object('title', new.title, 'to', private.column_name(new.column_id)));
    return new;
  end if;

  if tg_op = 'DELETE' then
    if not exists (select 1 from public.project_columns where id = old.column_id) then
      return old;            -- column (or project) going away; no per-task noise
    end if;
    perform private.log_activity(old.project_id, null, 'task_deleted',
      jsonb_build_object('title', old.title));
    return old;
  end if;

  -- UPDATE
  if new.column_id is distinct from old.column_id then
    select is_done into new_done from public.project_columns where id = new.column_id;
    select is_done into old_done from public.project_columns where id = old.column_id;
    perform private.log_activity(new.project_id, new.id,
      case when coalesce(new_done, false) and not coalesce(old_done, false) then 'task_completed' else 'task_moved' end,
      jsonb_build_object('title', new.title,
                         'from', private.column_name(old.column_id),
                         'to', private.column_name(new.column_id)));
  end if;
  if new.title is distinct from old.title then
    perform private.log_activity(new.project_id, new.id, 'task_edited',
      jsonb_build_object('title', new.title, 'field', 'title', 'from', old.title, 'to', new.title));
  end if;
  if new.assignee_profile_id is distinct from old.assignee_profile_id then
    perform private.log_activity(new.project_id, new.id, 'task_edited',
      jsonb_build_object('title', new.title, 'field', 'assignee',
        'from', (select coalesce(display_name, 'someone') from public.profiles where id = old.assignee_profile_id),
        'to',   (select coalesce(display_name, 'someone') from public.profiles where id = new.assignee_profile_id)));
  end if;
  if new.priority is distinct from old.priority then
    perform private.log_activity(new.project_id, new.id, 'task_edited',
      jsonb_build_object('title', new.title, 'field', 'priority', 'from', old.priority, 'to', new.priority));
  end if;
  if new.due_on is distinct from old.due_on then
    perform private.log_activity(new.project_id, new.id, 'task_edited',
      jsonb_build_object('title', new.title, 'field', 'due', 'from', old.due_on, 'to', new.due_on));
  end if;
  if new.sprint_id is distinct from old.sprint_id then
    perform private.log_activity(new.project_id, new.id, 'task_edited',
      jsonb_build_object('title', new.title, 'field', 'sprint',
        'from', (select name from public.project_sprints where id = old.sprint_id),
        'to',   (select name from public.project_sprints where id = new.sprint_id)));
  end if;
  return new;
end;
$$;

create trigger task_activity
  after insert or update or delete on public.project_tasks
  for each row execute function private.task_activity();

create function private.member_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.project_members;
begin
  r := case when tg_op = 'DELETE' then old else new end;
  perform private.log_activity(r.project_id, null,
    case when tg_op = 'DELETE' then 'member_removed' else 'member_added' end,
    jsonb_build_object(
      'name', (select coalesce(display_name, email) from public.profiles where id = r.profile_id),
      'profile_id', r.profile_id,
      'role', r.role));
  return r;
end;
$$;

create trigger member_activity
  after insert or delete on public.project_members
  for each row execute function private.member_activity();

create function private.sprint_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_activity(new.project_id, null, 'sprint_created', jsonb_build_object('name', new.name));
  return new;
end;
$$;

create trigger sprint_activity
  after insert on public.project_sprints
  for each row execute function private.sprint_activity();

-- ─────────────────────────────────────────────────────────────────────────
-- indexes
-- ─────────────────────────────────────────────────────────────────────────

create index project_tasks_board_idx       on public.project_tasks (project_id, column_id, position);
create index project_tasks_assignee_idx    on public.project_tasks (assignee_profile_id);
create index project_tasks_sprint_idx      on public.project_tasks (sprint_id);
create index project_tasks_column_idx      on public.project_tasks (column_id, project_id);
create index project_tasks_created_by_idx  on public.project_tasks (created_by);
create index project_activity_project_idx  on public.project_activity (project_id, created_at desc);
create index project_activity_task_idx     on public.project_activity (task_id);
create index project_activity_actor_idx    on public.project_activity (actor_profile_id);
create index project_members_profile_idx   on public.project_members (profile_id);
create index project_columns_project_idx   on public.project_columns (project_id, position);
create index project_sprints_project_idx   on public.project_sprints (project_id, position);

-- ─────────────────────────────────────────────────────────────────────────
-- grants
-- ─────────────────────────────────────────────────────────────────────────

revoke all on public.project_members, public.project_sprints, public.project_columns,
              public.project_tasks, public.project_activity
  from anon, authenticated;

grant select on public.project_members, public.project_sprints, public.project_columns,
                public.project_tasks, public.project_activity
  to authenticated;
grant insert, update, delete on public.project_members, public.project_sprints,
                                public.project_columns, public.project_tasks
  to authenticated;
grant insert, delete on public.project_activity to authenticated;

grant all privileges on public.project_members, public.project_sprints, public.project_columns,
                        public.project_tasks, public.project_activity
  to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- row-level security
-- ─────────────────────────────────────────────────────────────────────────

alter table public.project_members  enable row level security;
alter table public.project_sprints  enable row level security;
alter table public.project_columns  enable row level security;
alter table public.project_tasks    enable row level security;
alter table public.project_activity enable row level security;

-- Every signed-in account reads every board.
create policy "project_members: read"  on public.project_members  for select to authenticated using (true);
create policy "project_sprints: read"  on public.project_sprints  for select to authenticated using (true);
create policy "project_columns: read"  on public.project_columns  for select to authenticated using (true);
create policy "project_tasks: read"    on public.project_tasks    for select to authenticated using (true);
create policy "project_activity: read" on public.project_activity for select to authenticated using (true);

-- Board content: project members, the supervisor, editors.
do $$
declare
  t text;
begin
  foreach t in array array['project_sprints', 'project_columns', 'project_tasks'] loop
    execute format(
      'create policy %I on public.%I for insert to authenticated with check ((select private.is_project_member(project_id)))',
      t || ': project members insert', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using ((select private.is_project_member(project_id))) with check ((select private.is_project_member(project_id)))',
      t || ': project members update', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using ((select private.is_project_member(project_id)))',
      t || ': project members delete', t);
  end loop;
end;
$$;

-- Membership: the project's leads and editors.
create policy "project_members: leads insert" on public.project_members
  for insert to authenticated
  with check ((select private.is_project_lead(project_id)) or (select private.is_editor()));
create policy "project_members: leads update" on public.project_members
  for update to authenticated
  using ((select private.is_project_lead(project_id)) or (select private.is_editor()))
  with check ((select private.is_project_lead(project_id)) or (select private.is_editor()));
create policy "project_members: leads delete" on public.project_members
  for delete to authenticated
  using ((select private.is_project_lead(project_id)) or (select private.is_editor()));

-- Activity: members may add a row in their own name; no client updates;
-- editors may delete.
create policy "project_activity: project members insert" on public.project_activity
  for insert to authenticated
  with check (
    (select private.is_project_member(project_id))
    and actor_profile_id = (select auth.uid())
  );
create policy "project_activity: editors delete" on public.project_activity
  for delete to authenticated
  using ((select private.is_editor()));

-- projects: members of an approved project edit its description columns
-- (columns limited by private.guard_project_request_edit).
create policy "projects: project members update" on public.projects
  for update to authenticated
  using (status <> 'proposed' and (select private.is_project_member(id)))
  with check (status <> 'proposed' and (select private.is_project_member(id)));

-- projects: the requester may withdraw (delete) a request still pending.
create policy "projects: requester withdraws pending request" on public.projects
  for delete to authenticated
  using (requested_by = (select auth.uid()) and status = 'proposed');

-- ─────────────────────────────────────────────────────────────────────────
-- approve / decline RPCs
-- ─────────────────────────────────────────────────────────────────────────

create function public.approve_project_request(
  p                     uuid,
  ref                   text,
  methodology           public.methodology,
  supervisor_kind       public.supervisor_kind,
  supervisor_member_id  uuid,
  supervisor_name       text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  requester uuid;
  cols text[];
  wips int[];
  i int;
begin
  if not private.is_editor() then
    raise exception 'only editors can approve project requests' using errcode = '42501';
  end if;

  select pr.requested_by into requester
  from public.projects pr
  where pr.id = p and pr.status = 'proposed'
  for update;
  if not found then
    raise exception 'no pending request %', p using errcode = 'P0002';
  end if;

  update public.projects pr set
    status               = 'in_progress',
    ref                  = trim(approve_project_request.ref),
    methodology          = approve_project_request.methodology,
    supervisor_kind      = approve_project_request.supervisor_kind,
    supervisor_member_id = approve_project_request.supervisor_member_id,
    supervisor_name      = case when approve_project_request.supervisor_member_id is null
                                then nullif(trim(approve_project_request.supervisor_name), '') end,
    approved_by          = (select auth.uid()),
    approved_at          = now(),
    declined_at          = null,
    decline_reason       = null
  where pr.id = p;

  -- Board template (docs/ARCHITECTURE.md). The last column is the done one.
  case approve_project_request.methodology
    when 'kanban' then
      cols := array['Backlog', 'To Do', 'In Progress', 'Review', 'Done'];
      wips := array[null, null, 3, null, null]::int[];
    when 'scrumban' then
      cols := array['Backlog', 'Ready', 'In Progress', 'Review', 'Done'];
      wips := array[null, 5, 3, null, null]::int[];
    when 'scrum' then
      cols := array['Product Backlog', 'Sprint Backlog', 'In Progress', 'Review', 'Done'];
      wips := array[null, null, null, null, null]::int[];
    when 'safe' then
      cols := array['Program Backlog', 'Iteration Backlog', 'In Progress', 'Review', 'Done'];
      wips := array[null, null, null, null, null]::int[];
  end case;

  -- Re-approving cannot happen (status check above), but keep this
  -- idempotent if a board already exists for some reason.
  if not exists (select 1 from public.project_columns c where c.project_id = p) then
    for i in 1 .. array_length(cols, 1) loop
      insert into public.project_columns (project_id, name, position, wip_limit, is_done)
      values (p, cols[i], i - 1, wips[i], i = array_length(cols, 1));
    end loop;
  end if;

  perform private.log_activity(p, null, 'approved',
    jsonb_build_object('ref', trim(approve_project_request.ref), 'methodology', approve_project_request.methodology));

  if requester is not null then
    insert into public.project_members (project_id, profile_id, role)
    values (p, requester, 'lead')
    on conflict (project_id, profile_id) do update set role = 'lead';
  end if;
end;
$$;

comment on function public.approve_project_request(uuid, text, public.methodology, public.supervisor_kind, uuid, text) is
  'Editors only. Turns a proposed project into in_progress with its ref, methodology and supervisor, creates the template columns, makes the requester the lead and logs "approved".';

create function public.decline_project_request(p uuid, reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_editor() then
    raise exception 'only editors can decline project requests' using errcode = '42501';
  end if;
  update public.projects pr set
    status         = 'archived',
    declined_at    = now(),
    decline_reason = nullif(trim(reason), '')
  where pr.id = p and pr.status = 'proposed';
  if not found then
    raise exception 'no pending request %', p using errcode = 'P0002';
  end if;
  perform private.log_activity(p, null, 'declined', jsonb_build_object('reason', nullif(trim(reason), '')));
end;
$$;

comment on function public.decline_project_request(uuid, text) is
  'Editors only. Archives a proposed project with declined_at and the reason, and logs "declined".';

revoke execute on function public.approve_project_request(uuid, text, public.methodology, public.supervisor_kind, uuid, text) from public, anon;
revoke execute on function public.decline_project_request(uuid, text) from public, anon;
grant execute on function public.approve_project_request(uuid, text, public.methodology, public.supervisor_kind, uuid, text) to authenticated, service_role;
grant execute on function public.decline_project_request(uuid, text) to authenticated, service_role;

-- New private helpers: signed-in users only (as in 0001).
revoke execute on all functions in schema private from public;
revoke execute on all functions in schema private from anon;
grant execute on all functions in schema private to authenticated;
