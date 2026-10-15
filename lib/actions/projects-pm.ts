"use server";

/* Board actions (tasks, sprints, columns, members, project details).
 *
 * Called from client components with plain objects; each returns
 * `{ ok: true, ... }` or `{ error }`. Every action: requireUser() first, zod
 * validation, then the session client — RLS decides who may write
 * (private.is_project_member / is_project_lead). A refused write surfaces as
 * 42501 or as zero affected rows; both become "You can't edit this project." */

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { getActivity, type ActivityItem, type BoardTask } from "@/lib/data/pm";
import type { TablesUpdate } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type PmResult<T = object> = ({ ok: true } & T) | { ok?: false; error: string };

const CANT = "You can't edit this project.";
const GITHUB = /^https:\/\/github\.com\/\S+$/;

function fail(error: { code?: string; message: string } | null, verb: string): { error: string } {
  if (!error || error.code === "42501") return { error: CANT };
  if (error.code === "23503") return { error: `Couldn't ${verb}: it refers to something that no longer exists. Reload the board.` };
  return { error: `Couldn't ${verb}: ${error.message}` };
}

function revalidateBoard(projectId: string, publicChange = false) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/projects");
  revalidatePath(`/dashboard/projects/${projectId}`);
  if (publicChange) {
    revalidatePath("/projects");
    revalidatePath("/");
  }
}

const zId = z.uuid({ error: "Missing id." });
const zTitle = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().min(1, { error: "Enter a title." }).max(300, { error: "Keep it under 300 characters." }));
const zDate = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v ?? "").trim() || null)
  .pipe(z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Pick a date." }).nullable());

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Check the value.";
}

type TaskRow = {
  id: string;
  column_id: string;
  sprint_id: string | null;
  title: string;
  description: string | null;
  priority: BoardTask["priority"];
  points: number | null;
  assignee_profile_id: string | null;
  due_on: string | null;
  github_url: string | null;
  position: number;
  completed_at: string | null;
  created_at: string;
};
const TASK_COLS =
  "id, column_id, sprint_id, title, description, priority, points, assignee_profile_id, due_on, github_url, position, completed_at, created_at";

function toTask(t: TaskRow): BoardTask {
  return {
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
  };
}

// ── tasks ────────────────────────────────────────────────────────────────

const CreateTask = z.object({
  projectId: zId,
  columnId: zId,
  title: zTitle,
  sprintId: zId.nullable().optional(),
});

/** Append a task at the bottom of a column. */
export async function createTask(input: z.input<typeof CreateTask>): Promise<PmResult<{ task: BoardTask }>> {
  await requireUser();
  const parsed = CreateTask.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("project_tasks")
    .select("position")
    .eq("column_id", v.columnId)
    .order("position", { ascending: false })
    .limit(1);
  const { data, error } = await supabase
    .from("project_tasks")
    .insert({
      project_id: v.projectId,
      column_id: v.columnId,
      sprint_id: v.sprintId ?? null,
      title: v.title,
      position: (last?.[0]?.position ?? -1) + 1,
    })
    .select(TASK_COLS)
    .single();
  if (error) return fail(error, "add the task");
  revalidateBoard(v.projectId);
  return { ok: true, task: toTask(data as TaskRow) };
}

const TaskField = z.discriminatedUnion("field", [
  z.object({ field: z.literal("title"), value: zTitle }),
  z.object({
    field: z.literal("description"),
    value: z
      .string()
      .nullable()
      .transform((v) => (v ?? "").trim() || null)
      .pipe(z.string().max(5000, { error: "Keep it under 5000 characters." }).nullable()),
  }),
  z.object({ field: z.literal("priority"), value: z.enum(["low", "medium", "high", "urgent"], { error: "Pick a priority." }) }),
  z.object({
    field: z.literal("points"),
    value: z
      .union([z.number(), z.string(), z.null()])
      .transform((v) => (v === null || v === "" ? null : Number(v)))
      .pipe(z.number().int({ error: "Whole points only." }).min(0, { error: "0 or more." }).max(100, { error: "100 or fewer." }).nullable()),
  }),
  z.object({ field: z.literal("assigneeId"), value: zId.nullable() }),
  z.object({ field: z.literal("sprintId"), value: zId.nullable() }),
  z.object({ field: z.literal("columnId"), value: zId }),
  z.object({ field: z.literal("dueOn"), value: zDate }),
  z.object({
    field: z.literal("githubUrl"),
    value: z
      .string()
      .nullable()
      .transform((v) => (v ?? "").trim() || null)
      .pipe(z.string().regex(GITHUB, { error: "Use a GitHub link like https://github.com/SU-SPARC/repo/issues/12." }).nullable()),
  }),
]);

export type TaskFieldInput = z.input<typeof TaskField>;

const COLUMN_OF: Record<string, string> = {
  title: "title",
  description: "description",
  priority: "priority",
  points: "points",
  assigneeId: "assignee_profile_id",
  sprintId: "sprint_id",
  dueOn: "due_on",
  githubUrl: "github_url",
};

/** Save one field of a task (the detail sheet saves per field). Changing the
 *  column moves the task to the bottom of the new column. */
export async function updateTask(
  input: { taskId: string } & TaskFieldInput,
): Promise<PmResult<{ task: BoardTask }>> {
  await requireUser();
  const id = zId.safeParse(input.taskId);
  if (!id.success) return { error: "Missing task id." };
  const parsed = TaskField.safeParse({ field: input.field, value: input.value });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();

  let patch: TablesUpdate<"project_tasks">;
  if (v.field === "columnId") {
    const { data: last } = await supabase
      .from("project_tasks")
      .select("position")
      .eq("column_id", v.value)
      .neq("id", id.data)
      .order("position", { ascending: false })
      .limit(1);
    patch = { column_id: v.value, position: (last?.[0]?.position ?? -1) + 1 };
  } else {
    patch = { [COLUMN_OF[v.field]]: v.value } as TablesUpdate<"project_tasks">;
  }
  const { data, error } = await supabase
    .from("project_tasks")
    .update(patch)
    .eq("id", id.data)
    .select(`${TASK_COLS}, project_id`);
  if (error) return fail(error, "save");
  if (!data.length) return { error: CANT };
  const row = data[0] as TaskRow & { project_id: string };
  revalidateBoard(row.project_id);
  return { ok: true, task: toTask(row) };
}

const MoveTask = z.object({
  taskId: zId,
  toColumnId: zId,
  toIndex: z.number().int().min(0),
  /** Optional: also change the sprint in the same move. */
  sprintId: zId.nullable().optional(),
});

/** Move a task to `toIndex` in `toColumnId` (same column = reorder) and
 *  renumber that column 0..n-1. */
export async function moveTask(input: z.input<typeof MoveTask>): Promise<PmResult<{ tasks: BoardTask[] }>> {
  await requireUser();
  const parsed = MoveTask.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();

  const { data: task, error: taskErr } = await supabase
    .from("project_tasks")
    .select("id, project_id, column_id")
    .eq("id", v.taskId)
    .maybeSingle();
  if (taskErr) return fail(taskErr, "move the task");
  if (!task) return { error: "That task no longer exists. Reload the board." };

  const { data: siblings, error: sibErr } = await supabase
    .from("project_tasks")
    .select("id, position")
    .eq("column_id", v.toColumnId)
    .neq("id", v.taskId)
    .order("position")
    .order("created_at");
  if (sibErr) return fail(sibErr, "move the task");

  const order = siblings.map((s) => s.id);
  order.splice(Math.min(v.toIndex, order.length), 0, v.taskId);

  // The moved task first, so a refusal stops before anything else changes.
  const movedPatch: { column_id: string; position: number; sprint_id?: string | null } = {
    column_id: v.toColumnId,
    position: order.indexOf(v.taskId),
  };
  if (v.sprintId !== undefined) movedPatch.sprint_id = v.sprintId;
  const { data: moved, error: moveErr } = await supabase
    .from("project_tasks")
    .update(movedPatch)
    .eq("id", v.taskId)
    .select("id");
  if (moveErr) return fail(moveErr, "move the task");
  if (!moved.length) return { error: CANT };

  const current = new Map(siblings.map((s) => [s.id, s.position]));
  for (let i = 0; i < order.length; i++) {
    if (order[i] === v.taskId || current.get(order[i]) === i) continue;
    const { error } = await supabase.from("project_tasks").update({ position: i }).eq("id", order[i]);
    if (error) return fail(error, "reorder the column");
  }

  const { data: fresh } = await supabase
    .from("project_tasks")
    .select(TASK_COLS)
    .eq("column_id", v.toColumnId)
    .order("position");
  revalidateBoard(task.project_id);
  return { ok: true, tasks: ((fresh ?? []) as TaskRow[]).map(toTask) };
}

export async function deleteTask(taskId: string): Promise<PmResult> {
  await requireUser();
  if (!zId.safeParse(taskId).success) return { error: "Missing task id." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_tasks").delete().eq("id", taskId).select("project_id");
  if (error) return fail(error, "delete the task");
  if (!data.length) return { error: CANT };
  revalidateBoard(data[0].project_id);
  return { ok: true };
}

/** One task's own history, for the detail sheet. */
export async function loadTaskActivity(projectId: string, taskId: string): Promise<ActivityItem[]> {
  await requireUser();
  if (!zId.safeParse(projectId).success || !zId.safeParse(taskId).success) return [];
  const { items } = await getActivity(projectId, { taskId, limit: 30 });
  return items;
}

// ── sprints ──────────────────────────────────────────────────────────────

const SprintShape = z
  .object({
    name: z
      .string()
      .transform((v) => v.trim())
      .pipe(z.string().min(1, { error: "Enter a name." }).max(80, { error: "Keep it under 80 characters." })),
    goal: z
      .string()
      .nullable()
      .optional()
      .transform((v) => (v ?? "").trim() || null)
      .pipe(z.string().max(300, { error: "Keep it under 300 characters." }).nullable()),
    startsOn: zDate,
    endsOn: zDate,
  })
  .refine((s) => !s.startsOn || !s.endsOn || s.endsOn >= s.startsOn, {
    error: "The end date must be on or after the start.",
    path: ["endsOn"],
  });

export type SprintInput = z.input<typeof SprintShape>;
export type SprintResult = PmResult<{ id: string }> & { fieldErrors?: Record<string, string[]> };

function sprintFail(error: z.ZodError): SprintResult {
  return { error: firstIssue(error), fieldErrors: z.flattenError(error).fieldErrors as Record<string, string[]> };
}

export async function createSprint(input: { projectId: string } & SprintInput): Promise<SprintResult> {
  await requireUser();
  const pid = zId.safeParse(input.projectId);
  if (!pid.success) return { error: "Missing project id." };
  const parsed = SprintShape.safeParse(input);
  if (!parsed.success) return sprintFail(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data: last } = await supabase
    .from("project_sprints")
    .select("position")
    .eq("project_id", pid.data)
    .order("position", { ascending: false })
    .limit(1);
  const { data, error } = await supabase
    .from("project_sprints")
    .insert({
      project_id: pid.data,
      name: v.name,
      goal: v.goal,
      starts_on: v.startsOn,
      ends_on: v.endsOn,
      position: (last?.[0]?.position ?? -1) + 1,
    })
    .select("id")
    .single();
  if (error) return fail(error, "create it");
  revalidateBoard(pid.data);
  return { ok: true, id: data.id };
}

export async function updateSprint(input: { id: string } & SprintInput): Promise<SprintResult> {
  await requireUser();
  const id = zId.safeParse(input.id);
  if (!id.success) return { error: "Missing id." };
  const parsed = SprintShape.safeParse(input);
  if (!parsed.success) return sprintFail(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_sprints")
    .update({ name: v.name, goal: v.goal, starts_on: v.startsOn, ends_on: v.endsOn })
    .eq("id", id.data)
    .select("id, project_id");
  if (error) return fail(error, "save");
  if (!data.length) return { error: CANT };
  revalidateBoard(data[0].project_id);
  return { ok: true, id: id.data };
}

/** Tasks in the sprint stay on the board with no sprint. */
export async function deleteSprint(id: string): Promise<PmResult> {
  await requireUser();
  if (!zId.safeParse(id).success) return { error: "Missing id." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_sprints").delete().eq("id", id).select("project_id");
  if (error) return fail(error, "delete it");
  if (!data.length) return { error: CANT };
  revalidateBoard(data[0].project_id);
  return { ok: true };
}

// ── columns ──────────────────────────────────────────────────────────────

const ColumnShape = z.object({
  columnId: zId,
  name: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? undefined : v.trim()))
    .pipe(z.string().min(1, { error: "Enter a name." }).max(40, { error: "Keep it under 40 characters." }).optional()),
  wipLimit: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === null || v === "" ? null : Number(v)))
    .pipe(z.number().int({ error: "Whole numbers only." }).min(1, { error: "1 or more, or leave empty." }).max(99).nullable().optional()),
});

/** Rename a column and/or set its WIP limit (null clears it). */
export async function updateColumn(input: z.input<typeof ColumnShape>): Promise<PmResult> {
  await requireUser();
  const parsed = ColumnShape.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const patch: { name?: string; wip_limit?: number | null } = {};
  if (v.name !== undefined) patch.name = v.name;
  if (v.wipLimit !== undefined) patch.wip_limit = v.wipLimit;
  if (!Object.keys(patch).length) return { ok: true };
  const supabase = await createClient();
  const { data, error } = await supabase.from("project_columns").update(patch).eq("id", v.columnId).select("project_id");
  if (error) return fail(error, "save the column");
  if (!data.length) return { error: CANT };
  revalidateBoard(data[0].project_id);
  return { ok: true };
}

// ── members ──────────────────────────────────────────────────────────────

const MemberShape = z.object({
  projectId: zId,
  profileId: zId,
  role: z.enum(["lead", "member"]).default("member"),
});

/** Leads and editors only (RLS). Adding an existing member updates the role. */
export async function addProjectMember(input: z.input<typeof MemberShape>): Promise<PmResult> {
  await requireUser();
  const parsed = MemberShape.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .upsert({ project_id: v.projectId, profile_id: v.profileId, role: v.role }, { onConflict: "project_id,profile_id" })
    .select("profile_id");
  if (error) return error.code === "42501" ? { error: "Only the project's leads and editors can add members." } : fail(error, "add them");
  if (!data.length) return { error: "Only the project's leads and editors can add members." };
  revalidateBoard(v.projectId);
  return { ok: true };
}

export async function removeProjectMember(input: { projectId: string; profileId: string }): Promise<PmResult> {
  await requireUser();
  const parsed = MemberShape.pick({ projectId: true, profileId: true }).safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", parsed.data.projectId)
    .eq("profile_id", parsed.data.profileId)
    .select("profile_id");
  if (error) return fail(error, "remove them");
  if (!data.length) return { error: "Only the project's leads and editors can remove members." };
  revalidateBoard(parsed.data.projectId);
  return { ok: true };
}

// ── project details ──────────────────────────────────────────────────────

const zOptHttp = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v ?? "").trim() || null)
  .pipe(z.url({ protocol: /^https?$/, error: "Enter a full link starting with https://" }).nullable());

const DetailsShape = z.object({
  projectId: zId,
  summary: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v ?? "").trim() || null)
    .pipe(z.string().max(2000, { error: "Keep it under 2000 characters." }).nullable()),
  highlights: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((v) =>
      (Array.isArray(v) ? v : (v ?? "").split("\n")).map((s) => s.trim()).filter(Boolean),
    ),
  repoUrl: zOptHttp.pipe(
    z.string().regex(/^https:\/\/github\.com\/[^/\s]+(\/[^/\s]+)?\/?$/, { error: "Use a GitHub link like https://github.com/SU-SPARC/repo." }).nullable(),
  ),
  liveUrl: zOptHttp,
  /** An existing media id, or null to clear. Omit to leave unchanged. */
  coverMediaId: zId.nullable().optional(),
});

export type DetailsResult = PmResult & { fieldErrors?: Record<string, string[]> };

/** Project members edit the public description columns (RLS + trigger). */
export async function updateProjectDetails(input: z.input<typeof DetailsShape>): Promise<DetailsResult> {
  await requireUser();
  const parsed = DetailsShape.safeParse(input);
  if (!parsed.success) {
    return { error: firstIssue(parsed.error), fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]> };
  }
  const v = parsed.data;
  const patch: {
    summary: string | null;
    highlights: string[];
    repo_url: string | null;
    live_url: string | null;
    cover_media_id?: string | null;
  } = { summary: v.summary, highlights: v.highlights, repo_url: v.repoUrl, live_url: v.liveUrl };
  if (v.coverMediaId !== undefined) patch.cover_media_id = v.coverMediaId;
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").update(patch).eq("id", v.projectId).select("id");
  if (error) return fail(error, "save");
  if (!data.length) return { error: CANT };
  revalidateBoard(v.projectId, true);
  return { ok: true };
}
