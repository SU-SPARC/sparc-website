/* Shared plumbing for the admin content actions (server only; not a
 * "use server" module). Every action: requireEditor() first, then the
 * user's session client (RLS enforces), then revalidatePath('/', 'layout'). */

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

import { requireEditor } from "@/lib/auth";
import { CLUB_TZ } from "@/lib/data/dates";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type Client = SupabaseClient<Database>;

export async function editorSession() {
  const current = await requireEditor();
  const supabase = await createClient();
  return { current, supabase };
}

export function revalidateSite() {
  revalidatePath("/", "layout");
}

export type OrderedTable = "members" | "photos" | "links" | "recordings";

/** Swap an item's sort_order with its neighbour. The whole list (or the
 *  scoped sub-list, e.g. one event's recordings) is renumbered 10, 20, …
 *  in its current order first, so ties and gaps never survive a move. */
export async function moveInOrder(
  supabase: Client,
  table: OrderedTable,
  id: string,
  dir: "up" | "down",
  scope?: { column: "event_id"; value: string | null },
): Promise<string | null> {
  const from = supabase.from(table as "links");
  let q = from.select("id, sort_order").order("sort_order").order("created_at").order("id");
  if (scope) {
    q = scope.value === null ? q.is(scope.column as never, null) : q.eq(scope.column as never, scope.value as never);
  }
  const { data, error } = await q;
  if (error) return error.message;
  const rows = data ?? [];
  const i = rows.findIndex((r) => r.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= rows.length) return null;
  const order = rows.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  const current = new Map(rows.map((r) => [r.id, r.sort_order]));
  for (let k = 0; k < order.length; k++) {
    const target = (k + 1) * 10;
    if (current.get(order[k]) === target) continue;
    const { error: e } = await supabase.from(table as "links").update({ sort_order: target }).eq("id", order[k]);
    if (e) return e.message;
  }
  return null;
}

/** Next sort_order at the end of a list. */
export async function nextSortOrder(supabase: Client, table: OrderedTable): Promise<number> {
  const { data } = await supabase
    .from(table as "links")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  return (data?.[0]?.sort_order ?? 0) + 10;
}

/** 'YYYY-MM-DD' + optional 'HH:MM' in America/New_York → ISO instant. */
export function clubLocalToInstant(date: string, time: string | null): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  const offsetAt = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: CLUB_TZ,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(new Date(ms));
    const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    const local = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
    return local - ms;
  };
  let guess = asUtc - offsetAt(asUtc);
  guess = asUtc - offsetAt(guess); // second pass settles DST edges
  return new Date(guess).toISOString();
}

/** ISO instant → { date: 'YYYY-MM-DD', time: 'HH:MM' } in America/New_York. */
export function instantToClubLocal(iso: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Proposes the next free ref: nextRef(['SP-001','SP-013'], 'SP-', 3) → 'SP-014'. */
export function nextRef(existing: string[], prefix: string, width: number): string {
  let max = 0;
  for (const r of existing) {
    if (!r.startsWith(prefix)) continue;
    const n = Number(r.slice(prefix.length));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

/** URL-safe slug from a title. */
export function slugifyTitle(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** "SP-014 is taken by 'Robot arm'" when another row already uses `value`. */
export async function takenBy(
  supabase: Client,
  table: "projects" | "events" | "members" | "news",
  column: "ref" | "slug",
  value: string,
  selfId: string | null,
  label: (row: Record<string, unknown>) => string,
): Promise<string | null> {
  const titleCol = table === "members" ? "name" : "title";
  let q = supabase
    .from(table as "events")
    .select(`id, ${titleCol}` as "id, title")
    .eq(column as "slug", value)
    .limit(1);
  if (selfId) q = q.neq("id", selfId);
  const { data } = await q;
  const row = data?.[0] as Record<string, unknown> | undefined;
  return row ? `${value} is taken by '${label(row)}'.` : null;
}
