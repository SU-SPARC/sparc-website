/* Locator sync: pull listings from the sources in sources.json into public.opportunities.
 *
 *   npm run locator:sync                        # every enabled source
 *   npm run locator:sync -- --source formlabs   # one source id (comma-separate for several)
 *   npm run locator:sync -- --kind hackathon    # only adapters of that kind
 *   npm run locator:sync -- --dry-run           # fetch + normalise, print counts and samples, write nothing
 *   npm run locator:sync -- --limit 5           # keep at most 5 items per source (never closes anything)
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY from the environment or .env.local
 * (not needed for --dry-run). Three sources run at a time; one sync_runs row per source; a
 * failing source is logged and the others carry on; exit code 1 only when every source failed.
 * See scripts/locator-sync/README.md. */

import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";

import type { Database } from "../../lib/supabase/database.types";
import { ADAPTERS } from "./adapters";
import { http } from "./http";
import { finishRun, startRun, writeSource } from "./upsert";
import { type Adapter, type AdapterName, type SourceConfig, SourcesFile, type SyncItem } from "./types";

config({ path: ".env.local", quiet: true });

const CONCURRENCY = 3;
const KINDS = ["internship", "conference", "networking", "hackathon"] as const;

function fail(msg: string): never {
  console.error(`locator:sync: ${msg}`);
  process.exit(1);
}

const { values: args } = parseArgs({
  options: {
    source: { type: "string" },
    kind: { type: "string" },
    "dry-run": { type: "boolean", default: false },
    limit: { type: "string" },
    file: { type: "string" },
  },
  allowPositionals: false,
});

const dryRun = args["dry-run"] ?? false;
const limit = args.limit !== undefined ? Number(args.limit) : null;
if (limit !== null && (!Number.isInteger(limit) || limit < 1)) fail("--limit must be a positive integer");
if (args.kind && !(KINDS as readonly string[]).includes(args.kind)) fail(`--kind must be one of ${KINDS.join(", ")}`);

function loadSources(): SourceConfig[] {
  const file = args.file ?? path.join(process.cwd(), "scripts", "locator-sync", "sources.json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    fail(`cannot read ${path.relative(process.cwd(), file)}: ${(e as Error).message}`);
  }
  const parsed = SourcesFile.safeParse(raw);
  if (!parsed.success) {
    fail(`sources.json: ${parsed.error.issues.map((i) => `${i.path.join(".") || "(file)"}: ${i.message}`).join("; ")}`);
  }
  const all = [...parsed.data.jobs, ...parsed.data.events];
  // Two sources must not share a closing scope, or one would close the other's rows.
  const scopes = new Map<string, string>();
  for (const s of all) {
    const a = ADAPTERS[s.adapter] as Adapter<AdapterName>;
    const key = `${a.sourceName(s as never)}|${a.prefix(s as never)}`;
    const other = scopes.get(key);
    if (other) fail(`sources "${other}" and "${s.id}" would write the same external ids (${key})`);
    scopes.set(key, s.id);
  }
  return all;
}

function pick(all: SourceConfig[]): SourceConfig[] {
  let out = all;
  if (args.source) {
    const want = new Set(args.source.split(",").map((s) => s.trim()).filter(Boolean));
    const unknown = [...want].filter((id) => !all.some((s) => s.id === id));
    if (unknown.length) fail(`unknown source id(s): ${unknown.join(", ")}`);
    out = out.filter((s) => want.has(s.id)); // an explicitly named source runs even when disabled
  } else {
    out = out.filter((s) => s.enabled);
  }
  if (args.kind) out = out.filter((s) => ADAPTERS[s.adapter].kind === args.kind);
  // local boards first, so the ones the list exists for are never starved by a slow national board
  return [...out].sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "local" ? -1 : 1));
}

type Outcome = { id: string; ok: boolean; line: string; kind: SyncItem["kind"]; inserted: number };

function sample(i: SyncItem): string {
  const type = i.kind === "internship" ? ` · ${i.job_type ?? "internship"}` : "";
  const terms = i.internship_terms.length ? i.internship_terms.join("+") : "-";
  const when = i.starts_on ? ` · ${i.starts_on}${i.ends_on && i.ends_on !== i.starts_on ? `..${i.ends_on}` : ""}` : "";
  return `    ${i.title} · ${i.organizer} · ${i.location ?? "-"}${type} · ${terms} · ${i.area}${when}`;
}

/** "    types: internship 12, coop 3" for a jobs source's dry run; nothing for events. */
function typeTally(items: SyncItem[]): string[] {
  const jobs = items.filter((i) => i.kind === "internship");
  if (!jobs.length) return [];
  const counts = new Map<string, number>();
  for (const i of jobs) counts.set(i.job_type ?? "internship", (counts.get(i.job_type ?? "internship") ?? 0) + 1);
  return [`    types: ${[...counts].map(([type, n]) => `${type} ${n}`).join(", ")}`];
}

async function runOne(s: SourceConfig, db: SupabaseClient<Database> | null): Promise<Outcome> {
  const adapter = ADAPTERS[s.adapter] as Adapter<AdapterName>;
  const label = `${s.id} (${s.adapter})`;
  const notes: string[] = [];
  const log = (m: string) => notes.push(m);
  const runId = db ? await startRun(db, s.id, s.adapter) : null;
  let fetched = 0;
  let kept = 0;
  try {
    const res = await adapter.fetch(s as never, { http, now: new Date(), log });
    fetched = res.fetched;
    const items = limit !== null ? res.items.slice(0, limit) : res.items;
    kept = items.length;
    if (fetched === 0) log("warning: the source returned nothing (an undocumented endpoint may have changed)");

    if (!db) {
      const lines = [`${label}: fetched ${fetched}, kept ${res.items.length}${limit !== null ? ` (limit ${limit})` : ""}`];
      lines.push(...typeTally(items), ...items.slice(0, 3).map(sample));
      return { id: s.id, ok: true, kind: adapter.kind, inserted: 0, line: [...lines, ...notes.map((n) => `    ${n}`)].join("\n") };
    }

    const w = await writeSource(db, {
      sourceId: s.id,
      sourceName: adapter.sourceName(s as never),
      prefix: adapter.prefix(s as never),
      items,
      closeMissing: limit === null,
      log,
    });
    const ok = w.failed === 0 || w.inserted + w.updated > 0;
    await finishRun(db, runId, {
      fetched,
      kept,
      inserted: w.inserted,
      updated: w.updated,
      closed: w.closed,
      ok,
      error: w.failed ? `${w.failed} row(s) failed: ${notes.slice(0, 3).join(" | ")}` : null,
    });
    const extra = [w.reopened ? `reopened ${w.reopened}` : "", w.failed ? `failed ${w.failed}` : ""].filter(Boolean);
    const line = `${label}: fetched ${fetched}, kept ${kept}, inserted ${w.inserted}, updated ${w.updated}, closed ${w.closed}${extra.length ? `, ${extra.join(", ")}` : ""}`;
    return { id: s.id, ok, kind: adapter.kind, inserted: w.inserted, line: [line, ...notes.map((n) => `    ${n}`)].join("\n") };
  } catch (e) {
    const msg = (e as Error).message;
    if (db) await finishRun(db, runId, { fetched, kept, inserted: 0, updated: 0, closed: 0, ok: false, error: msg });
    return { id: s.id, ok: false, kind: adapter.kind, inserted: 0, line: [`${label}: FAILED ${msg}`, ...notes.map((n) => `    ${n}`)].join("\n") };
  }
}

async function main() {
  const sources = pick(loadSources());
  if (!sources.length) fail("no sources selected");

  let db: SupabaseClient<Database> | null = null;
  if (!dryRun) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!url || !secret) fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (env or .env.local)");
    db = createClient<Database>(url, secret, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }

  console.log(`locator:sync${dryRun ? " (dry run)" : ""}: ${sources.length} source(s)`);
  const outcomes: Outcome[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, sources.length) }, async () => {
      while (next < sources.length) {
        const o = await runOne(sources[next++], db);
        console.log(o.line);
        outcomes.push(o);
      }
    }),
  );

  const failed = outcomes.filter((o) => !o.ok);
  if (!dryRun) {
    const byKind = new Map<string, number>();
    for (const o of outcomes) byKind.set(o.kind, (byKind.get(o.kind) ?? 0) + o.inserted);
    console.log(`\ninserted by kind: ${[...byKind].map(([k, n]) => `${k} ${n}`).join(", ")}`);
  }
  console.log(`${outcomes.length - failed.length}/${outcomes.length} source(s) ok${failed.length ? `; failed: ${failed.map((f) => f.id).join(", ")}` : ""}`);
  process.exit(failed.length === outcomes.length ? 1 : 0);
}

void main().catch((e: unknown) => fail((e as Error).message));
