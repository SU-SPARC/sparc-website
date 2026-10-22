/* Locator seed: scripts/seed/locator/<kind>.json → public.opportunities.
 *
 *   npm run seed:locator
 *
 * Reads the four research files (a missing one is skipped with a warning),
 * validates every item, and upserts on slug with source = 'seed',
 * source_name = 'Research (<verified_on>)' (e.g. 'Research (21 Oct 2026)'),
 * the item's source_url (where the research read it) and created_by = null. Idempotent: a second run writes
 * the same values. Uses the secret key (bypasses RLS), so the editor-edit
 * trigger from 0004 leaves editor_edited_at alone. The hackathon keys from
 * 0005 (opens_on, team_size, prizes, provided) are optional and written only
 * when an item has them. job_type (0006) is always written: the item's own
 * `job_type` key when it has one, else 'coop' when its terms include 'coop',
 * else 'internship'.
 * Deletes nothing. See docs/LOCATOR.md. */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { z } from "zod";

import type { Database, TablesInsert } from "../../lib/supabase/database.types";

config({ path: ".env.local", quiet: true });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
if (!URL || !SECRET) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (env or .env.local)");
  process.exit(1);
}

const db = createClient<Database>(URL, SECRET, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

/** `opportunities.source_name` for a seeded row, from its verified_on: "Research (21 Oct 2026)"
 *  (0004_locator_sync.sql backfilled the first batch as "Research (16 Oct 2026)"); "Research" without a date. */
function sourceNameOf(verifiedOn: string | null): string {
  if (!verifiedOn) return "Research";
  const [y, m, d] = verifiedOn.split("-").map(Number);
  const month = new Date(Date.UTC(y, m - 1, d)).toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `Research (${d} ${month} ${y})`;
}

const DIR = path.join(process.cwd(), "scripts", "seed", "locator");
// Only these names: the drive also holds `._*.json` AppleDouble files.
const FILES = ["internships", "conferences", "networking", "hackathons"] as const;

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "expected YYYY-MM-DD" });
const url = z.url({ protocol: /^https?$/ });
const optText = z.string().trim().min(1).nullable();

const Item = z
  .object({
    kind: z.enum(["internship", "conference", "networking", "hackathon"]),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "slug: lowercase letters, numbers, hyphens" }),
    title: z.string().trim().min(1),
    organizer: z.string().trim().min(1),
    organizer_url: url.nullable(),
    organizer_blurb: optText,
    url,
    posting_site: optText,
    summary: optText,
    description: optText,
    area: z.enum(["suffolk", "boston", "outside_boston", "online"]),
    format: z.enum(["in_person", "online", "hybrid"]),
    location: optText,
    starts_on: date.nullable(),
    ends_on: date.nullable(),
    deadline_on: date.nullable(),
    dates_note: optText,
    internship_terms: z.array(z.enum(["summer", "fall", "spring", "winter", "semester_part_time", "coop"])),
    // Job type (0006). Optional: without it, jobTypeOf() decides from the terms.
    job_type: z.enum(["internship", "coop", "new_grad"]).optional(),
    pay: optText,
    eligibility: optText,
    tags: z.array(z.string().regex(/^[a-z0-9][a-z0-9 .+#-]*$/, { error: "tags must be lowercase" })),
    verified_on: date.nullable(),
    source_url: url.nullable(),
    // Hackathon details (0005). Optional: written only when the item has the key.
    opens_on: date.nullable().optional(),
    team_size: optText.optional(),
    prizes: optText.optional(),
    provided: optText.optional(),
  })
  .strict()
  .refine((o) => !o.starts_on || !o.ends_on || o.ends_on >= o.starts_on, {
    error: "ends_on is before starts_on",
    path: ["ends_on"],
  })
  .refine((o) => o.kind === "internship" || o.internship_terms.length === 0, {
    error: "internship_terms on a non-internship",
    path: ["internship_terms"],
  })
  .refine((o) => o.kind === "internship" || !o.job_type || o.job_type === "internship", {
    error: "job_type on a non-internship",
    path: ["job_type"],
  })
  .refine((o) => !o.opens_on || !o.deadline_on || o.opens_on <= o.deadline_on, {
    error: "opens_on is after deadline_on",
    path: ["opens_on"],
  });

type Item = z.infer<typeof Item>;

/** The item's own job_type; else 'coop' when its terms say co-op; else 'internship'. */
function jobTypeOf(item: Item): NonNullable<Item["job_type"]> {
  if (item.job_type) return item.job_type;
  return item.internship_terms.includes("coop") ? "coop" : "internship";
}

function fail(msg: string): never {
  console.error(`seed:locator: ${msg}`);
  process.exit(1);
}

async function main() {
  const rows: TablesInsert<"opportunities">[] = [];
  const seen = new Map<string, string>();
  const found: string[] = [];

  for (const name of FILES) {
    const file = path.join(DIR, `${name}.json`);
    if (!existsSync(file)) {
      console.warn(`warning: ${path.relative(process.cwd(), file)} not found; skipped`);
      continue;
    }
    found.push(`${name}.json`);
    let data: unknown;
    try {
      data = JSON.parse(readFileSync(file, "utf8"));
    } catch (e) {
      fail(`${name}.json is not valid JSON: ${(e as Error).message}`);
    }
    if (!Array.isArray(data)) fail(`${name}.json must be an array`);
    data.forEach((raw, i) => {
      const slug = (raw as { slug?: unknown })?.slug;
      const where = `${name}.json item ${i}${typeof slug === "string" ? ` (${slug})` : ""}`;
      const parsed = Item.safeParse(raw);
      if (!parsed.success) {
        const issues = parsed.error.issues.map((x) => `${x.path.join(".") || "(item)"}: ${x.message}`).join("; ");
        fail(`${where}: ${issues}`);
      }
      const item = parsed.data;
      const dup = seen.get(item.slug);
      if (dup) fail(`${where}: slug also used in ${dup}`);
      seen.set(item.slug, `${name}.json`);
      rows.push({
        ...item,
        job_type: jobTypeOf(item),
        tags: [...new Set(item.tags)],
        source: "seed",
        source_name: sourceNameOf(item.verified_on),
        created_by: null,
      });
    });
  }

  if (!rows.length) {
    console.log("seed:locator: no items to seed");
    return;
  }

  // published is left out, so an editor's Hide on a seeded row survives a re-run.
  // A bulk upsert sends the union of every row's keys and nulls the missing
  // ones, so rows are upserted in groups that share a key set: an item
  // without, say, `prizes` leaves the column as it is.
  const groups = new Map<string, TablesInsert<"opportunities">[]>();
  for (const r of rows) {
    const sig = Object.keys(r).sort().join(",");
    groups.set(sig, [...(groups.get(sig) ?? []), r]);
  }
  for (const group of groups.values()) {
    const { error } = await db.from("opportunities").upsert(group, { onConflict: "slug" });
    if (error) fail(`upsert: ${error.message}`);
  }

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.kind, (counts.get(r.kind) ?? 0) + 1);
  const { count: inTable } = await db
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .eq("source", "seed");

  console.log(`files: ${found.join(", ")}`);
  for (const kind of ["internship", "conference", "networking", "hackathon"]) {
    console.log(`  ${kind.padEnd(11)} ${counts.get(kind) ?? 0}`);
  }
  console.log(`upserted ${rows.length}; seeded rows in table: ${inTable ?? "?"}`);
}

void main().catch((e: unknown) => fail((e as Error).message));
