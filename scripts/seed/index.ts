/* One-time seed: the repo's content modules and scripts/seed/assets/ photos → Supabase.
 *
 *   npm run seed
 *
 * Idempotent: every row is upserted on a natural key (slug, path, url,
 * media_id) and every object is uploaded to a deterministic path with
 * upsert, so a second run changes nothing but re-uploads identical bytes.
 * Uses the secret key (bypasses RLS). See scripts/seed/README.md. */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database, TablesInsert } from "../../lib/supabase/database.types";

import { events, recordings } from "./content/events";
import { members } from "./content/members";
import { news } from "./content/news";
import { projects } from "./content/projects";
import { basenameOf, encodeImage, type EncodedImage } from "./images";

config({ path: ".env.local", quiet: true });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
if (!URL || !SECRET || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD (env or .env.local)",
  );
  process.exit(1);
}

type Client = SupabaseClient<Database>;
const db: Client = createClient<Database>(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});
const BUCKET = "media";

// ── helpers ──────────────────────────────────────────────────────────────

function must<T>(what: string, res: { data: T | null; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  if (res.data === null || res.data === undefined) throw new Error(`${what}: no data returned`);
  return res.data;
}

/** Local date parts of a module Date → 'YYYY-MM-DD' (never toISOString, which can shift the day). */
function dateOnly(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** Offset (ms) of America/New_York from UTC at a given instant. */
function nyOffsetMs(instant: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find((x) => x.type === t)?.value);
  const wall = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return wall - instant;
}

/**
 * The modules build events at local midnight because the repo only knows the
 * date. Read the local calendar date and send midnight of that date in
 * America/New_York (the club's zone) as an ISO instant, so the result does not
 * depend on the TZ of the machine running the seed.
 */
function nyMidnightIso(d: Date): string {
  const utcMidnight = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  let instant = utcMidnight - nyOffsetMs(utcMidnight);
  instant = utcMidnight - nyOffsetMs(instant);
  return new Date(instant).toISOString();
}

function kb(n: number): string {
  return n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} KB`;
}

// ── media ────────────────────────────────────────────────────────────────

type SizeRow = { path: string; source: string; original: number; full: number; thumb: number };
const sizes: SizeRow[] = [];
const encoded = new Map<string, Promise<EncodedImage>>();

function encodeOnce(base: string): Promise<EncodedImage> {
  let p = encoded.get(base);
  if (!p) {
    p = encodeImage(base);
    encoded.set(base, p);
  }
  return p;
}

async function upload(path: string, body: Buffer) {
  const { error } = await db.storage.from(BUCKET).upload(path, body, {
    upsert: true, // seed only: deterministic paths, re-runnable
    contentType: "image/webp",
    cacheControl: "31536000",
  });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
}

/** Encode `base`, upload full + thumb to `<stem>.webp` / `<stem>.thumb.webp`, upsert the media row. Returns media.id. */
async function seedMedia(base: string, stem: string, alt: string): Promise<string> {
  const img = await encodeOnce(base);
  const path = `${stem}.webp`;
  const thumbPath = `${stem}.thumb.webp`;
  await upload(path, img.full);
  await upload(thumbPath, img.thumb);
  const row: TablesInsert<"media"> = {
    bucket: BUCKET,
    path,
    thumb_path: thumbPath,
    width: img.width,
    height: img.height,
    bytes: img.full.length,
    mime: "image/webp",
    blur_data_url: img.blurDataUrl,
    alt,
    original_name: img.originalName,
  };
  const saved = await db.from("media").upsert(row, { onConflict: "path" }).select("id").single();
  if (saved.error) throw new Error(`media ${path}: ${saved.error.message}`);
  sizes.push({
    path,
    source: img.source.replace(`${process.cwd()}/`, ""),
    original: img.originalBytes,
    full: img.full.length,
    thumb: img.thumb.length,
  });
  return saved.data.id;
}

// ── content ──────────────────────────────────────────────────────────────

/** The home gallery, in the order app/page.tsx renders it, with alt text written from each photo. */
const GALLERY: { base: string; alt: string }[] = [
  { base: "sp-1", alt: "Members at classroom desks watch the SPARC website presented on a wall screen" },
  { base: "sp-2", alt: "Four members seated along the front of a classroom during a club meeting" },
  { base: "sp-3", alt: "A member points to the SPARC website projected at the front of a classroom as others look on" },
  { base: "sparc-8", alt: "Members working on laptops at long desks in a classroom" },
  { base: "sparc-3", alt: "Members seated in a circle around a projected slide during a discussion" },
  { base: "sparc-5", alt: "Members at rows of desks facing a wall screen showing a document" },
  { base: "sparc-4", alt: "Two members working at a desktop computer below a screen of code" },
  { base: "sparc-6", alt: "Two members lead a session from the front desk with notes on the wall screen" },
  { base: "sparc-7", alt: "A small group coding together on laptops around a meeting table" },
  { base: "sparc-1", alt: "A presenter at a lectern beside a slide titled Phase 1 – Tutoring Sessions" },
  { base: "sparc-2", alt: "A member presents a slide titled Why Build with SPARC? from a lectern" },
  { base: "sparc-contact", alt: "One member points at code on the projector while two others look over a laptop" },
  { base: "sparc-projects", alt: "A member at a laptop in front of a projected campus map" },
  { base: "sparc-vc-1", alt: "Three members smile at a table of laptops during the vibe coding contest" },
  { base: "sparc-vc-2", alt: "Teams at round tables with red chairs as a countdown runs on the wall screens" },
  { base: "sparc-vc-3", alt: "Teams coding at round tables under two countdown screens during the vibe coding contest" },
  { base: "sparc-vc-4", alt: "Group photo of SPARC members in front of a whiteboard after the vibe coding contest" },
  { base: "sparc-vc-5", alt: "SPARC members lined up for a group photo at the front of the classroom" },
  { base: "sparc-vc-6", alt: "Four members stand under a countdown timer showing 24:12" },
  { base: "sparc-vc-7", alt: "Members coding on laptops at a round table, one stretching his arms overhead" },
  { base: "sparc-vc-8", alt: "Wide view of teams coding at round tables with a countdown clock on the wall screens" },
  { base: "sparc-vc-9", alt: "Three members work together on laptops at a round table" },
];
const FEATURED = "sparc-vc-4";

/** Alt text for the news images (two are also gallery photos; vc-10 is news only). */
const NEWS_ALT: Record<string, string> = {
  "sparc-vc-5": "SPARC members lined up for a group photo at the front of the classroom",
  "sparc-vc-10": "A member seated at the front desk while others work at tables behind him",
  "sparc-vc-9": "Three members work together on laptops at a round table",
};

const LINKS: TablesInsert<"links">[] = [
  {
    label: "Discord",
    url: "https://discord.gg/W8veDYAku6",
    description: "Where day-to-day conversation and project coordination happen.",
    icon: "message-circle",
  },
  {
    label: "Apply to SPARC",
    url: "https://docs.google.com/forms/d/e/1FAIpQLScYYJFywXjQNGTlct-dIeZEdtWD25A9lmVbTzhxZm4nOpmlDg/viewform?usp=publish-editor",
    description: "The membership application form.",
    icon: "clipboard-list",
  },
  { label: "GitHub", url: "https://github.com/SU-SPARC", description: "Our code is public.", icon: "github" },
  {
    label: "LinkedIn",
    url: "https://www.linkedin.com/company/suffolk-programming-ai-research-club",
    description: "Club news and member highlights.",
    icon: "linkedin",
  },
  { label: "Email", url: "mailto:sparc@studentorgs.suffolk.edu", description: "sparc@studentorgs.suffolk.edu", icon: "mail" },
  { label: "Website", url: "https://sparc-su.vercel.app", description: "The SPARC website.", icon: "globe" },
].map((l, i) => ({ ...l, sort_order: (i + 1) * 10, published: true }));

const counts: Record<string, number> = {};
const bump = (k: string, n = 1) => (counts[k] = (counts[k] ?? 0) + n);

/** recordings.url and links.url have no unique constraint, so "upsert by url"
 *  is: find the row with that url, update it, or insert a new one. */
async function findByUrl(table: "recordings" | "links", url: string): Promise<string | null> {
  const found = must(`${table} lookup`, await db.from(table).select("id").eq("url", url));
  if (found.length > 1) throw new Error(`${table}: ${found.length} rows share url ${url}`);
  return found[0]?.id ?? null;
}

async function upsertRecording(row: TablesInsert<"recordings">) {
  const id = await findByUrl("recordings", row.url);
  if (id) must("recordings update", await db.from("recordings").update(row).eq("id", id).select("id"));
  else must("recordings insert", await db.from("recordings").insert(row).select("id"));
}

async function upsertLink(row: TablesInsert<"links">) {
  const id = await findByUrl("links", row.url);
  if (id) must("links update", await db.from("links").update(row).eq("id", id).select("id"));
  else must("links insert", await db.from("links").insert(row).select("id"));
}

// ── steps ────────────────────────────────────────────────────────────────

async function seedAdmin() {
  let userId: string | null = null;
  for (let page = 1; userId === null; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === ADMIN_EMAIL!.toLowerCase());
    if (hit) userId = hit.id;
    if (data.users.length < 1000) break;
  }
  let created = false;
  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({
      email: ADMIN_EMAIL!,
      password: ADMIN_PASSWORD!,
      email_confirm: true,
      user_metadata: { display_name: "SPARC E-Board" },
    });
    if (error) throw new Error(`createUser: ${error.message}`);
    userId = data.user.id;
    created = true;
  }
  must(
    "profiles update",
    await db.from("profiles").update({ role: "admin", display_name: "SPARC E-Board" }).eq("id", userId).select("id").single(),
  );
  bump("admin profile");
  console.log(`admin ${ADMIN_EMAIL}: ${created ? "created" : "exists"}, role=admin`);
}

async function seedMembers() {
  for (const m of members) {
    const photoId = m.photo
      ? await seedMedia(basenameOf(m.photo), `members/${m.slug}`, `Portrait of ${m.name}`)
      : null;
    const row: TablesInsert<"members"> = {
      slug: m.slug,
      name: m.name,
      nickname: m.nickname,
      photo_media_id: photoId,
      class_year: m.class_year,
      status: m.status,
      role: m.role,
      role_term: m.role_term,
      role_history: m.role_history,
      badges: m.badges,
      participated: m.participated,
      bio: m.bio,
      linkedin: m.linkedin,
      website: m.website,
      eboard: m.sort_order < 100,
      sort_order: m.sort_order,
      published: true,
    };
    must(`members ${m.slug}`, await db.from("members").upsert(row, { onConflict: "slug" }).select("id"));
    bump("members");
  }
}

async function seedProjects() {
  for (const p of projects) {
    if (p.gallery.length > 0) throw new Error(`project ${p.slug} has gallery images; the seed does not map them yet`);
    const coverId = p.cover
      ? await seedMedia(basenameOf(p.cover), `projects/${p.slug}-cover`, `Home screen of ${p.title}`)
      : null;
    const row: TablesInsert<"projects"> = {
      ref: p.ref,
      slug: p.slug,
      title: p.title,
      kind: p.kind,
      status: p.status,
      term: p.term,
      summary: p.summary,
      highlights: p.highlights,
      cover_media_id: coverId,
      repo_url: p.repo_url,
      live_url: p.live_url,
      sort_order: p.sort_order,
      methodology: "kanban",
      supervisor_kind: null,
      supervisor_member_id: null,
      supervisor_name: null,
      published: true,
    };
    must(`projects ${p.slug}`, await db.from("projects").upsert(row, { onConflict: "slug" }).select("id"));
    bump("projects");
  }
}

async function seedEvents() {
  for (const e of events) {
    const row: TablesInsert<"events"> = {
      ref: e.ref,
      slug: e.slug,
      title: e.title,
      kind: e.kind,
      starts_at: nyMidnightIso(e.starts_at),
      location: e.location,
      description: e.description,
      recording_url: e.recording_url,
      published: true,
    };
    must(`events ${e.slug}`, await db.from("events").upsert(row, { onConflict: "slug" }).select("id"));
    bump("events");
  }
}

async function seedRecordings() {
  for (const [i, r] of recordings.entries()) {
    await upsertRecording({
      title: r.title,
      recorded_on: dateOnly(r.date),
      kind: r.kind,
      url: r.link,
      description: r.description,
      event_id: null,
      sort_order: (i + 1) * 10,
      published: true,
    });
    bump("recordings");
  }
}

async function seedNews() {
  for (const n of news) {
    const base = basenameOf(n.image);
    const alt = NEWS_ALT[base];
    if (!alt) throw new Error(`news ${n.slug}: no alt text for image ${base}`);
    const mediaId = await seedMedia(base, `news/${n.slug}`, alt);
    const row: TablesInsert<"news"> = {
      slug: n.slug,
      title: n.title,
      published_on: dateOnly(n.date),
      media_id: mediaId,
      published: true,
    };
    must(`news ${n.slug}`, await db.from("news").upsert(row, { onConflict: "slug" }).select("id"));
    bump("news");
  }
}

async function seedPhotos() {
  for (const [i, g] of GALLERY.entries()) {
    const mediaId = await seedMedia(g.base, `photos/${g.base}`, g.alt);
    const row: TablesInsert<"photos"> = {
      media_id: mediaId,
      caption: null,
      sort_order: (i + 1) * 10,
      featured: g.base === FEATURED,
      published: true,
    };
    must(`photos ${g.base}`, await db.from("photos").upsert(row, { onConflict: "media_id" }).select("id"));
    bump("photos");
  }
}

async function seedLinks() {
  for (const l of LINKS) {
    await upsertLink(l);
    bump("links");
  }
}

// ── main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${URL}\n`);
  await seedAdmin();
  await seedMembers();
  await seedProjects();
  await seedEvents();
  await seedRecordings();
  await seedNews();
  await seedPhotos();
  await seedLinks();
  bump("media", sizes.length);

  console.log("\nRows upserted");
  console.table(Object.entries(counts).map(([kind, rows]) => ({ kind, rows })));

  console.log("Images (original → full / thumb)");
  console.table(
    sizes.map((s) => ({
      path: s.path,
      source: s.source,
      original: kb(s.original),
      full: kb(s.full),
      thumb: kb(s.thumb),
    })),
  );
  const total = (k: "original" | "full" | "thumb") => sizes.reduce((a, s) => a + s[k], 0);
  console.log(
    `Totals: ${sizes.length} images, original ${kb(total("original"))} → full ${kb(total("full"))} + thumb ${kb(total("thumb"))}`,
  );
  const sample = sizes.find((s) => s.path === `photos/${FEATURED}.webp`) ?? sizes[0];
  if (sample) {
    console.log(`Sample: ${db.storage.from(BUCKET).getPublicUrl(sample.path).data.publicUrl}`);
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
