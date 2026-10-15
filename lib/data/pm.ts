/* Project-management reads for the signed-in screens (/dashboard,
 * /dashboard/projects/**, /admin/projects/requests).
 *
 * Uses the SESSION client (lib/supabase/server.ts): every signed-in account
 * may read every board (migration 0002), and RLS decides writes. Pages never
 * import @supabase/* directly; they call these. Boards are small (tens of
 * tasks), so joins happen here in JS rather than through embed hints on the
 * `people` view. */

import "server-only";

import { cache } from "react";

import { getCurrentUser, isEditorRole } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";

import type { DateOnly, Methodology, ProjectKind, ProjectStatus, SupervisorKind } from "./types";

type Client = Awaited<ReturnType<typeof createClient>>;

export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type MemberRole = "lead" | "member";

/** Anyone shown with an avatar: a profile, named by display name or card. */
export type PersonRef = { id: string; name: string; photo: string | null };

export type PmSupervisor = {
  kind: SupervisorKind;
  name: string;
  /** The supervisor's member card, when linked. */
  memberId: string | null;
  /** The account linked to that card, when there is one. */
  profileId: string | null;
  photo: string | null;
};

export type ProjectCardData = {
  id: string;
  ref: string;
  title: string;
  summary: string | null;
  status: ProjectStatus;
  methodology: Methodology;
  kind: ProjectKind;
  repoUrl: string | null;
  supervisor: PmSupervisor | null;
  done: number;
  total: number;
  members: PersonRef[];
  /** ISO instant of the latest activity (or the project's last update). */
  lastActivity: string;
  /** I'm on it, supervise it, or requested it. */
  isMine: boolean;
  createdAt: string;
};

export type BoardColumn = {
  id: string;
  name: string;
  position: number;
  wipLimit: number | null;
  isDone: boolean;
};

export type BoardTask = {
  id: string;
  columnId: string;
  sprintId: string | null;
  title: string;
  description: string | null;
  priority: TaskPriority;
  points: number | null;
  assigneeId: string | null;
  dueOn: DateOnly | null;
  githubUrl: string | null;
  position: number;
  completedAt: string | null;
  createdAt: string;
};

export type BoardSprint = {
  id: string;
  name: string;
  goal: string | null;
  startsOn: DateOnly | null;
  endsOn: DateOnly | null;
  position: number;
};

export type BoardMember = PersonRef & { role: MemberRole; joinedAt: string };

export type BoardProject = {
  id: string;
  ref: string;
  title: string;
  summary: string | null;
  highlights: string[];
  status: ProjectStatus;
  methodology: Methodology;
  kind: ProjectKind;
  repoUrl: string | null;
  liveUrl: string | null;
  supervisor: PmSupervisor | null;
  approvedAt: string | null;
  createdAt: string;
};

export type Board = {
  project: BoardProject;
  columns: BoardColumn[];
  tasks: BoardTask[];
  sprints: BoardSprint[];
  members: BoardMember[];
  /** Every account, project members first (assignee / add-member pickers). */
  people: PersonRef[];
  me: string;
  canEdit: boolean;
  canManageMembers: boolean;
};

export type ActivityItem = {
  id: string;
  action: string;
  detail: Record<string, string | null | undefined>;
  taskId: string | null;
  createdAt: string;
  actor: PersonRef | null;
};

export type MyTask = {
  id: string;
  title: string;
  dueOn: DateOnly | null;
  priority: TaskPriority;
  projectId: string;
  projectRef: string;
  projectTitle: string;
  columnName: string;
};

export type MyRequest = {
  id: string;
  title: string;
  createdAt: string;
  declinedAt: string | null;
  declineReason: string | null;
};

export type PendingRequest = {
  id: string;
  ref: string;
  title: string;
  summary: string | null;
  highlights: string[];
  kind: ProjectKind;
  methodology: Methodology;
  repoUrl: string | null;
  supervisorKind: SupervisorKind | null;
  supervisorMemberId: string | null;
  supervisorName: string | null;
  requester: PersonRef | null;
  createdAt: string;
};

export type MemberCardOption = { id: string; name: string };

// ── shared loaders ───────────────────────────────────────────────────────

type PeopleIndex = {
  byProfile: Map<string, PersonRef>;
  /** member card id → profile id of the account linked to it */
  profileByCard: Map<string, string>;
  /** member card id → { name, photo } (published cards only, for non-editors) */
  cards: Map<string, { name: string; photo: string | null }>;
};

const loadPeople = cache(async (): Promise<PeopleIndex> => {
  const supabase = await createClient();
  const [people, members] = await Promise.all([
    supabase.from("people").select("id, display_name, member_id"),
    supabase
      .from("members")
      .select("id, name, photo:media!members_photo_media_id_fkey(path, thumb_path)")
      .order("sort_order"),
  ]);
  if (people.error) throw new Error(`people: ${people.error.message}`);
  if (members.error) throw new Error(`members: ${members.error.message}`);

  const cards = new Map<string, { name: string; photo: string | null }>();
  for (const m of members.data) {
    const photo = m.photo as { path: string; thumb_path: string | null } | null;
    cards.set(m.id, { name: m.name, photo: photo ? publicUrl(photo.thumb_path ?? photo.path) : null });
  }
  const byProfile = new Map<string, PersonRef>();
  const profileByCard = new Map<string, string>();
  for (const p of people.data) {
    if (!p.id) continue;
    const card = p.member_id ? cards.get(p.member_id) : undefined;
    if (p.member_id) profileByCard.set(p.member_id, p.id);
    byProfile.set(p.id, {
      id: p.id,
      name: p.display_name?.trim() || card?.name || "Unnamed member",
      photo: card?.photo ?? null,
    });
  }
  return { byProfile, profileByCard, cards };
});

type ProjectRow = Pick<
  Database["public"]["Tables"]["projects"]["Row"],
  "supervisor_kind" | "supervisor_member_id" | "supervisor_name"
>;

function supervisorOf(row: ProjectRow, idx: PeopleIndex, cardName?: string | null): PmSupervisor | null {
  if (!row.supervisor_kind) return null;
  const card = row.supervisor_member_id ? idx.cards.get(row.supervisor_member_id) : undefined;
  const profileId = row.supervisor_member_id ? (idx.profileByCard.get(row.supervisor_member_id) ?? null) : null;
  const name = cardName ?? card?.name ?? row.supervisor_name ?? (profileId ? idx.byProfile.get(profileId)?.name : null);
  if (!name) return null;
  return {
    kind: row.supervisor_kind,
    name,
    memberId: row.supervisor_member_id,
    profileId,
    photo: card?.photo ?? null,
  };
}

/** Latest activity instant per project (boards are small; the newest 1000
 *  rows cover every active project). */
async function lastActivityByProject(supabase: Client): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("project_activity")
    .select("project_id, created_at")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`activity: ${error.message}`);
  const out = new Map<string, string>();
  for (const r of data) if (!out.has(r.project_id)) out.set(r.project_id, r.created_at);
  return out;
}

const later = (a: string, b: string | undefined) => (b && b > a ? b : a);

// ── projects index ───────────────────────────────────────────────────────

const PROJECT_LIST_COLS =
  "id, ref, title, summary, status, methodology, kind, repo_url, supervisor_kind, supervisor_member_id, supervisor_name, requested_by, declined_at, created_at, updated_at, supervisor_card:members!projects_supervisor_member_id_fkey(name)";

/** Every project the caller may see (all of them; RLS lets signed-in users
 *  read every row), except declined requests. Newest activity first. */
export async function listProjectsForMember(): Promise<ProjectCardData[]> {
  const current = await getCurrentUser();
  if (!current) return [];
  const me = current.user.id;
  const myCard = current.profile.member_id;
  const supabase = await createClient();

  const [projects, members, tasks, columns, activity, idx] = await Promise.all([
    supabase.from("projects").select(PROJECT_LIST_COLS).is("declined_at", null),
    supabase.from("project_members").select("project_id, profile_id, role, joined_at").order("joined_at"),
    supabase.from("project_tasks").select("project_id, column_id"),
    supabase.from("project_columns").select("id, is_done"),
    lastActivityByProject(supabase),
    loadPeople(),
  ]);
  for (const r of [projects, members, tasks, columns]) if (r.error) throw new Error(`projects index: ${r.error.message}`);

  const doneCols = new Set((columns.data ?? []).filter((c) => c.is_done).map((c) => c.id));
  const counts = new Map<string, { done: number; total: number }>();
  for (const t of tasks.data ?? []) {
    const c = counts.get(t.project_id) ?? { done: 0, total: 0 };
    c.total += 1;
    if (doneCols.has(t.column_id)) c.done += 1;
    counts.set(t.project_id, c);
  }
  const team = new Map<string, Array<{ profile_id: string; role: string }>>();
  for (const m of members.data ?? []) {
    const list = team.get(m.project_id) ?? [];
    // Leads first.
    if (m.role === "lead") list.unshift(m);
    else list.push(m);
    team.set(m.project_id, list);
  }

  const cards = (projects.data ?? []).map((p): ProjectCardData => {
    const rows = team.get(p.id) ?? [];
    const c = counts.get(p.id) ?? { done: 0, total: 0 };
    const supervisorCard = p.supervisor_card as { name: string } | null;
    return {
      id: p.id,
      ref: p.ref,
      title: p.title,
      summary: p.summary,
      status: p.status,
      methodology: p.methodology,
      kind: p.kind,
      repoUrl: p.repo_url,
      supervisor: supervisorOf(p, idx, supervisorCard?.name),
      done: c.done,
      total: c.total,
      members: rows.map((r) => idx.byProfile.get(r.profile_id)).filter((x): x is PersonRef => Boolean(x)),
      lastActivity: later(p.updated_at, activity.get(p.id)),
      isMine:
        rows.some((r) => r.profile_id === me) ||
        (myCard !== null && p.supervisor_member_id === myCard) ||
        (p.requested_by === me && p.status === "proposed"),
      createdAt: p.created_at,
    };
  });
  return cards.sort((a, b) => (a.lastActivity < b.lastActivity ? 1 : -1));
}

// ── board ────────────────────────────────────────────────────────────────

/** One project's board, or null when it does not exist. */
export async function getBoard(projectId: string): Promise<Board | null> {
  const current = await getCurrentUser();
  if (!current) return null;
  if (!/^[0-9a-f-]{36}$/i.test(projectId)) return null;
  const me = current.user.id;
  const supabase = await createClient();

  const [project, columns, tasks, sprints, members, idx] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, ref, title, summary, highlights, status, methodology, kind, repo_url, live_url, supervisor_kind, supervisor_member_id, supervisor_name, approved_at, created_at, supervisor_card:members!projects_supervisor_member_id_fkey(name)",
      )
      .eq("id", projectId)
      .maybeSingle(),
    supabase.from("project_columns").select("id, name, position, wip_limit, is_done").eq("project_id", projectId).order("position"),
    supabase
      .from("project_tasks")
      .select("id, column_id, sprint_id, title, description, priority, points, assignee_profile_id, due_on, github_url, position, completed_at, created_at")
      .eq("project_id", projectId)
      .order("position")
      .order("created_at"),
    supabase
      .from("project_sprints")
      .select("id, name, goal, starts_on, ends_on, position")
      .eq("project_id", projectId)
      .order("starts_on", { nullsFirst: false })
      .order("position")
      .order("created_at"),
    supabase.from("project_members").select("profile_id, role, joined_at").eq("project_id", projectId).order("joined_at"),
    loadPeople(),
  ]);
  if (project.error) throw new Error(`board: ${project.error.message}`);
  if (!project.data) return null;
  for (const r of [columns, tasks, sprints, members]) if (r.error) throw new Error(`board: ${r.error.message}`);

  const p = project.data;
  const supervisor = supervisorOf(p, idx, (p.supervisor_card as { name: string } | null)?.name);
  const memberRows = (members.data ?? [])
    .map((m): BoardMember | null => {
      const person = idx.byProfile.get(m.profile_id);
      return person ? { ...person, role: m.role === "lead" ? "lead" : "member", joinedAt: m.joined_at } : null;
    })
    .filter((x): x is BoardMember => Boolean(x))
    .sort((a, b) => (a.role === b.role ? 0 : a.role === "lead" ? -1 : 1));

  const isEditor = isEditorRole(current.profile.role);
  const myRow = memberRows.find((m) => m.id === me);
  const isSupervisor = Boolean(current.profile.member_id && p.supervisor_member_id === current.profile.member_id);
  const memberIds = new Set(memberRows.map((m) => m.id));
  const people = [...idx.byProfile.values()].sort((a, b) => {
    const am = memberIds.has(a.id) ? 0 : 1;
    const bm = memberIds.has(b.id) ? 0 : 1;
    return am - bm || a.name.localeCompare(b.name);
  });

  return {
    project: {
      id: p.id,
      ref: p.ref,
      title: p.title,
      summary: p.summary,
      highlights: p.highlights,
      status: p.status,
      methodology: p.methodology,
      kind: p.kind,
      repoUrl: p.repo_url,
      liveUrl: p.live_url,
      supervisor,
      approvedAt: p.approved_at,
      createdAt: p.created_at,
    },
    columns: (columns.data ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      position: c.position,
      wipLimit: c.wip_limit,
      isDone: c.is_done,
    })),
    tasks: (tasks.data ?? []).map((t) => ({
      id: t.id,
      columnId: t.column_id,
      sprintId: t.sprint_id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      points: t.points,
      assigneeId: t.assignee_profile_id,
      dueOn: t.due_on,
      githubUrl: t.github_url,
      position: t.position,
      completedAt: t.completed_at,
      createdAt: t.created_at,
    })),
    sprints: (sprints.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      goal: s.goal,
      startsOn: s.starts_on,
      endsOn: s.ends_on,
      position: s.position,
    })),
    members: memberRows,
    people,
    me,
    canEdit: p.status !== "proposed" && (isEditor || Boolean(myRow) || isSupervisor),
    canManageMembers: p.status !== "proposed" && (isEditor || myRow?.role === "lead"),
  };
}

/** Newest first, `limit` at a time; `before` is the createdAt of the last
 *  item already shown. `taskId` narrows to one task's history. */
export async function getActivity(
  projectId: string,
  { before, limit = 50, taskId }: { before?: string; limit?: number; taskId?: string } = {},
): Promise<{ items: ActivityItem[]; hasMore: boolean }> {
  const supabase = await createClient();
  let q = supabase
    .from("project_activity")
    .select("id, action, detail, task_id, actor_profile_id, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (before) q = q.lt("created_at", before);
  if (taskId) q = q.eq("task_id", taskId);
  const [{ data, error }, idx] = await Promise.all([q, loadPeople()]);
  if (error) throw new Error(`activity: ${error.message}`);
  const rows = data.slice(0, limit);
  return {
    hasMore: data.length > limit,
    items: rows.map((r) => ({
      id: r.id,
      action: r.action,
      detail: (r.detail ?? {}) as ActivityItem["detail"],
      taskId: r.task_id,
      createdAt: r.created_at,
      actor: r.actor_profile_id ? (idx.byProfile.get(r.actor_profile_id) ?? null) : null,
    })),
  };
}

// ── dashboard ────────────────────────────────────────────────────────────

/** Open tasks assigned to me (soonest due first; `allTasks` lifts the cap of
 *  5), my projects, and my requests: pending ones, plus declined ones from
 *  the last 60 days with the reason (the page shows each declined one once). */
export async function getMyDashboard({ allTasks = false }: { allTasks?: boolean } = {}): Promise<{
  tasks: MyTask[];
  moreTasks: boolean;
  projects: ProjectCardData[];
  requests: MyRequest[];
}> {
  const current = await getCurrentUser();
  if (!current) return { tasks: [], moreTasks: false, projects: [], requests: [] };
  const me = current.user.id;
  const supabase = await createClient();
  const cap = allTasks ? 200 : 5;
  const since = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();

  const [tasks, requests, projects] = await Promise.all([
    supabase
      .from("project_tasks")
      .select(
        "id, title, due_on, priority, project_id, project:projects!project_tasks_project_id_fkey(ref, title), column:project_columns!project_tasks_column_id_project_id_fkey(name)",
      )
      .eq("assignee_profile_id", me)
      .is("completed_at", null)
      .order("due_on", { ascending: true, nullsFirst: false })
      .order("created_at")
      .limit(cap + 1),
    supabase
      .from("projects")
      .select("id, title, status, created_at, declined_at, decline_reason")
      .eq("requested_by", me)
      .or(`status.eq.proposed,declined_at.gte."${since}"`)
      .order("created_at", { ascending: false }),
    listProjectsForMember(),
  ]);
  if (tasks.error) throw new Error(`my tasks: ${tasks.error.message}`);
  if (requests.error) throw new Error(`my requests: ${requests.error.message}`);

  const taskRows = tasks.data.map((t): MyTask => {
    const project = t.project as { ref: string; title: string } | null;
    const column = t.column as { name: string } | null;
    return {
      id: t.id,
      title: t.title,
      dueOn: t.due_on,
      priority: t.priority,
      projectId: t.project_id,
      projectRef: project?.ref ?? "",
      projectTitle: project?.title ?? "",
      columnName: column?.name ?? "",
    };
  });

  return {
    tasks: taskRows.slice(0, cap),
    moreTasks: taskRows.length > cap,
    projects: projects.filter((p) => p.isMine && p.status !== "proposed"),
    requests: requests.data.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      declinedAt: r.declined_at,
      declineReason: r.decline_reason,
    })),
  };
}

// ── requests (admin) ─────────────────────────────────────────────────────

/** Proposed projects, oldest first (first come, first reviewed). */
export async function listPendingRequests(): Promise<PendingRequest[]> {
  const supabase = await createClient();
  const [{ data, error }, idx] = await Promise.all([
    supabase
      .from("projects")
      .select(
        "id, ref, title, summary, highlights, kind, methodology, repo_url, supervisor_kind, supervisor_member_id, supervisor_name, requested_by, created_at",
      )
      .eq("status", "proposed")
      .order("created_at"),
    loadPeople(),
  ]);
  if (error) throw new Error(`requests: ${error.message}`);
  return data.map((r) => ({
    id: r.id,
    ref: r.ref,
    title: r.title,
    summary: r.summary,
    highlights: r.highlights,
    kind: r.kind,
    methodology: r.methodology,
    repoUrl: r.repo_url,
    supervisorKind: r.supervisor_kind,
    supervisorMemberId: r.supervisor_member_id,
    supervisorName:
      (r.supervisor_member_id ? idx.cards.get(r.supervisor_member_id)?.name : null) ?? r.supervisor_name,
    requester: r.requested_by ? (idx.byProfile.get(r.requested_by) ?? null) : null,
    createdAt: r.created_at,
  }));
}

/** The next free "SP-NNN" ref. */
export async function nextProjectRef(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("ref").like("ref", "SP-%");
  let max = 0;
  for (const { ref } of data ?? []) {
    const n = Number(ref.slice(3));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `SP-${String(max + 1).padStart(3, "0")}`;
}

/** Member cards the caller can see, for supervisor pickers. */
export async function listMemberCards(): Promise<MemberCardOption[]> {
  const idx = await loadPeople();
  return [...idx.cards.entries()]
    .map(([id, c]) => ({ id, name: c.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
