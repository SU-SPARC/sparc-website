/* RLS / grants check for the Locator tables against the LOCAL Supabase stack.
 *
 *   npm run rls:check-locator
 *
 * Creates throwaway users (rls-loc-*@test.local), opportunities (slugs
 * prefixed "rls-loc-") and a sync_runs row (source_id "rls-loc-…"), signs in as each role with a fresh publishable-key
 * client, asserts what each may and may not do, prints a PASS/FAIL table and
 * removes only what it created, also on failure. Exit code 0 only when every
 * check passes. Never point this at production. */

import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database, TablesInsert } from "../lib/supabase/database.types";

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
const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin: Client = createClient<Database>(URL, SECRET, opts);
const fresh = (): Client => createClient<Database>(URL, PUBLISHABLE, opts);

const RUN = randomBytes(3).toString("hex");
const PASSWORD = `rls-${randomBytes(9).toString("base64url")}`;
const PREFIX = "rls-loc-";
const EMAILS = {
  editor: "rls-loc-editor@test.local",
  member: "rls-loc-member@test.local",
  other: "rls-loc-other@test.local",
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

/** A mutation must be refused: an error, or zero rows affected. */
function denied(res: { error: { message: string } | null; data: unknown[] | null }): true | string {
  if (res.error) return true;
  if (!res.data || res.data.length === 0) return true;
  return `allowed: ${res.data.length} row(s) affected`;
}

/** A mutation must succeed and affect at least one row. */
function allowed(res: { error: { message: string } | null; data: unknown[] | null }): true | string {
  if (res.error) return `error: ${res.error.message}`;
  if (!res.data || res.data.length === 0) return "no rows affected";
  return true;
}

// ── fixtures ─────────────────────────────────────────────────────────────

const ids = {
  users: {} as Record<Who, string>,
  pub: "",
  hidden: "",
  /** editor edits its summary: editor_edited_at must be stamped */
  edit: "",
  /** editor changes only published / verified_on: editor_edited_at must stay null */
  book: "",
  /** service role edits its summary: editor_edited_at must stay null */
  svc: "",
};

const opp = (suffix: string, extra: Partial<TablesInsert<"opportunities">> = {}): TablesInsert<"opportunities"> => ({
  kind: "hackathon",
  slug: `${PREFIX}${suffix}-${RUN}`,
  title: `RLS ${suffix}`,
  organizer: "RLS",
  url: "https://example.com",
  ...extra,
});

const checkRow = (opportunity_id: string, profile_id: string): TablesInsert<"eligibility_checks"> => ({
  opportunity_id,
  profile_id,
  verdict: "likely",
  confidence: "medium",
  model: "rls",
  inputs_hash: "0000000000000000",
});

async function cleanup() {
  // eligibility_checks cascade from opportunities and profiles; career_profiles from profiles.
  await admin.from("opportunities").delete().like("slug", `${PREFIX}%`);
  await admin.from("sync_runs").delete().like("source_id", `${PREFIX}%`);
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

async function setup() {
  for (const key of Object.keys(EMAILS) as Who[]) {
    const data = await must(`user ${key}`, admin.auth.admin.createUser({
      email: EMAILS[key],
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: `RLS ${key}` },
    }));
    if (!data.user) throw new Error(`setup user ${key}: no user`);
    ids.users[key] = data.user.id;
  }
  await must("role editor", admin.from("profiles").update({ role: "editor" }).eq("id", ids.users.editor).select());

  const rows = await must("opportunities", admin.from("opportunities").insert([
    opp("pub"),
    opp("hidden", { published: false }),
    opp("edit"),
    opp("book"),
    opp("svc"),
  ], { defaultToNull: false }).select("id, slug"));
  const idOf = (k: string) => rows.find((r) => r.slug.startsWith(`${PREFIX}${k}-`))!.id;
  ids.pub = idOf("pub");
  ids.hidden = idOf("hidden");
  ids.edit = idOf("edit");
  ids.book = idOf("book");
  ids.svc = idOf("svc");
  await must("sync_run", admin.from("sync_runs").insert({ source_id: SYNC_SOURCE(), adapter: "rls", ok: true }).select());

  // The second user's own profile and check, written as the service role.
  await must("other profile", admin.from("career_profiles").insert({ profile_id: ids.users.other, major: "RLS other" }).select());
  await must("other check", admin.from("eligibility_checks").insert(checkRow(ids.pub, ids.users.other)).select());
  // The editor's own profile, so "editor cannot read others" is not vacuous.
  await must("editor profile", admin.from("career_profiles").insert({ profile_id: ids.users.editor, major: "RLS editor" }).select());
}

async function signIn(key: Who): Promise<Client> {
  const c = fresh();
  const { error } = await c.auth.signInWithPassword({ email: EMAILS[key], password: PASSWORD });
  if (error) throw new Error(`sign in ${key}: ${error.message}`);
  return c;
}

async function editedAt(id: string): Promise<string | null> {
  const { data, error } = await admin.from("opportunities").select("editor_edited_at").eq("id", id).single();
  if (error) throw new Error(`editor_edited_at: ${error.message}`);
  return data.editor_edited_at;
}

async function visibleSlugs(c: Client): Promise<string[]> {
  const { data, error } = await c.from("opportunities").select("slug").like("slug", `${PREFIX}%`);
  if (error) throw new Error(`opportunities: ${error.message}`);
  return data.map((r) => r.slug);
}

const SYNC_SOURCE = () => `${PREFIX}source-${RUN}`;
const PUB = () => `${PREFIX}pub-${RUN}`;
const HIDDEN = () => `${PREFIX}hidden-${RUN}`;

// ── checks ───────────────────────────────────────────────────────────────

async function anonChecks() {
  const who = "anon";
  const c = fresh();
  await check(who, "reads published opportunities, not hidden", async () => {
    const v = await visibleSlugs(c);
    return v.includes(PUB()) && !v.includes(HIDDEN()) ? true : `saw ${v.join(",")}`;
  });
  await check(who, "cannot insert an opportunity", async () =>
    denied(await c.from("opportunities").insert(opp("anon")).select()));
  await check(who, "reads no sync_runs", async () => {
    const r = await c.from("sync_runs").select("id");
    return r.error || (r.data ?? []).length === 0 ? true : `saw ${r.data!.length}`;
  });
  await check(who, "reads no career_profiles", async () => {
    const r = await c.from("career_profiles").select("profile_id");
    return r.error || (r.data ?? []).length === 0 ? true : `saw ${r.data!.length}`;
  });
  await check(who, "reads no eligibility_checks", async () => {
    const r = await c.from("eligibility_checks").select("profile_id");
    return r.error || (r.data ?? []).length === 0 ? true : `saw ${r.data!.length}`;
  });
}

async function memberChecks() {
  const who = "member";
  const c = await signIn("member");
  const me = ids.users.member;
  await check(who, "reads published opportunities, not hidden", async () => {
    const v = await visibleSlugs(c);
    return v.includes(PUB()) && !v.includes(HIDDEN()) ? true : `saw ${v.join(",")}`;
  });
  await check(who, "cannot insert an opportunity", async () =>
    denied(await c.from("opportunities").insert(opp("member")).select()));
  await check(who, "cannot update an opportunity", async () =>
    denied(await c.from("opportunities").update({ title: "hacked" }).eq("id", ids.pub).select()));
  await check(who, "cannot delete an opportunity", async () =>
    denied(await c.from("opportunities").delete().eq("id", ids.pub).select()));
  await check(who, "reads no sync_runs", async () => {
    const r = await c.from("sync_runs").select("id");
    return r.error || r.data.length === 0 ? true : `saw ${r.data.length}`;
  });
  await check(who, "cannot insert a sync_run", async () =>
    denied(await c.from("sync_runs").insert({ source_id: `${PREFIX}member-${RUN}`, adapter: "rls" }).select()));

  await check(who, "inserts own career_profile", async () =>
    allowed(await c.from("career_profiles").insert({ profile_id: me, major: "RLS member" }).select()));
  await check(who, "reads only own career_profile", async () => {
    const r = await c.from("career_profiles").select("profile_id");
    if (r.error) return r.error.message;
    const seen = r.data.map((x) => x.profile_id);
    return seen.length === 1 && seen[0] === me ? true : `saw ${seen.length} row(s)`;
  });
  await check(who, "updates own career_profile", async () =>
    allowed(await c.from("career_profiles").update({ goals: "RLS goals" }).eq("profile_id", me).select()));
  await check(who, "cannot insert a career_profile for someone else", async () =>
    denied(await c.from("career_profiles").insert({ profile_id: ids.users.editor, major: "x" }).select()));
  await check(who, "cannot update another user's career_profile", async () =>
    denied(await c.from("career_profiles").update({ major: "hacked" }).eq("profile_id", ids.users.other).select()));
  await check(who, "cannot delete another user's career_profile", async () =>
    denied(await c.from("career_profiles").delete().eq("profile_id", ids.users.other).select()));

  await check(who, "inserts own eligibility_check", async () =>
    allowed(await c.from("eligibility_checks").insert(checkRow(ids.pub, me)).select()));
  await check(who, "reads only own eligibility_checks", async () => {
    const r = await c.from("eligibility_checks").select("profile_id");
    if (r.error) return r.error.message;
    const seen = r.data.map((x) => x.profile_id);
    return seen.length === 1 && seen[0] === me ? true : `saw ${seen.length} row(s)`;
  });
  await check(who, "updates own eligibility_check", async () =>
    allowed(await c.from("eligibility_checks").update({ verdict: "eligible" }).eq("profile_id", me).select()));
  await check(who, "cannot insert an eligibility_check for someone else", async () =>
    denied(await c.from("eligibility_checks").insert(checkRow(ids.pub, ids.users.editor)).select()));
  await check(who, "cannot update another user's eligibility_check", async () =>
    denied(await c.from("eligibility_checks").update({ verdict: "not_eligible" }).eq("profile_id", ids.users.other).select()));
  await check(who, "embed returns only own check", async () => {
    const r = await c.from("opportunities").select("id, check:eligibility_checks(profile_id)").eq("id", ids.pub).single();
    if (r.error) return r.error.message;
    const seen = (r.data.check as { profile_id: string }[]).map((x) => x.profile_id);
    return seen.length === 1 && seen[0] === me ? true : `saw ${seen.join(",")}`;
  });
}

async function otherChecks() {
  const who = "second user";
  const c = await signIn("other");
  await check(who, "sees nothing of the member's career_profile", async () => {
    const r = await c.from("career_profiles").select("profile_id").eq("profile_id", ids.users.member);
    return r.error || r.data.length === 0 ? true : `saw ${r.data.length}`;
  });
  await check(who, "sees nothing of the member's eligibility_checks", async () => {
    const r = await c.from("eligibility_checks").select("profile_id").eq("profile_id", ids.users.member);
    return r.error || r.data.length === 0 ? true : `saw ${r.data.length}`;
  });
  await check(who, "still reads own career_profile", async () => {
    const r = await c.from("career_profiles").select("profile_id");
    return !r.error && r.data.length === 1 && r.data[0].profile_id === ids.users.other ? true : `saw ${r.data?.length}`;
  });
}

async function editorChecks() {
  const who = "editor";
  const c = await signIn("editor");
  let created = "";
  await check(who, "reads published and hidden opportunities", async () => {
    const v = await visibleSlugs(c);
    return v.includes(PUB()) && v.includes(HIDDEN()) ? true : `saw ${v.join(",")}`;
  });
  await check(who, "inserts an opportunity (created_by = self)", async () => {
    const r = await c.from("opportunities").insert(opp("editor", { created_by: ids.users.editor })).select("id");
    if (r.data?.[0]) created = r.data[0].id;
    return allowed(r);
  });
  await check(who, "updates an opportunity", async () =>
    allowed(await c.from("opportunities").update({ published: false }).eq("id", ids.pub).select()));
  await check(who, "deletes an opportunity", async () =>
    allowed(await c.from("opportunities").delete().eq("id", created || "00000000-0000-0000-0000-000000000000").select()));
  await check(who, "cannot read another user's career_profile", async () => {
    const r = await c.from("career_profiles").select("profile_id");
    if (r.error) return r.error.message;
    const seen = r.data.map((x) => x.profile_id);
    return seen.length === 1 && seen[0] === ids.users.editor ? true : `saw ${seen.length} row(s)`;
  });
  await check(who, "cannot read another user's eligibility_checks", async () => {
    const r = await c.from("eligibility_checks").select("profile_id");
    return r.error || r.data.length === 0 ? true : `saw ${r.data.length}`;
  });
  await check(who, "cannot update another user's career_profile", async () =>
    denied(await c.from("career_profiles").update({ major: "hacked" }).eq("profile_id", ids.users.member).select()));

  await check(who, "reads sync_runs", async () => {
    const r = await c.from("sync_runs").select("source_id").eq("source_id", SYNC_SOURCE());
    return !r.error && r.data.length === 1 ? true : `saw ${r.data?.length ?? r.error?.message}`;
  });
  await check(who, "cannot insert a sync_run", async () =>
    denied(await c.from("sync_runs").insert({ source_id: `${PREFIX}editor-${RUN}`, adapter: "rls" }).select()));
  await check(who, "cannot update a sync_run", async () =>
    denied(await c.from("sync_runs").update({ ok: false }).eq("source_id", SYNC_SOURCE()).select()));
  await check(who, "cannot delete a sync_run", async () =>
    denied(await c.from("sync_runs").delete().eq("source_id", SYNC_SOURCE()).select()));

  await check(who, "editing summary stamps editor_edited_at", async () => {
    const r = await c.from("opportunities").update({ summary: "Edited by an editor" }).eq("id", ids.edit).select("id");
    const a = allowed(r);
    if (a !== true) return a;
    return (await editedAt(ids.edit)) ? true : "editor_edited_at still null";
  });
  await check(who, "changing only published / verified_on leaves editor_edited_at null", async () => {
    const r = await c.from("opportunities").update({ published: false, verified_on: "2026-10-16" }).eq("id", ids.book).select("id");
    const a = allowed(r);
    if (a !== true) return a;
    const v = await editedAt(ids.book);
    return v === null ? true : `stamped ${v}`;
  });
}

async function serviceChecks() {
  const who = "service role";
  await check(who, "reads every fixture opportunity", async () => {
    const r = await admin.from("opportunities").select("slug").like("slug", `${PREFIX}%`);
    if (r.error) return r.error.message;
    const v = r.data.map((x) => x.slug);
    return v.includes(PUB()) && v.includes(HIDDEN()) ? true : `saw ${v.join(",")}`;
  });
  await check(who, "reads every user's career_profile", async () => {
    const r = await admin.from("career_profiles").select("profile_id").in("profile_id", Object.values(ids.users));
    return !r.error && r.data.length === 3 ? true : `saw ${r.data?.length ?? r.error?.message}`;
  });
  await check(who, "reads every user's eligibility_checks", async () => {
    const r = await admin.from("eligibility_checks").select("profile_id").in("profile_id", Object.values(ids.users));
    return !r.error && r.data.length === 2 ? true : `saw ${r.data?.length ?? r.error?.message}`;
  });
  await check(who, "reads sync_runs", async () => {
    const r = await admin.from("sync_runs").select("id").eq("source_id", SYNC_SOURCE());
    return !r.error && r.data.length === 1 ? true : `saw ${r.data?.length ?? r.error?.message}`;
  });
  await check(who, "editing summary leaves editor_edited_at null", async () => {
    const r = await admin.from("opportunities").update({ summary: "Edited by the sync" }).eq("id", ids.svc).select("id");
    const a = allowed(r);
    if (a !== true) return a;
    const v = await editedAt(ids.svc);
    return v === null ? true : `stamped ${v}`;
  });
  await check(who, "check row cascades with its opportunity", async () => {
    await admin.from("opportunities").delete().eq("id", ids.pub);
    const r = await admin.from("eligibility_checks").select("profile_id").eq("opportunity_id", ids.pub);
    return !r.error && r.data.length === 0 ? true : `left ${r.data?.length ?? r.error?.message}`;
  });
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
  let fatal: Error | null = null;
  try {
    await cleanup(); // leftovers from an interrupted run
    await setup();
    await anonChecks();
    await memberChecks();
    await otherChecks();
    await editorChecks();
    await serviceChecks();
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
