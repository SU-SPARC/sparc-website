/* Locator date states: whether a listing is still
 * live, in one word and a tone, shown the same way on rows, detail pages and
 * the calendar. Also the freshness lines next to it ("Listed 3d ago",
 * "Not verified since Sep 10"). `today` is always the server's
 * isoDateOnly(new Date()), passed down; never hard-coded. Pure; re-exported
 * from lib/data/locator.ts, so import from there. */

import { isoDateOnly } from "./dates";
import {
  CLOSING_SOON_DAYS,
  dateStatus,
  daysBetween,
  deadlineStatus,
  deadlineTiming,
  eventTiming,
  formatShortDate,
  relativeDayText,
} from "./locator-dates";
import type { DateOnly, Opportunity } from "./types";

export type StateTone = "ink" | "muted" | "warning" | "accent";

/** The state word ("Closing soon"), its tone, and the relative line for the
 *  listing's primary date ("closes in 7 days"), or null when there is none. */
export type ListingStateInfo = { word: string; tone: StateTone; detail: string | null };

/** The fields the state rules read. */
export type StateFields = Pick<
  Opportunity,
  "kind" | "published" | "starts_on" | "ends_on" | "deadline_on" | "closed_at"
>;

/** Closed: the sync stopped seeing it (`closed_at` set). */
export function isClosedListing(o: Pick<Opportunity, "closed_at">): boolean {
  return Boolean(o.closed_at);
}

/** Hidden: an editor unpublished it and it is not closed (a draft). Only
 *  editors ever see these rows. */
export function isHiddenListing(o: Pick<Opportunity, "published" | "closed_at">): boolean {
  return !o.published && !o.closed_at;
}

function closedState(o: StateFields, today: DateOnly): ListingStateInfo {
  const closedOn = o.closed_at ? isoDateOnly(new Date(o.closed_at)) : null;
  const detail = closedOn ? `closed ${relativeDayText(closedOn, today)}` : null;
  return { word: "Closed", tone: "muted", detail };
}

/** Internships go by their deadline; no deadline (rolling) is Open. */
function internshipState(deadline_on: DateOnly | null, today: DateOnly): ListingStateInfo {
  const status = deadlineStatus(deadline_on, today);
  const detail = deadline_on ? deadlineTiming(deadline_on, today) : null;
  if (status === "closed") return { word: "Deadline passed", tone: "muted", detail };
  if (status === "closing_soon") return { word: "Closing soon", tone: "warning", detail };
  return { word: "Open", tone: "ink", detail };
}

/** Conferences, networking events and hackathons go by their dates. */
function eventState(o: StateFields, today: DateOnly): ListingStateInfo {
  const detail = eventTiming(o, today);
  const status = dateStatus(o, today);
  if (status === "undated") return { word: "Undated", tone: "muted", detail };
  if (status === "past") return { word: "Ended", tone: "muted", detail };
  if (status === "upcoming") return { word: "Upcoming", tone: "ink", detail };
  if (o.starts_on === today) return { word: "Today", tone: "accent", detail };
  return { word: "Ongoing", tone: "ink", detail };
}

/** The state from the dates alone: internships by deadline (Deadline
 *  passed, Closing soon, Open), the event kinds by date (Ended, Today,
 *  Ongoing, Upcoming, Undated). */
function datedState(o: StateFields, today: DateOnly): ListingStateInfo {
  if (o.kind === "internship") return internshipState(o.deadline_on, today);
  return eventState(o, today);
}

/** The listing state: Closed (`closed_at` set) wins; a hidden draft reads
 *  "Hidden" with the usual date line; everything else goes by its dates. */
export function listingState(o: StateFields, today: DateOnly): ListingStateInfo {
  if (isClosedListing(o)) return closedState(o, today);
  const dated = datedState(o, today);
  if (isHiddenListing(o)) return { word: "Hidden", tone: "muted", detail: dated.detail };
  return dated;
}

/** Closed, Deadline passed or Ended: the rows in the list's collapsed
 *  section. A hidden draft is past only when its dates are. */
export function isPastListing(o: StateFields, today: DateOnly): boolean {
  if (isClosedListing(o)) return true;
  if (o.kind === "internship") return deadlineStatus(o.deadline_on, today) === "closed";
  return dateStatus(o, today) === "past";
}

/** The hackathon line under the state word: "Signup opens Oct 13",
 *  "Signup open", "Signup closes in 3 days" (within 14 days), "Signup
 *  closed". Null for other kinds, when no signup date is set, and once the
 *  listing is past. */
export function signupState(o: StateFields & Pick<Opportunity, "opens_on">, today: DateOnly): string | null {
  if (o.kind !== "hackathon" || isPastListing(o, today)) return null;
  const opens = o.opens_on ?? null;
  const closes = o.deadline_on;
  if (!opens && !closes) return null;
  if (opens && opens > today) return `Signup opens ${formatShortDate(opens, today)}`;
  if (closes && closes < today) return "Signup closed";
  if (closes && daysBetween(today, closes) <= CLOSING_SOON_DAYS) return `Signup ${deadlineTiming(closes, today)}`;
  return "Signup open";
}

/** The instant behind "Listed 3d ago": when the source posted it, else when
 *  the sync first saw it, else when the row was created. Render it with
 *  <TimeAgo>. */
export function listedAgo(o: Pick<Opportunity, "posted_at" | "first_seen_at" | "created_at">): string {
  return o.posted_at ?? o.first_seen_at ?? o.created_at;
}

/** A verification older than this many days is stale. */
const VERIFIED_FRESH_DAYS = 30;
/** A sync row seen within this many days needs no verification line. */
const SYNC_SEEN_DAYS = 2;

type VerifiedFields = Pick<Opportunity, "verified_on" | "source" | "last_seen_at">;

/** A sync row the sync saw in the last two days: the source vouches for it. */
function seenBySyncRecently(o: VerifiedFields, today: DateOnly): boolean {
  if (o.source !== "sync" || !o.last_seen_at) return false;
  return daysBetween(isoDateOnly(new Date(o.last_seen_at)), today) <= SYNC_SEEN_DAYS;
}

/** "Verified Oct 16"; "Not verified since Sep 10" (warning) when older than
 *  30 days; "Not verified" (warning) when never verified. Null for a sync
 *  row seen in the last 2 days. */
export function verifiedState(o: VerifiedFields, today: DateOnly): { text: string; warning: boolean } | null {
  if (seenBySyncRecently(o, today)) return null;
  const verified = o.verified_on;
  if (!verified) return { text: "Not verified", warning: true };
  if (daysBetween(verified, today) > VERIFIED_FRESH_DAYS) {
    return { text: `Not verified since ${formatShortDate(verified, today)}`, warning: true };
  }
  return { text: `Verified ${formatShortDate(verified, today)}`, warning: false };
}
