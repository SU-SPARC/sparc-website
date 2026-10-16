/* RLS check for project management (migration 0002) against the LOCAL stack.
 *
 *   npm run rls:check-pm
 *
 * Same approach as scripts/rls-check.ts: throwaway users (rls-pm-*@test.local)
 * and rows (refs/slugs prefixed "rls-pm-"), a fresh publishable-key client
 * per role, a PASS/FAIL table, and cleanup of everything it created, also on
 * failure. Exit code 0 only when every check passes.
 *
 * Never point this at production: it creates and deletes auth users. */

import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database } from "../lib/supabase/database.types";

config({ path: ".env.local", quiet: true });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!URL || !PUBLISHABLE || !SECRET) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or SUPABASE_SECRET_KEY in .env.local",
  );
  process.exit(1);
}
const host = new globalThis.URL(URL).hostname;
if (!["127.0.0.1", "localhost"].includes(host) && process.env.RLS_CHECK_ALLOW_REMOTE !== "1") {
  console.error(`Refusing to run against ${host}: this script creates and deletes users. Local stack only.`);
  process.exit(1);
}

type Client = SupabaseClient<Database>;
type Methodology = Database["public"]["Enums"]["methodology"];
const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin: Client = createClient<Database>(URL, SECRET, opts);
const fresh = (): Client => createClient<Database>(URL, PUBLISHABLE, opts);

const RUN = randomBytes(3).toString("hex");
const PASSWORD = `rls-${randomBytes(9).toString("base64url")}`;
const EMAILS = {
  editor: "rls-pm-editor@test.local",
  lead: "rls-pm-lead@test.local",
  member: "rls-pm-member@test.local",
  stranger: "rls-pm-stranger@test.local",
  supervisor: "rls-pm-supervisor@test.local",
} as const;
type Who = keyof typeof EMAILS;

// ── result table ─────────────────────────────────────────────────────────

type Result = { who: string; check: string; ok: boolean; detail: string };
const results: Result[] = [];

async function check(who: string, name: string, fn: () => Promise<true | string>) {
  try {
    const r = await fn();
    results.push({ who, check: name, ok: r === true, detail: r === true ? "" : r });
  } catch (e) {
    results.push({ who, check: name, ok: false, detail: `threw: ${(e as Error).message}` });
  }
}

function denied(res: { error: { code?: string; message: string } | null; data: unknown[] | null }): true | string {
  if (res.error) return true;
  if (!res.data || res.data.length === 0) return true;
  return `allowed: ${res.data.length} row(s) affected`;
}

function allowed(res: { error: { message: string } | null; data: unknown[] | null }): true | string {
  if (res.error) return `error: ${res.error.message}`;
  if (!res.data || res.data.length === 0) return "no rows affected";
  return true;
}

function errors(res: { error: { code?: string; message: string } | null }, code?: string): true | string {
  if (!res.error) return "succeeded, expected an error";
  if (code && res.error.code !== code) return `error ${res.error.code} (${res.error.message}), expected ${code}`;
  return true;
}

const all = (...r: Array<true | string>): true | string =>
  r.every((x) => x === true) ? true : r.filter((x) => x !== true).join("; ");

// ── fixtures ─────────────────────────────────────────────────────────────

const users = {} as Record<Who, string>;
const clients = {} as Record<Who, Client>;
let supervisorCard = "";
const requests = {} as Record<Methodology, string>;
let toDecline = "";
let toWithdraw = "";

async function cleanup() {
  await admin.from("projects").delete().or("ref.like.rls-pm-%,slug.like.rls-pm-%");
  await admin.from("members").delete().like("slug", "rls-pm-%");
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const ours = new Set<string>(Object.values(EMAILS));
  for (const u of list?.users ?? []) {
    if (u.email && ours.has(u.email)) await admin.auth.admin.deleteUser(u.id);
  }
}

async function must<R extends { data: unknown; error: { message: string } | null }>(
  label: string,
  p: PromiseLike<R>,
): Promise<NonNullable<R["data"]>> {
  const { data, error } = await p;
  if (error || data == null) throw new Error(`setup ${label}: ${error?.message ?? "no data"}`);
  return data as NonNullable<R["data"]>;
}

async function signIn(key: Who): Promise<Client> {
  const c = fresh();
  const { error } = await c.auth.signInWithPassword({ email: EMAILS[key], password: PASSWORD });
  if (error) throw new Error(`sign in ${key}: ${error.message}`);
  return c;
}

async function setup() {
  for (const key of Object.keys(EMAILS) as Who[]) {
    const data = await must(`user ${key}`, admin.auth.admin.createUser({
      email: EMAILS[key],
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: `PM ${key}` },
    }));
    users[key] = data.user!.id;
  }
  await must("role editor", admin.from("profiles").update({ role: "editor" }).eq("id", users.editor).select());
  const card = await must("card", admin.from("members").insert(
    { slug: `rls-pm-super-${RUN}`, name: "PM Supervisor", class_year: 2026 },
  ).select().single());
  supervisorCard = card.id;
  await must("link", admin.from("profiles").update({ member_id: supervisorCard }).eq("id", users.supervisor).select());
  for (const key of Object.keys(EMAILS) as Who[]) clients[key] = await signIn(key);
}

const request = (c: Client, tag: string, methodology: Methodology) =>
  c.from("projects").insert({
    ref: `rls-pm-REQ-${tag}-${RUN}`,
    slug: `rls-pm-${tag}-${RUN}`,
    title: `PM ${tag}`,
    term: "Fall 2026",
    status: "proposed",
    published: false,
    methodology,
    requested_by: users.lead,
  }).select("id").single();

// ── checks ───────────────────────────────────────────────────────────────

async function requestChecks() {
  const { lead, stranger, editor, member } = clients;
  for (const m of ["kanban", "scrumban", "scrum", "safe"] as const) {
    await check("lead", `requests a ${m} project`, async () => {
      const r = await request(lead, m, m);
      if (r.error) return `error: ${r.error.message}`;
      requests[m] = r.data.id;
      return true;
    });
  }
  await check("lead", "requests two more (to decline / withdraw)", async () => {
    const a = await request(lead, "decline", "kanban");
    const b = await request(lead, "withdraw", "kanban");
    if (a.error || b.error) return `error: ${a.error?.message ?? b.error?.message}`;
    toDecline = a.data.id;
    toWithdraw = b.data.id;
    return true;
  });
  await check("lead", "edits own proposed request", async () =>
    allowed(await lead.from("projects").update({ summary: "edited" }).eq("id", requests.kanban).select()));
  await check("stranger", "cannot edit someone else's request", async () =>
    denied(await stranger.from("projects").update({ summary: "nope" }).eq("id", requests.kanban).select()));
  await check("lead", "cannot set own request to in_progress", async () =>
    denied(await lead.from("projects").update({ status: "in_progress" }).eq("id", requests.kanban).select()));
  await check("stranger", "cannot withdraw someone else's request", async () =>
    denied(await stranger.from("projects").delete().eq("id", toWithdraw).select()));
  await check("lead", "withdraws own proposed request", async () =>
    allowed(await lead.from("projects").delete().eq("id", toWithdraw).select()));

  const approveArgs = (p: string, m: Methodology) => ({
    p,
    ref: `rls-pm-SP-${m}-${RUN}`,
    methodology: m,
    supervisor_kind: "student" as const,
    supervisor_member_id: m === "scrum" ? supervisorCard : (null as unknown as string),
    supervisor_name: m === "scrum" ? "" : "Dr. Faculty",
  });
  await check("lead", "cannot approve own request", async () =>
    errors(await lead.rpc("approve_project_request", approveArgs(requests.scrum, "scrum")), "42501"));
  await check("member", "cannot approve", async () =>
    errors(await member.rpc("approve_project_request", approveArgs(requests.scrum, "scrum")), "42501"));
  await check("stranger", "cannot decline", async () =>
    errors(await stranger.rpc("decline_project_request", { p: toDecline, reason: "no" }), "42501"));

  const expected: Record<Methodology, Array<[string, number | null, boolean]>> = {
    kanban: [["Backlog", null, false], ["To Do", null, false], ["In Progress", 3, false], ["Review", null, false], ["Done", null, true]],
    scrumban: [["Backlog", null, false], ["Ready", 5, false], ["In Progress", 3, false], ["Review", null, false], ["Done", null, true]],
    scrum: [["Product Backlog", null, false], ["Sprint Backlog", null, false], ["In Progress", null, false], ["Review", null, false], ["Done", null, true]],
    safe: [["Program Backlog", null, false], ["Iteration Backlog", null, false], ["In Progress", null, false], ["Review", null, false], ["Done", null, true]],
  };
  for (const m of ["kanban", "scrumban", "scrum", "safe"] as const) {
    await check("editor", `approves ${m}: in_progress + template columns`, async () => {
      const r = await editor.rpc("approve_project_request", approveArgs(requests[m], m));
      if (r.error) return `rpc: ${r.error.message}`;
      const p = await admin.from("projects").select("status, ref, methodology, approved_by, approved_at").eq("id", requests[m]).single();
      if (p.data?.status !== "in_progress" || p.data.methodology !== m || p.data.approved_by !== users.editor || !p.data.approved_at) {
        return `project ${JSON.stringify(p.data)}`;
      }
      const cols = (await admin.from("project_columns").select("name, wip_limit, is_done, position").eq("project_id", requests[m]).order("position")).data ?? [];
      const got = cols.map((c) => [c.name, c.wip_limit, c.is_done]);
      return JSON.stringify(got) === JSON.stringify(expected[m]) ? true : `columns ${JSON.stringify(got)}`;
    });
  }
  await check("editor", "approval makes the requester the lead + logs approved", async () => {
    const m = await admin.from("project_members").select("profile_id, role").eq("project_id", requests.scrum);
    const a = await admin.from("project_activity").select("action").eq("project_id", requests.scrum).eq("action", "approved");
    return m.data?.length === 1 && m.data[0].profile_id === users.lead && m.data[0].role === "lead" && a.data?.length === 1
      ? true
      : `members ${JSON.stringify(m.data)} approved rows ${a.data?.length}`;
  });
  await check("editor", "cannot approve twice", async () =>
    errors(await editor.rpc("approve_project_request", approveArgs(requests.scrum, "scrum"))));
  await check("editor", "declines: archived + reason + activity", async () => {
    const r = await editor.rpc("decline_project_request", { p: toDecline, reason: "Overlaps SP-002" });
    if (r.error) return `rpc: ${r.error.message}`;
    const p = await admin.from("projects").select("status, declined_at, decline_reason").eq("id", toDecline).single();
    const a = await admin.from("project_activity").select("action").eq("project_id", toDecline).eq("action", "declined");
    return p.data?.status === "archived" && p.data.declined_at && p.data.decline_reason === "Overlaps SP-002" && a.data?.length === 1
      ? true
      : JSON.stringify(p.data);
  });
}

async function boardChecks() {
  const P = requests.scrum;
  const { lead, member, stranger, supervisor, editor } = clients;
  const cols = (await admin.from("project_columns").select("id, name").eq("project_id", P).order("position")).data ?? [];
  const col = (name: string) => cols.find((c) => c.name === name)!.id;
  let taskId = "";

  await check("lead", "adds a member", async () =>
    allowed(await lead.from("project_members").insert({ project_id: P, profile_id: users.member }).select()));
  await check("member", "cannot add members", async () =>
    denied(await member.from("project_members").insert({ project_id: P, profile_id: users.stranger }).select()));
  await check("member", "cannot promote self to lead", async () =>
    denied(await member.from("project_members").update({ role: "lead" }).eq("project_id", P).eq("profile_id", users.member).select()));

  await check("member", "creates a task", async () => {
    const r = await member.from("project_tasks").insert({
      project_id: P, column_id: col("Product Backlog"), title: "Fix nav", position: 0,
    }).select("id").single();
    if (r.error) return `error: ${r.error.message}`;
    taskId = r.data.id;
    return true;
  });
  await check("member", "moves a task (column change)", async () =>
    allowed(await member.from("project_tasks").update({ column_id: col("In Progress"), position: 0 }).eq("id", taskId).select()));
  await check("member", "edits a task (title, priority)", async () =>
    allowed(await member.from("project_tasks").update({ title: "Fix the nav", priority: "high" }).eq("id", taskId).select()));
  await check("member", "completes a task: completed_at set", async () => {
    const r = await member.from("project_tasks").update({ column_id: col("Done") }).eq("id", taskId).select("completed_at").single();
    return r.data?.completed_at ? true : `completed_at ${r.data?.completed_at} ${r.error?.message ?? ""}`;
  });
  await check("member", "moving out of Done clears completed_at", async () => {
    const r = await member.from("project_tasks").update({ column_id: col("Review") }).eq("id", taskId).select("completed_at").single();
    return r.data && r.data.completed_at === null ? true : `completed_at ${r.data?.completed_at}`;
  });
  await check("member", "cannot point a task at another project's column", async () => {
    const other = (await admin.from("project_columns").select("id").eq("project_id", requests.kanban).limit(1).single()).data!;
    return errors(await member.from("project_tasks").update({ column_id: other.id }).eq("id", taskId).select());
  });
  await check("member", "activity: created, moved, edited, completed", async () => {
    const a = (await member.from("project_activity").select("action, actor_profile_id, detail").eq("task_id", taskId)).data ?? [];
    const actions = new Set(a.map((x) => x.action));
    const need = ["task_created", "task_moved", "task_edited", "task_completed"];
    const missing = need.filter((x) => !actions.has(x));
    if (missing.length) return `missing ${missing.join(",")}`;
    const moved = a.find((x) => x.action === "task_completed");
    const d = moved?.detail as { from?: string; to?: string } | null;
    if (d?.from !== "In Progress" || d?.to !== "Done") return `completed detail ${JSON.stringify(d)}`;
    return a.every((x) => x.actor_profile_id === users.member) ? true : "wrong actor";
  });

  // Strangers: read yes, write no.
  await check("stranger", "reads the board", async () => {
    const c = await stranger.from("project_columns").select("id").eq("project_id", P);
    const t = await stranger.from("project_tasks").select("id").eq("project_id", P);
    const m = await stranger.from("project_members").select("profile_id").eq("project_id", P);
    const a = await stranger.from("project_activity").select("id").eq("project_id", P);
    return c.data?.length === 5 && t.data?.length === 1 && m.data?.length === 2 && (a.data?.length ?? 0) > 0
      ? true
      : `cols ${c.data?.length} tasks ${t.data?.length} members ${m.data?.length} activity ${a.data?.length}`;
  });
  await check("stranger", "cannot create/edit/move/delete tasks", async () => all(
    denied(await stranger.from("project_tasks").insert({ project_id: P, column_id: col("Review"), title: "x", position: 9 }).select()),
    denied(await stranger.from("project_tasks").update({ title: "hacked" }).eq("id", taskId).select()),
    denied(await stranger.from("project_tasks").update({ column_id: col("Done") }).eq("id", taskId).select()),
    denied(await stranger.from("project_tasks").delete().eq("id", taskId).select()),
  ));
  await check("stranger", "cannot touch columns, sprints, members, activity", async () => all(
    denied(await stranger.from("project_columns").update({ name: "x" }).eq("project_id", P).select()),
    denied(await stranger.from("project_columns").insert({ project_id: P, name: "x", position: 9 }).select()),
    denied(await stranger.from("project_sprints").insert({ project_id: P, name: "x" }).select()),
    denied(await stranger.from("project_members").insert({ project_id: P, profile_id: users.stranger }).select()),
    denied(await stranger.from("project_members").delete().eq("project_id", P).select()),
    denied(await stranger.from("project_activity").insert({ project_id: P, action: "x", actor_profile_id: users.stranger }).select()),
  ));
  await check("stranger", "cannot edit the project's summary", async () =>
    denied(await stranger.from("projects").update({ summary: "x" }).eq("id", P).select()));

  // Supervisor (linked member card, not a project_members row).
  await check("supervisor", "edits a task", async () =>
    allowed(await supervisor.from("project_tasks").update({ points: 3 }).eq("id", taskId).select()));
  await check("supervisor", "creates a sprint (activity logged)", async () => {
    const r = await supervisor.from("project_sprints").insert({ project_id: P, name: "Sprint 1", starts_on: "2026-10-06", ends_on: "2026-10-19" }).select();
    if (r.error) return `error: ${r.error.message}`;
    const a = await admin.from("project_activity").select("id").eq("project_id", P).eq("action", "sprint_created");
    return a.data?.length === 1 ? true : "no sprint_created row";
  });
  await check("supervisor", "cannot add members", async () =>
    denied(await supervisor.from("project_members").insert({ project_id: P, profile_id: users.stranger }).select()));

  // Project details.
  await check("member", "edits summary + repo_url of the project", async () =>
    allowed(await member.from("projects").update({ summary: "A board", repo_url: "https://github.com/x/y" }).eq("id", P).select()));
  await check("member", "cannot change status / publish", async () => all(
    errors(await member.from("projects").update({ status: "completed" }).eq("id", P).select(), "42501"),
    errors(await member.from("projects").update({ published: true }).eq("id", P).select(), "42501"),
  ));

  // Activity is append-only for clients; editors may delete.
  await check("member", "cannot update or delete activity", async () => all(
    denied(await member.from("project_activity").update({ action: "x" }).eq("project_id", P).select()),
    denied(await member.from("project_activity").delete().eq("project_id", P).select()),
  ));
  await check("member", "cannot forge activity in someone else's name", async () =>
    denied(await member.from("project_activity").insert({ project_id: P, action: "note", actor_profile_id: users.lead }).select()));
  await check("editor", "edits any board", async () =>
    allowed(await editor.from("project_columns").update({ wip_limit: 4 }).eq("id", col("In Progress")).select()));

  await check("member", "deletes a task (activity logged)", async () => {
    const r = await member.from("project_tasks").delete().eq("id", taskId).select();
    if (r.error || !r.data?.length) return `delete: ${r.error?.message ?? "no rows"}`;
    const a = await admin.from("project_activity").select("detail").eq("project_id", P).eq("action", "task_deleted");
    return a.data?.length === 1 ? true : "no task_deleted row";
  });
  await check("lead", "removes a member (activity logged)", async () => {
    const r = await lead.from("project_members").delete().eq("project_id", P).eq("profile_id", users.member).select();
    if (r.error || !r.data?.length) return `delete: ${r.error?.message ?? "no rows"}`;
    const a = await admin.from("project_activity").select("id").eq("project_id", P).eq("action", "member_removed");
    return a.data?.length === 1 ? true : "no member_removed row";
  });
  await check("member", "after removal: cannot edit the board", async () =>
    denied(await member.from("project_tasks").insert({ project_id: P, column_id: col("Review"), title: "x", position: 0 }).select()));
  await check("editor", "deletes activity rows", async () =>
    allowed(await editor.from("project_activity").delete().eq("project_id", P).eq("action", "member_removed").select()));
}

async function anonChecks() {
  const c = fresh();
  await check("anon", "reads no board tables", async () => {
    const r = await Promise.all([
      c.from("project_tasks").select("id").limit(1),
      c.from("project_columns").select("id").limit(1),
      c.from("project_members").select("project_id").limit(1),
      c.from("project_activity").select("id").limit(1),
      c.from("project_sprints").select("id").limit(1),
    ]);
    return r.every((x) => x.error || (x.data?.length ?? 0) === 0) ? true : "anon read rows";
  });
  await check("anon", "cannot call approve/decline", async () => all(
    errors(await c.rpc("decline_project_request", { p: requests.kanban, reason: "x" })),
  ));
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
  let fatal: Error | null = null;
  try {
    await cleanup();
    await setup();
    await requestChecks();
    await boardChecks();
    await anonChecks();
  } catch (e) {
    fatal = e as Error;
  } finally {
    try {
      await cleanup();
    } catch (e) {
      console.error(`cleanup failed: ${(e as Error).message}`);
    }
  }

  const w1 = Math.max(...results.map((r) => r.who.length), 3);
  const w2 = Math.max(...results.map((r) => r.check.length), 5);
  console.log(`${"who".padEnd(w1)}  ${"check".padEnd(w2)}  result`);
  console.log(`${"-".repeat(w1)}  ${"-".repeat(w2)}  ------`);
  for (const r of results) {
    console.log(`${r.who.padEnd(w1)}  ${r.check.padEnd(w2)}  ${r.ok ? "PASS" : "FAIL"}${r.detail ? `  ${r.detail}` : ""}`);
  }
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (fatal) console.error(`\nFATAL: ${fatal.message}`);
  process.exit(failed || fatal ? 1 : 0);
}

void main();
