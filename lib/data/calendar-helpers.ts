/* Pure date helpers for the members' dashboard Locator calendar
 * (docs/DESIGN-BRIEF.md §14): date arithmetic, the month grid and the day
 * labels. Client-safe: no "server-only". The CalendarEvent type and where
 * events land on the grid live in ./calendar-events.ts.
 *
 * Used by: lib/data/calendar.ts, lib/data/calendar-events.ts, the
 * components/locator calendar files and app/(members)/dashboard/page.tsx.
 *
 * Every date is a 'YYYY-MM-DD' string. Arithmetic goes through Date.UTC and
 * the UTC getters, never `new Date("YYYY-MM-DD")` in local time, so the
 * server's and the browser's zones never shift a day. */

import { formatDateOnly, parseDateOnly } from "./dates";
import type { DateOnly } from "./types";

const DAY_MS = 86_400_000;

/** Weekday initials for the grid header, Sunday first. */
export const weekdayInitials = ["S", "M", "T", "W", "T", "F", "S"] as const;

/* ─── Date arithmetic ─────────────────────────────────────────── */

function toUtcMs(date: DateOnly): number {
  const { year, month, day } = parseDateOnly(date);
  return Date.UTC(year, month - 1, day);
}

function fromUtcMs(ms: number): DateOnly {
  return new Date(ms).toISOString().slice(0, 10);
}

/** `date` plus `days` (negative to go back). */
export function addDays(date: DateOnly, days: number): DateOnly {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to`: positive when `to` is later. */
export function daysBetween(from: DateOnly, to: DateOnly): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** The first day of `date`'s month: "2026-10-18" → "2026-10-01". */
export function startOfMonth(date: DateOnly): DateOnly {
  return `${date.slice(0, 7)}-01`;
}

/** The last day of `date`'s month: "2026-02-10" → "2026-02-28". */
export function endOfMonth(date: DateOnly): DateOnly {
  const { year, month } = parseDateOnly(date);
  // Day 0 of the next month is the last day of this one.
  return fromUtcMs(Date.UTC(year, month, 0));
}

/** The same day `months` months later (or earlier), clamped to the end of
 *  a shorter month: addMonths("2026-01-31", 1) → "2026-02-28". */
export function addMonths(date: DateOnly, months: number): DateOnly {
  const { year, month, day } = parseDateOnly(date);
  const firstOfTarget = fromUtcMs(Date.UTC(year, month - 1 + months, 1));
  const lastDay = parseDateOnly(endOfMonth(firstOfTarget)).day;
  return `${firstOfTarget.slice(0, 8)}${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

/** True when both dates fall in the same month of the same year. */
export function sameMonth(a: DateOnly, b: DateOnly): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/** True when `date` is inside [from, to]. YYYY-MM-DD strings compare correctly as strings. */
export function isWithin(date: DateOnly, from: DateOnly, to: DateOnly): boolean {
  return date >= from && date <= to;
}

/** The month view for `year` and `month` (1–12): 6 rows of 7 dates, starting
 *  on the Sunday on or before the 1st, so outside-month days pad both ends. */
export function monthGrid(year: number, month: number): DateOnly[][] {
  const firstMs = Date.UTC(year, month - 1, 1);
  const weekdayOfFirst = new Date(firstMs).getUTCDay(); // 0 = Sunday
  const gridStart = fromUtcMs(firstMs - weekdayOfFirst * DAY_MS);
  const rows: DateOnly[][] = [];
  for (let row = 0; row < 6; row++) {
    const week: DateOnly[] = [];
    for (let col = 0; col < 7; col++) week.push(addDays(gridStart, row * 7 + col));
    rows.push(week);
  }
  return rows;
}

/* ─── Labels ──────────────────────────────────────────────────── */

/** Adds the year only when it is not today's year (docs/DESIGN-BRIEF.md §13). */
function withYearIfOther(
  date: DateOnly,
  today: DateOnly,
  opts: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormatOptions {
  return date.slice(0, 4) === today.slice(0, 4) ? opts : { ...opts, year: "numeric" };
}

/** "Oct 24", or "Jan 9, 2027" outside the current year. */
export function shortDay(date: DateOnly, today: DateOnly): string {
  return formatDateOnly(date, withYearIfOther(date, today, { month: "short", day: "numeric" }));
}

/** "Sat, Oct 24", or "Sat, Jan 9, 2027" outside the current year. */
export function dayHeading(date: DateOnly, today: DateOnly): string {
  return formatDateOnly(date, withYearIfOther(date, today, { weekday: "short", month: "short", day: "numeric" }));
}

/** "Saturday, October 24", for screen-reader labels. */
export function longDay(date: DateOnly, today: DateOnly): string {
  return formatDateOnly(date, withYearIfOther(date, today, { weekday: "long", month: "long", day: "numeric" }));
}

/** "Today", "Tomorrow", "Yesterday", "In 6 days", "3 days ago". */
export function relativeDay(date: DateOnly, today: DateOnly): string {
  const days = daysBetween(today, date);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1) return `In ${days} days`;
  return `${-days} days ago`;
}
