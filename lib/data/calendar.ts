/* Locator reads for the members' dashboard:
 * the calendar's events and the "Your Locator" counts. Server only; used by
 * app/(members)/dashboard/page.tsx.
 *
 * Session client, so RLS applies as the signed-in member. Interest rows
 * (migration 0005) are readable by every signed-in user, so the embedded
 * interest comes back for the whole club and is narrowed to the caller's
 * own row in code. */

import "server-only";

import { createClient } from "@/lib/supabase/server";

import { CALENDAR_KINDS, type CalendarEvent, type CalendarKind } from "./calendar-events";
import { addDays } from "./calendar-helpers";
import { kindPath } from "./locator";
import type { DateOnly, InterestStatus, OpportunityKind } from "./types";

/** How far ahead "deadlines soon" looks, in days (matches "Closing soon"). */
const DEADLINE_WINDOW_DAYS = 14;

export type LocatorSummary = {
  /** the caller's live listings marked "I'm enrolling" */
  enrolling: number;
  /** the caller's live listings marked "I'm interested" */
  interested: number;
  /** published, open internships whose deadline is today or in the next 14 days */
  deadlinesSoon: number;
};

async function sessionClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, uid: user?.id ?? null };
}

/** Published conferences, networking events and hackathons whose
 *  [starts_on, ends_on ?? starts_on] overlaps [from, to], sorted by start
 *  date, each with the caller's own interest. Closed listings (gone from
 *  their source) are left out. */
export async function getCalendar({ from, to }: { from: DateOnly; to: DateOnly }): Promise<CalendarEvent[]> {
  const { supabase, uid } = await sessionClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select(
      "id, kind, title, starts_on, ends_on, location, area, format, interest:opportunity_interest(profile_id, status)",
    )
    .in("kind", CALENDAR_KINDS)
    .eq("published", true)
    .is("closed_at", null)
    // Starts on or before the window's last day…
    .lte("starts_on", to)
    // …and ends on or after its first day (a one-day event has no ends_on).
    .or(`ends_on.gte.${from},and(ends_on.is.null,starts_on.gte.${from})`)
    .order("starts_on", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw new Error(`getCalendar: ${error.message}`);

  return (data ?? []).map((row) => {
    const own = row.interest.find((i) => i.profile_id === uid);
    const kind = row.kind as CalendarKind;
    return {
      id: row.id,
      kind,
      title: row.title,
      // Never null here: the lte filter above drops rows without a start date.
      starts_on: row.starts_on as DateOnly,
      ends_on: row.ends_on,
      location: row.location,
      area: row.area,
      format: row.format,
      href: `${kindPath(kind, "member")}/${row.id}`,
      attending: own ? (own.status as InterestStatus) : null,
    };
  });
}

type InterestListing = {
  kind: OpportunityKind;
  starts_on: DateOnly | null;
  ends_on: DateOnly | null;
  deadline_on: DateOnly | null;
  published: boolean;
  closed_at: string | null;
};

/** Still worth counting: published, not closed, and not over (an event that
 *  has not ended, an internship whose deadline has not passed). */
function isLive(listing: InterestListing, today: DateOnly): boolean {
  if (!listing.published || listing.closed_at) return false;
  if (listing.kind === "internship") return !listing.deadline_on || listing.deadline_on >= today;
  if (!listing.starts_on) return true;
  return (listing.ends_on ?? listing.starts_on) >= today;
}

type SessionClient = Awaited<ReturnType<typeof createClient>>;

/** The caller's enrolling and interested counts, live listings only. */
async function countMyInterest(
  supabase: SessionClient,
  uid: string | null,
  today: DateOnly,
): Promise<{ enrolling: number; interested: number }> {
  if (!uid) return { enrolling: 0, interested: 0 };
  // The caller's own interest rows, each with the listing it points at.
  const { data, error } = await supabase
    .from("opportunity_interest")
    .select("status, listing:opportunities(kind, starts_on, ends_on, deadline_on, published, closed_at)")
    .eq("profile_id", uid);
  if (error) throw new Error(`getLocatorSummary: ${error.message}`);

  let enrolling = 0;
  let interested = 0;
  for (const row of data ?? []) {
    if (!row.listing || !isLive(row.listing as InterestListing, today)) continue;
    if (row.status === "enrolled") enrolling += 1;
    else interested += 1;
  }
  return { enrolling, interested };
}

/** Open, published internships due between today and two weeks from today. */
async function countDeadlinesSoon(supabase: SessionClient, today: DateOnly): Promise<number> {
  const { count, error } = await supabase
    .from("opportunities")
    .select("id", { count: "exact", head: true })
    .eq("kind", "internship")
    .eq("published", true)
    .is("closed_at", null)
    .gte("deadline_on", today)
    .lte("deadline_on", addDays(today, DEADLINE_WINDOW_DAYS));
  if (error) throw new Error(`getLocatorSummary: ${error.message}`);
  return count ?? 0;
}

/** The right column's three lines: the caller's enrolling and interested
 *  counts and internship deadlines in the next 14 days. */
export async function getLocatorSummary(today: DateOnly): Promise<LocatorSummary> {
  const { supabase, uid } = await sessionClient();
  const [interest, deadlinesSoon] = await Promise.all([
    countMyInterest(supabase, uid, today),
    countDeadlinesSoon(supabase, today),
  ]);
  return { ...interest, deadlinesSoon };
}
