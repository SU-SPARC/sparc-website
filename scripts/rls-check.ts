/* RLS / grants / storage-policy check against the LOCAL Supabase stack.
 *
 *   npm run rls:check
 *
 * Creates throwaway users (rls-*@test.local) and rows (slugs/refs prefixed
 * "rls-"), signs in as each role with a fresh publishable-key client, asserts
 * what each may and may not do, prints a PASS/FAIL table and removes everything
 * it created, also on failure. Exit code 0 only when every check passes.
 *
 * Never point this at production: it creates and deletes auth users. */

import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import sharp from "sharp";

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
const opts = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin: Client = createClient<Database>(URL, SECRET, opts);
const fresh = (): Client => createClient<Database>(URL, PUBLISHABLE, opts);

const RUN = randomBytes(3).toString("hex");
const PASSWORD = `rls-${randomBytes(9).toString("base64url")}`;
const EMAILS = {
  admin: "rls-admin@test.local",
  editor: "rls-editor@test.local",
  member: "rls-member@test.local",
  linked: "rls-linked@test.local",
  invite: "rls-invite@test.local",
  signup: "rls-signup@test.local",
} as const;

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
function denied(res: { error: { code?: string; message: string } | null; data: unknown[] | null }): true | string {
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

/** A call must fail with an error (optionally a given SQLSTATE). */
function errors(res: { error: { code?: string; message: string } | null }, code?: string): true | string {
  if (!res.error) return "succeeded, expected an error";
  if (code && res.error.code !== code) return `error ${res.error.code} (${res.error.message}), expected ${code}`;
  return true;
}

// ── fixtures ─────────────────────────────────────────────────────────────

const ids = {
  users: {} as Record<keyof typeof EMAILS, string | undefined>,
  media: "" as string,
  cardLinked: "",
  cardOther: "",
  cardHidden: "",
  projPublic: "",
  projHidden: "",
  projProposed: "",
  event: "",
  eventHidden: "",
};
const storagePaths: string[] = [];
let webp: Buffer;

async function cleanup() {
  // Rows first (FK order), then storage objects, then users.
  const like = (col: string) => `${col}.like.rls-%`;
  await admin.from("project_gallery").delete().in("project_id",
    ((await admin.from("projects").select("id").or(`${like("slug")},${like("ref")}`)).data ?? []).map((r) => r.id));
  await admin.from("news").delete().like("slug", "rls-%");
  await admin.from("photos").delete().like("caption", "rls-%");
  await admin.from("projects").delete().or(`${like("slug")},${like("ref")}`);
  await admin.from("recordings").delete().like("title", "rls-%");
  await admin.from("events").delete().like("slug", "rls-%");
  await admin.from("links").delete().like("label", "rls-%");
  await admin.from("members").delete().like("slug", "rls-%");
  const media = (await admin.from("media").select("id, path").like("original_name", "rls-%")).data ?? [];
  await admin.from("media").delete().in("id", media.map((m) => m.id));
  const objects = new Set([...storagePaths]);
  for (const folder of ["members", "photos", "events"]) {
    const { data } = await admin.storage.from("media").list(folder, { search: "rls-" });
    for (const o of data ?? []) objects.add(`${folder}/${o.name}`);
  }
  if (objects.size) await admin.storage.from("media").remove([...objects]);

  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const ours = new Set<string>(Object.values(EMAILS));
  for (const u of list?.users ?? []) {
    if (u.email && ours.has(u.email)) await admin.auth.admin.deleteUser(u.id);
  }
}

async function must<T>(label: string, p: PromiseLike<{ data: T; error: { message: string } | null }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error || data == null) throw new Error(`setup ${label}: ${error?.message ?? "no data"}`);
  return data as NonNullable<T>;
}

async function setup() {
  webp = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .webp()
    .toBuffer();

  for (const key of ["admin", "editor", "member", "linked"] as const) {
    const data = await must(`user ${key}`, admin.auth.admin.createUser({
      email: EMAILS[key],
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { display_name: `RLS ${key}` },
    }));
    ids.users[key] = data.user.id;
  }
  await must("role admin", admin.from("profiles").update({ role: "admin" }).eq("id", ids.users.admin!).select());
  await must("role editor", admin.from("profiles").update({ role: "editor" }).eq("id", ids.users.editor!).select());

  const media = await must("media", admin.from("media").insert({
    path: `rls/${RUN}.webp`, width: 2, height: 2, alt: "rls", original_name: "rls-fixture",
  }).select().single());
  ids.media = media.id;

  const cards = await must("members", admin.from("members").insert([
    { slug: `rls-linked-${RUN}`, name: "RLS Linked", class_year: 2027 },
    { slug: `rls-other-${RUN}`, name: "RLS Other", class_year: 2027 },
    { slug: `rls-hidden-${RUN}`, name: "RLS Hidden", class_year: 2027, published: false },
  ], { defaultToNull: false }).select());
  [ids.cardLinked, ids.cardOther, ids.cardHidden] = cards.map((c) => c.id);
  await must("link", admin.from("profiles").update({ member_id: ids.cardLinked }).eq("id", ids.users.linked!).select());

  const projects = await must("projects", admin.from("projects").insert([
    { ref: `rls-P1-${RUN}`, slug: `rls-p1-${RUN}`, title: "RLS public", term: "Fall 2026", status: "completed", published: true },
    { ref: `rls-P2-${RUN}`, slug: `rls-p2-${RUN}`, title: "RLS hidden", term: "Fall 2026", status: "completed", published: false },
    { ref: `rls-P3-${RUN}`, slug: `rls-p3-${RUN}`, title: "RLS proposed", term: "Fall 2026", status: "proposed", published: true },
  ], { defaultToNull: false }).select());
  [ids.projPublic, ids.projHidden, ids.projProposed] = projects.map((p) => p.id);

  const events = await must("events", admin.from("events").insert([
    { ref: `rls-E1-${RUN}`, slug: `rls-e1-${RUN}`, title: "RLS event", kind: "Panel", starts_at: "2026-11-01T22:00:00Z" },
    { ref: `rls-E2-${RUN}`, slug: `rls-e2-${RUN}`, title: "RLS hidden event", kind: "Panel", starts_at: "2026-11-02T22:00:00Z", published: false },
  ], { defaultToNull: false }).select());
  [ids.event, ids.eventHidden] = events.map((e) => e.id);

  await must("recordings", admin.from("recordings").insert([
    { title: `rls-rec-${RUN}`, recorded_on: "2026-10-01", url: "https://example.com/r" },
    { title: `rls-rec-hidden-${RUN}`, recorded_on: "2026-10-02", url: "https://example.com/r2", published: false },
  ], { defaultToNull: false }).select());
  await must("news", admin.from("news").insert([
    { slug: `rls-n1-${RUN}`, title: "RLS news", published_on: "2026-10-01", media_id: ids.media },
    { slug: `rls-n2-${RUN}`, title: "RLS hidden news", published_on: "2026-10-02", media_id: ids.media, published: false },
  ], { defaultToNull: false }).select());
  await must("photos", admin.from("photos").insert(
    { caption: `rls-photo-${RUN}`, media_id: ids.media },
  ).select());
  await must("links", admin.from("links").insert([
    { label: `rls-l1-${RUN}`, url: "https://example.com" },
    { label: `rls-l2-${RUN}`, url: "https://example.com/hidden", published: false },
  ], { defaultToNull: false }).select());
}

async function signIn(key: keyof typeof EMAILS): Promise<Client> {
  const c = fresh();
  const { error } = await c.auth.signInWithPassword({ email: EMAILS[key], password: PASSWORD });
  if (error) throw new Error(`sign in ${key}: ${error.message}`);
  return c;
}

/** Which of our fixture rows a client can see in a table, by a text column. */
async function visible(c: Client, table: "members" | "events" | "news" | "links" | "recordings" | "projects", col: string) {
  const { data, error } = await c.from(table).select(col).like(col, "rls-%");
  if (error) throw new Error(`${table}: ${error.message}`);
  return ((data ?? []) as unknown as Record<string, string>[]).map((r) => r[col]);
}

// ── checks ───────────────────────────────────────────────────────────────

async function anonChecks() {
  const who = "anon";
  const c = fresh();
  await check(who, "reads published members, not unpublished", async () => {
    const v = await visible(c, "members", "slug");
    return v.includes(`rls-other-${RUN}`) && !v.includes(`rls-hidden-${RUN}`) ? true : `saw ${v.join(",")}`;
  });
  await check(who, "reads public projects only (not unpublished, not proposed)", async () => {
    const v = await visible(c, "projects", "ref");
    return v.length === 1 && v[0] === `rls-P1-${RUN}` ? true : `saw ${v.join(",")}`;
  });
  for (const [table, col, yes, no] of [
    ["events", "slug", `rls-e1-${RUN}`, `rls-e2-${RUN}`],
    ["news", "slug", `rls-n1-${RUN}`, `rls-n2-${RUN}`],
    ["links", "label", `rls-l1-${RUN}`, `rls-l2-${RUN}`],
    ["recordings", "title", `rls-rec-${RUN}`, `rls-rec-hidden-${RUN}`],
  ] as const) {
    await check(who, `reads published ${table}, not unpublished`, async () => {
      const v = await visible(c, table, col);
      return v.includes(yes) && !v.includes(no) ? true : `saw ${v.join(",")}`;
    });
  }
  await check(who, "reads photos and media", async () => {
    const p = await c.from("photos").select("id").like("caption", "rls-%");
    const m = await c.from("media").select("id").eq("id", ids.media);
    return p.data?.length === 1 && m.data?.length === 1 ? true : `photos ${p.data?.length} media ${m.data?.length}`;
  });
  await check(who, "cannot insert members", async () =>
    denied(await c.from("members").insert({ slug: `rls-anon-${RUN}`, name: "x", class_year: 2027 }).select()));
  await check(who, "cannot insert events/news/links/media", async () => {
    const r = [
      denied(await c.from("events").insert({ ref: `rls-x-${RUN}`, slug: `rls-x-${RUN}`, title: "x", kind: "x", starts_at: "2026-01-01T00:00:00Z" }).select()),
      denied(await c.from("news").insert({ slug: `rls-x-${RUN}`, title: "x", published_on: "2026-01-01", media_id: ids.media }).select()),
      denied(await c.from("links").insert({ label: `rls-x-${RUN}`, url: "x" }).select()),
      denied(await c.from("media").insert({ path: `members/rls-x-${RUN}.webp`, width: 1, height: 1 }).select()),
    ];
    return r.every((x) => x === true) ? true : r.filter((x) => x !== true).join("; ");
  });
  await check(who, "cannot insert projects (even proposed)", async () =>
    denied(await c.from("projects").insert({ ref: `rls-x-${RUN}`, slug: `rls-x-${RUN}`, title: "x", term: "x", status: "proposed" }).select()));
  await check(who, "cannot update members", async () =>
    denied(await c.from("members").update({ bio: "hacked" }).eq("id", ids.cardOther).select()));
  await check(who, "cannot delete links", async () =>
    denied(await c.from("links").delete().like("label", "rls-%").select()));
  await check(who, "cannot read profiles", async () => {
    const r = await c.from("profiles").select("id");
    return r.error || (r.data ?? []).length === 0 ? true : `saw ${r.data?.length} profiles`;
  });
  await check(who, "cannot read people view", async () => {
    const r = await c.from("people").select("id");
    return r.error || (r.data ?? []).length === 0 ? true : `saw ${r.data?.length} people`;
  });
  await check(who, "cannot call admin_set_role", async () =>
    errors(await c.rpc("admin_set_role", { target: ids.users.member!, new_role: "admin" })));
  await check(who, "cannot upload to storage", async () =>
    errors(await c.storage.from("media").upload(`members/rls-anon-${RUN}.webp`, webp, { contentType: "image/webp" })));
}

async function memberChecks() {
  const who = "member";
  const c = await signIn("member");
  await check(who, "reads published members, not unpublished", async () => {
    const v = await visible(c, "members", "slug");
    return v.includes(`rls-other-${RUN}`) && !v.includes(`rls-hidden-${RUN}`) ? true : `saw ${v.join(",")}`;
  });
  await check(who, "does not read unpublished events/news/links", async () => {
    const e = await visible(c, "events", "slug");
    const n = await visible(c, "news", "slug");
    const l = await visible(c, "links", "label");
    return !e.includes(`rls-e2-${RUN}`) && !n.includes(`rls-n2-${RUN}`) && !l.includes(`rls-l2-${RUN}`)
      ? true : "saw an unpublished row";
  });
  await check(who, "reads all projects incl. unpublished and proposed", async () => {
    const v = await visible(c, "projects", "ref");
    return v.length === 3 ? true : `saw ${v.join(",")}`;
  });
  await check(who, "cannot update another member card", async () =>
    denied(await c.from("members").update({ bio: "hacked" }).eq("id", ids.cardOther).select()));
  await check(who, "cannot change own role", async () =>
    errors(await c.from("profiles").update({ role: "admin" } as never).eq("id", ids.users.member!).select()));
  await check(who, "cannot change own member_id", async () =>
    errors(await c.from("profiles").update({ member_id: ids.cardOther } as never).eq("id", ids.users.member!).select()));
  await check(who, "can update own display_name", async () =>
    allowed(await c.from("profiles").update({ display_name: "RLS Member Renamed" }).eq("id", ids.users.member!).select()));
  await check(who, "reads only own profile", async () => {
    const r = await c.from("profiles").select("id");
    return r.data?.length === 1 && r.data[0].id === ids.users.member ? true : `saw ${r.data?.length ?? r.error?.message}`;
  });
  await check(who, "reads people view (all accounts)", async () => {
    const r = await c.from("people").select("id").in("id", Object.values(ids.users).filter(Boolean) as string[]);
    return (r.data?.length ?? 0) >= 4 ? true : `saw ${r.data?.length ?? r.error?.message}`;
  });
  let requestId = "";
  await check(who, "can insert a proposed project with requested_by = self", async () => {
    const r = await c.from("projects").insert({
      ref: `rls-REQ-${RUN}`, slug: `rls-req-${RUN}`, title: "RLS request", term: "Fall 2026",
      status: "proposed", published: false, requested_by: ids.users.member!,
    }).select();
    requestId = r.data?.[0]?.id ?? "";
    return allowed(r);
  });
  await check(who, "cannot insert a non-proposed project", async () =>
    denied(await c.from("projects").insert({
      ref: `rls-BAD-${RUN}`, slug: `rls-bad-${RUN}`, title: "x", term: "x",
      status: "completed", published: false, requested_by: ids.users.member!,
    }).select()));
  await check(who, "cannot insert a published request", async () =>
    denied(await c.from("projects").insert({
      ref: `rls-BAD2-${RUN}`, slug: `rls-bad2-${RUN}`, title: "x", term: "x",
      status: "proposed", published: true, requested_by: ids.users.member!,
    }).select()));
  await check(who, "cannot insert a request for someone else", async () =>
    denied(await c.from("projects").insert({
      ref: `rls-BAD3-${RUN}`, slug: `rls-bad3-${RUN}`, title: "x", term: "x",
      status: "proposed", published: false, requested_by: ids.users.editor!,
    }).select()));
  await check(who, "can edit own pending request's title/summary", async () =>
    allowed(await c.from("projects").update({ title: "RLS request v2", summary: "s" }).eq("id", requestId).select()));
  await check(who, "cannot approve own request (status)", async () =>
    denied(await c.from("projects").update({ status: "in_progress" }).eq("id", requestId).select()));
  await check(who, "cannot change own request's ref/term (trigger)", async () =>
    errors(await c.from("projects").update({ term: "Spring 2099" }).eq("id", requestId).select(), "42501"));
  await check(who, "cannot edit a non-request project", async () =>
    denied(await c.from("projects").update({ title: "hacked" }).eq("id", ids.projPublic).select()));
  await check(who, "cannot upload to storage", async () =>
    errors(await c.storage.from("media").upload(`members/rls-member-${RUN}.webp`, webp, { contentType: "image/webp" })));
  await check(who, "cannot insert a media row", async () =>
    denied(await c.from("media").insert({ path: `members/rls-m-${RUN}.webp`, width: 1, height: 1, original_name: "rls-x" }).select()));
  await check(who, "cannot call admin_set_role", async () =>
    errors(await c.rpc("admin_set_role", { target: ids.users.member!, new_role: "editor" }), "42501"));
  await check(who, "cannot call admin_link_member", async () =>
    errors(await c.rpc("admin_link_member", { target: ids.users.member!, member: ids.cardOther }), "42501"));
}

async function linkedChecks() {
  const who = "linked";
  const c = await signIn("linked");
  await check(who, "can update own card's bio/nickname/website", async () =>
    allowed(await c.from("members").update({ bio: "my bio", nickname: "Linky", website: "https://example.com" }).eq("id", ids.cardLinked).select()));
  await check(who, "cannot update own card's role (trigger 42501)", async () =>
    errors(await c.from("members").update({ role: "President" }).eq("id", ids.cardLinked).select(), "42501"));
  await check(who, "cannot update own card's sort_order (trigger 42501)", async () =>
    errors(await c.from("members").update({ sort_order: 1 }).eq("id", ids.cardLinked).select(), "42501"));
  await check(who, "cannot set own card's eboard (trigger 42501)", async () =>
    errors(await c.from("members").update({ eboard: true }).eq("id", ids.cardLinked).select(), "42501"));
  await check(who, "cannot update another card", async () =>
    denied(await c.from("members").update({ bio: "hacked" }).eq("id", ids.cardOther).select()));
  const path = `members/rls-linked-${RUN}.webp`;
  await check(who, "can upload under members/", async () => {
    const r = await c.storage.from("media").upload(path, webp, { contentType: "image/webp", cacheControl: "31536000" });
    if (!r.error) storagePaths.push(path);
    return r.error ? `error: ${r.error.message}` : true;
  });
  let mediaId = "";
  await check(who, "can insert the matching media row", async () => {
    const r = await c.from("media").insert({ path, width: 2, height: 2, alt: "me", original_name: "rls-linked" }).select();
    mediaId = r.data?.[0]?.id ?? "";
    return allowed(r);
  });
  await check(who, "can set own card's photo_media_id", async () =>
    allowed(await c.from("members").update({ photo_media_id: mediaId }).eq("id", ids.cardLinked).select()));
  await check(who, "cannot insert a media row outside members/", async () =>
    denied(await c.from("media").insert({ path: `photos/rls-l-${RUN}.webp`, width: 1, height: 1, original_name: "rls-x" }).select()));
  await check(who, "cannot upload under photos/", async () => {
    const r = await c.storage.from("media").upload(`photos/rls-linked-${RUN}.webp`, webp, { contentType: "image/webp" });
    if (!r.error) storagePaths.push(`photos/rls-linked-${RUN}.webp`);
    return errors(r);
  });
  await check(who, "cannot delete storage objects", async () => {
    await c.storage.from("media").remove([path]);
    const { data } = await admin.storage.from("media").list("members", { search: `rls-linked-${RUN}` });
    return (data ?? []).length === 1 ? true : "object was deleted";
  });
}

async function editorChecks() {
  const who = "editor";
  const c = await signIn("editor");
  await check(who, "reads unpublished rows", async () => {
    const m = await visible(c, "members", "slug");
    const e = await visible(c, "events", "slug");
    const n = await visible(c, "news", "slug");
    const l = await visible(c, "links", "label");
    return m.includes(`rls-hidden-${RUN}`) && e.includes(`rls-e2-${RUN}`) && n.includes(`rls-n2-${RUN}`) && l.includes(`rls-l2-${RUN}`)
      ? true : "missing an unpublished row";
  });
  // storage first so the media row can point at a real object
  const path = `photos/rls-editor-${RUN}.webp`;
  await check(who, "can upload to storage", async () => {
    const r = await c.storage.from("media").upload(path, webp, { contentType: "image/webp", cacheControl: "31536000" });
    if (!r.error) storagePaths.push(path);
    return r.error ? `error: ${r.error.message}` : true;
  });
  await check(who, "storage rejects a disallowed MIME type", async () => {
    const r = await c.storage.from("media").upload(`photos/rls-editor-${RUN}.txt`, Buffer.from("x"), { contentType: "text/plain" });
    if (!r.error) storagePaths.push(`photos/rls-editor-${RUN}.txt`);
    return errors(r);
  });
  let mediaId = "";
  await check(who, "media: insert/update", async () => {
    const r = await c.from("media").insert({ path, width: 2, height: 2, alt: "a", original_name: "rls-editor" }).select();
    mediaId = r.data?.[0]?.id ?? "";
    const a = allowed(r);
    if (a !== true) return a;
    return allowed(await c.from("media").update({ alt: "b" }).eq("id", mediaId).select());
  });

  const crud = async (
    table: "members" | "events" | "recordings" | "news" | "photos" | "links" | "projects",
    row: Record<string, unknown>,
    patch: Record<string, unknown>,
  ) => {
    await check(who, `${table}: insert/update/delete`, async () => {
      const ins = await c.from(table).insert(row as never).select();
      const a = allowed(ins);
      if (a !== true) return `insert ${a}`;
      const id = (ins.data![0] as { id: string }).id;
      const up = allowed(await c.from(table).update(patch as never).eq("id", id).select());
      if (up !== true) return `update ${up}`;
      const del = allowed(await c.from(table).delete().eq("id", id).select());
      return del === true ? true : `delete ${del}`;
    });
  };
  await crud("members", { slug: `rls-ed-${RUN}`, name: "x", class_year: 2027, published: false }, { sort_order: 5, eboard: true, role: "Treasurer" });
  await crud("events", { ref: `rls-ed-${RUN}`, slug: `rls-ed-${RUN}`, title: "x", kind: "Panel", starts_at: "2026-12-01T23:00:00Z" }, { published: false });
  await crud("recordings", { title: `rls-ed-${RUN}`, recorded_on: "2026-12-01", url: "https://example.com" }, { event_id: ids.event });
  await crud("news", { slug: `rls-ed-${RUN}`, title: "x", published_on: "2026-12-01", media_id: ids.media }, { title: "y" });
  await crud("photos", { caption: `rls-ed-${RUN}`, media_id: mediaId }, { featured: true });
  await crud("links", { label: `rls-ed-${RUN}`, url: "https://example.com" }, { sort_order: 1 });
  await crud("projects", { ref: `rls-ed-${RUN}`, slug: `rls-ed-${RUN}`, title: "x", term: "Fall 2026", status: "in_progress" }, { published: true, status: "completed" });
  await check(who, "project_gallery: insert/delete", async () => {
    const a = allowed(await c.from("project_gallery").insert({ project_id: ids.projPublic, media_id: ids.media }).select());
    if (a !== true) return `insert ${a}`;
    return allowed(await c.from("project_gallery").delete().eq("project_id", ids.projPublic).select());
  });
  await check(who, "can approve a request (status/ref/published)", async () =>
    allowed(await c.from("projects").update({ status: "in_progress", approved_by: ids.users.editor!, approved_at: new Date().toISOString() })
      .eq("ref", `rls-REQ-${RUN}`).select()));
  await check(who, "can edit any member card's sort_order", async () =>
    allowed(await c.from("members").update({ sort_order: 7 }).eq("id", ids.cardLinked).select()));
  await check(who, "media: delete", async () =>
    allowed(await c.from("media").delete().eq("id", mediaId).select()));
  await check(who, "can remove storage objects", async () => {
    const r = await c.storage.from("media").remove([path]);
    if (r.error) return `error: ${r.error.message}`;
    return r.data.length === 1 ? true : `removed ${r.data.length}`;
  });
  await check(who, "reads only own profile", async () => {
    const r = await c.from("profiles").select("id");
    return r.data?.length === 1 ? true : `saw ${r.data?.length ?? r.error?.message}`;
  });
  await check(who, "cannot call admin_set_role", async () =>
    errors(await c.rpc("admin_set_role", { target: ids.users.member!, new_role: "editor" }), "42501"));
  await check(who, "cannot change own role directly", async () =>
    errors(await c.from("profiles").update({ role: "admin" } as never).eq("id", ids.users.editor!).select()));
}

async function adminChecks() {
  const who = "admin";
  const c = await signIn("admin");
  await check(who, "reads all profiles", async () => {
    const r = await c.from("profiles").select("id").in("id", Object.values(ids.users).filter(Boolean) as string[]);
    return (r.data?.length ?? 0) >= 4 ? true : `saw ${r.data?.length ?? r.error?.message}`;
  });
  await check(who, "admin_set_role works", async () => {
    const r = await c.rpc("admin_set_role", { target: ids.users.member!, new_role: "editor" });
    if (r.error) return `error: ${r.error.message}`;
    const { data } = await admin.from("profiles").select("role").eq("id", ids.users.member!).single();
    if (data?.role !== "editor") return `role is ${data?.role}`;
    await c.rpc("admin_set_role", { target: ids.users.member!, new_role: "member" });
    return true;
  });
  await check(who, "admin_set_role refuses self-demotion", async () =>
    errors(await c.rpc("admin_set_role", { target: ids.users.admin!, new_role: "member" }), "42501"));
  await check(who, "admin_link_member works (link + unlink)", async () => {
    const r = await c.rpc("admin_link_member", { target: ids.users.member!, member: ids.cardOther });
    if (r.error) return `error: ${r.error.message}`;
    const { data } = await admin.from("profiles").select("member_id").eq("id", ids.users.member!).single();
    if (data?.member_id !== ids.cardOther) return `member_id is ${data?.member_id}`;
    const u = await c.rpc("admin_link_member", { target: ids.users.member!, member: null as unknown as string });
    return u.error ? `unlink error: ${u.error.message}` : true;
  });
}

async function authChecks() {
  const who = "auth";
  await check(who, "public signUp is rejected", async () => {
    const r = await fresh().auth.signUp({ email: EMAILS.signup, password: PASSWORD });
    if (!r.error) return "signUp succeeded";
    return true;
  });
  await check(who, "admin createUser works with signup disabled", async () =>
    ids.users.member ? true : "createUser failed in setup");
  await check(who, "invite → verifyOtp → set password → sign in", async () => {
    const link = await admin.auth.admin.generateLink({ type: "invite", email: EMAILS.invite });
    if (link.error) return `generateLink: ${link.error.message}`;
    ids.users.invite = link.data.user.id;
    const tokenHash = link.data.properties.hashed_token;
    const c = fresh();
    const v = await c.auth.verifyOtp({ type: "invite", token_hash: tokenHash });
    if (v.error || !v.data.session) return `verifyOtp: ${v.error?.message ?? "no session"}`;
    const u = await c.auth.updateUser({ password: PASSWORD });
    if (u.error) return `updateUser: ${u.error.message}`;
    const s = await fresh().auth.signInWithPassword({ email: EMAILS.invite, password: PASSWORD });
    if (s.error) return `signIn: ${s.error.message}`;
    const p = await admin.from("profiles").select("role").eq("id", ids.users.invite).single();
    return p.data?.role === "member" ? true : `profile role ${p.data?.role ?? p.error?.message}`;
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
    await linkedChecks();
    await editorChecks();
    await adminChecks();
    await authChecks();
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
