/* Locator sync summary for the admin overview.
 * Session client: RLS lets editors read sync_runs and nobody else, so a
 * non-editor gets null. */

import "server-only";

import { createClient } from "@/lib/supabase/server";

export type SyncSummary = {
  /** the newest finished_at across sources' latest runs */
  last_finished_at: string | null;
  inserted: number;
  closed: number;
  /** source ids whose latest run failed */
  failing: string[];
};

/** How many recent runs to scan for each source's latest. Generous: a
 *  handful of sources a day. */
const SCAN = 500;

/** Totals over the most recent run of each source_id; null when no run exists. */
export async function getLatestSyncSummary(): Promise<SyncSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sync_runs")
    .select("source_id, finished_at, inserted, closed, ok")
    .order("started_at", { ascending: false })
    .limit(SCAN);
  if (error || !data?.length) return null;

  const latest = new Map<string, (typeof data)[number]>();
  for (const run of data) if (!latest.has(run.source_id)) latest.set(run.source_id, run);

  const summary: SyncSummary = { last_finished_at: null, inserted: 0, closed: 0, failing: [] };
  for (const run of latest.values()) {
    summary.inserted += run.inserted;
    summary.closed += run.closed;
    if (!run.ok) summary.failing.push(run.source_id);
    if (run.finished_at && (!summary.last_finished_at || Date.parse(run.finished_at) > Date.parse(summary.last_finished_at))) {
      summary.last_finished_at = run.finished_at;
    }
  }
  summary.failing.sort();
  return summary;
}
