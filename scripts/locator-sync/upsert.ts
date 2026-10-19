/* Locator sync: writes one source's items into `opportunities` under the
 * column-ownership rules of docs/LOCATOR-SYNC.md, closes listings a successful
 * full run no longer returns, and records `sync_runs`. Service role only.
 *
 *   always from the source   title, url, location, pay, posting_site, posted_at,
 *                            starts_on, ends_on, deadline_on, last_seen_at
 *   until an editor edits    summary, description, eligibility, tags, area, format,
 *                            internship_terms, job_type (0006), dates_note, organizer_url,
 *                            opens_on, team_size, prizes, provided (0005)
 *   set once on insert       kind, slug, organizer, source = 'sync', source_name,
 *                            source_url, external_id, first_seen_at, published = true
 *   published                untouched, except a closed row that comes back (re-opened)
 *
 * The partial unique index on (source_name, external_id) cannot be named in a
 * PostgREST on_conflict, so the "upsert" is a read of the source's rows, an
 * insert of the new ones and an update per existing one. */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, TablesInsert, TablesUpdate } from "../../lib/supabase/database.types";
import { syncSlug } from "./normalize";
import type { SyncItem } from "./types";

type Db = SupabaseClient<Database>;
type Existing = { id: string; external_id: string; editor_edited_at: string | null; closed_at: string | null };

export type WriteCounts = { inserted: number; updated: number; closed: number; reopened: number; failed: number };

const PAGE = 1000;
const INSERT_CHUNK = 200;
const UPDATE_CONCURRENCY = 8;

function likePrefix(prefix: string): string {
  return `${prefix.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

async function existingRows(db: Db, sourceName: string, prefix: string): Promise<Existing[]> {
  const out: Existing[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("opportunities")
      .select("id, external_id, editor_edited_at, closed_at")
      .eq("source_name", sourceName)
      .like("external_id", likePrefix(prefix))
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`read existing rows: ${error.message}`);
    out.push(...(data as Existing[]));
    if (data.length < PAGE) return out;
  }
}

function alwaysColumns(i: SyncItem, now: string) {
  return {
    title: i.title,
    url: i.url,
    location: i.location,
    pay: i.pay,
    posting_site: i.posting_site,
    posted_at: i.posted_at,
    starts_on: i.starts_on,
    ends_on: i.ends_on,
    deadline_on: i.deadline_on,
    last_seen_at: now,
  } satisfies TablesUpdate<"opportunities">;
}

function editorialColumns(i: SyncItem) {
  return {
    summary: i.summary,
    description: i.description,
    eligibility: i.eligibility,
    tags: i.tags,
    area: i.area,
    format: i.format,
    internship_terms: i.internship_terms,
    job_type: i.job_type ?? "internship",
    dates_note: i.dates_note,
    organizer_url: i.organizer_url,
    opens_on: i.opens_on ?? null,
    team_size: i.team_size ?? null,
    prizes: i.prizes ?? null,
    provided: i.provided ?? null,
  } satisfies TablesUpdate<"opportunities">;
}

function insertRow(sourceId: string, i: SyncItem, now: string): TablesInsert<"opportunities"> {
  return {
    ...alwaysColumns(i, now),
    ...editorialColumns(i),
    kind: i.kind,
    slug: syncSlug(sourceId, i.title, i.external_id),
    organizer: i.organizer,
    source: "sync",
    source_name: i.source_name,
    source_url: i.source_url,
    external_id: i.external_id,
    first_seen_at: now,
    published: true,
    closed_at: null,
    created_by: null,
  };
}

async function mapLimit<T>(xs: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, xs.length) }, async () => {
      while (i < xs.length) await fn(xs[i++]);
    }),
  );
}

export async function writeSource(
  db: Db,
  o: { sourceId: string; sourceName: string; prefix: string; items: SyncItem[]; closeMissing: boolean; log: (m: string) => void },
): Promise<WriteCounts> {
  const now = new Date().toISOString();
  const counts: WriteCounts = { inserted: 0, updated: 0, closed: 0, reopened: 0, failed: 0 };

  const items = new Map<string, SyncItem>();
  for (const i of o.items) {
    if (!i.external_id.startsWith(o.prefix)) throw new Error(`${i.external_id} is outside the source prefix ${o.prefix}`);
    if (i.source_name !== o.sourceName) throw new Error(`${i.external_id} has source_name ${i.source_name}, expected ${o.sourceName}`);
    if (!items.has(i.external_id)) items.set(i.external_id, i);
  }

  const existing = await existingRows(db, o.sourceName, o.prefix);
  const byExternal = new Map(existing.map((r) => [r.external_id, r]));

  // inserts
  const fresh = [...items.values()].filter((i) => !byExternal.has(i.external_id)).map((i) => insertRow(o.sourceId, i, now));
  for (let k = 0; k < fresh.length; k += INSERT_CHUNK) {
    const chunk = fresh.slice(k, k + INSERT_CHUNK);
    const { error } = await db.from("opportunities").insert(chunk);
    if (!error) {
      counts.inserted += chunk.length;
      continue;
    }
    // one bad row (a slug clash, a check constraint) should not cost the whole chunk
    for (const row of chunk) {
      const { error: e } = await db.from("opportunities").insert(row);
      if (e) {
        counts.failed++;
        o.log(`insert ${row.external_id}: ${e.message}`);
      } else counts.inserted++;
    }
  }

  // updates
  const seen = [...items.values()].filter((i) => byExternal.has(i.external_id));
  await mapLimit(seen, UPDATE_CONCURRENCY, async (i) => {
    const row = byExternal.get(i.external_id)!;
    const patch: TablesUpdate<"opportunities"> = {
      ...alwaysColumns(i, now),
      ...(row.editor_edited_at ? {} : editorialColumns(i)),
      ...(row.closed_at ? { closed_at: null, published: true } : {}),
    };
    const { error } = await db.from("opportunities").update(patch).eq("id", row.id);
    if (error) {
      counts.failed++;
      o.log(`update ${i.external_id}: ${error.message}`);
      return;
    }
    counts.updated++;
    if (row.closed_at) counts.reopened++;
  });

  // closing: only after a successful, unfiltered fetch of this source
  if (o.closeMissing) {
    const gone = existing.filter((r) => !items.has(r.external_id) && !r.closed_at).map((r) => r.id);
    for (let k = 0; k < gone.length; k += INSERT_CHUNK) {
      const chunk = gone.slice(k, k + INSERT_CHUNK);
      const { data, error } = await db
        .from("opportunities")
        .update({ closed_at: now, published: false })
        .in("id", chunk)
        .select("id");
      if (error) throw new Error(`close: ${error.message}`);
      counts.closed += data.length;
    }
  }
  return counts;
}

// ── sync_runs ────────────────────────────────────────────────────────────

export async function startRun(db: Db, sourceId: string, adapter: string): Promise<string | null> {
  const { data, error } = await db.from("sync_runs").insert({ source_id: sourceId, adapter }).select("id").single();
  if (error) {
    console.warn(`warning: sync_runs insert for ${sourceId}: ${error.message}`);
    return null;
  }
  return data.id;
}

export async function finishRun(
  db: Db,
  id: string | null,
  r: { fetched: number; kept: number; inserted: number; updated: number; closed: number; ok: boolean; error: string | null },
): Promise<void> {
  if (!id) return;
  const { error } = await db
    .from("sync_runs")
    .update({ ...r, error: r.error?.slice(0, 2000) ?? null, finished_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.warn(`warning: sync_runs update: ${error.message}`);
}
