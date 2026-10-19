/* Locator dates: calendar-date arithmetic and the words for it ("in 7 days",
 * "Oct 13", "Oct 3–4, 2026"). Every value is a date-only 'YYYY-MM-DD', so
 * nothing here touches a time zone. Pure; re-exported from
 * lib/data/locator.ts, so import from there. See docs/DESIGN-BRIEF.md §13. */

import { formatDateOnly, parseDateOnly } from "./dates";
import type { DateOnly, Opportunity } from "./types";

/** A deadline this many days away (or fewer) is "Closing soon". */
export const CLOSING_SOON_DAYS = 14;

/** Whole days from `a` to `b`: positive when `b` is later. */
export function daysBetween(a: DateOnly, b: DateOnly): number {
  const pa = parseDateOnly(a);
  const pb = parseDateOnly(b);
  return Math.round((Date.UTC(pb.year, pb.month - 1, pb.day) - Date.UTC(pa.year, pa.month - 1, pa.day)) / 86_400_000);
}

/** `date` moved by `days` calendar days ('2026-10-18', 6 → '2026-10-24'). */
export function addDays(date: DateOnly, days: number): DateOnly {
  const { year, month, day } = parseDateOnly(date);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** 12 → "12 days", 60 → "2 months", 400 → "1 year". */
function spanText(days: number): string {
  if (days < 45) return plural(days, "day");
  if (days < 365) return plural(Math.round(days / 30), "month");
  return plural(Math.round(days / 365), "year");
}

/** `date` relative to `today`: "today", "tomorrow", "yesterday",
 *  "in 5 days", "3 days ago", "in 2 months". */
export function relativeDayText(date: DateOnly, today: DateOnly): string {
  const days = daysBetween(today, date);
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  if (days === -1) return "yesterday";
  const span = spanText(Math.abs(days));
  return days > 0 ? `in ${span}` : `${span} ago`;
}

/** "Oct 13" in today's year, "Oct 13, 2027" in any other. */
export function formatShortDate(date: DateOnly, today: DateOnly): string {
  const sameYear = date.slice(0, 4) === today.slice(0, 4);
  return sameYear ? formatDateOnly(date, { month: "short", day: "numeric" }) : formatDateOnly(date);
}

/** "Oct 25, 2026 · in 7 days": a date with its relative text, for detail pages. */
export function dateWithRelative(date: DateOnly, today: DateOnly): string {
  return `${formatDateOnly(date)} · ${relativeDayText(date, today)}`;
}

/** closing_soon = the deadline is today or within the next 14 days. */
export function deadlineStatus(
  deadline_on: DateOnly | null,
  today: DateOnly,
): "none" | "open" | "closing_soon" | "closed" {
  if (!deadline_on) return "none";
  const left = daysBetween(today, deadline_on);
  if (left < 0) return "closed";
  if (left <= CLOSING_SOON_DAYS) return "closing_soon";
  return "open";
}

/** YYYY-MM-DD strings compare correctly as strings. */
export function dateStatus(
  o: { starts_on: DateOnly | null; ends_on: DateOnly | null },
  today: DateOnly,
): "undated" | "upcoming" | "ongoing" | "past" {
  if (!o.starts_on) return "undated";
  const end = o.ends_on ?? o.starts_on;
  if (end < today) return "past";
  if (o.starts_on > today) return "upcoming";
  return "ongoing";
}

/** "closes in 5 days", "closes today", "closed 3 days ago". */
export function deadlineTiming(deadline_on: DateOnly, today: DateOnly): string {
  const verb = deadline_on < today ? "closed" : "closes";
  return `${verb} ${relativeDayText(deadline_on, today)}`;
}

/** "starts in 6 days", "ends tomorrow" (under way), "ended 3 days ago".
 *  Null when undated, and for a one-day event that is today. */
export function eventTiming(
  o: { starts_on: DateOnly | null; ends_on: DateOnly | null },
  today: DateOnly,
): string | null {
  if (!o.starts_on) return null;
  const end = o.ends_on ?? o.starts_on;
  if (end < today) return `ended ${relativeDayText(end, today)}`;
  if (o.starts_on > today) return `starts ${relativeDayText(o.starts_on, today)}`;
  if (o.starts_on === today && end === today) return null;
  return `ends ${relativeDayText(end, today)}`;
}

/** "Oct 3–4, 2026", "Oct 3, 2026", "Oct 30 – Nov 1, 2026", "Dec 30, 2026 – Jan 2, 2027".
 *  Always carries the year. */
export function formatDateRange(starts_on: DateOnly | null, ends_on: DateOnly | null): string | null {
  const start = starts_on ?? ends_on;
  if (!start) return null;
  const end = starts_on && ends_on ? ends_on : null;
  if (!end || end === start) return formatDateOnly(start);
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  if (s.year !== e.year) return `${formatDateOnly(start)} – ${formatDateOnly(end)}`;
  const md = (v: DateOnly) => formatDateOnly(v, { month: "short", day: "numeric" });
  if (s.month === e.month) return `${md(start)}–${e.day}, ${e.year}`;
  return `${md(start)} – ${md(end)}, ${e.year}`;
}

/** "Signup Oct 1 – Nov 15, 2026", "Signup closes Nov 15, 2026",
 *  "Signup opens Oct 1, 2026", or null when neither date is set.
 *  opens_on (0005) is when signup opens; deadline_on is when it closes. */
export function signupWindowLabel(o: Pick<Opportunity, "opens_on" | "deadline_on">): string | null {
  const opens = o.opens_on ?? null;
  const closes = o.deadline_on;
  if (opens && closes) return `Signup ${formatDateRange(opens, closes)}`;
  if (closes) return `Signup closes ${formatDateOnly(closes)}`;
  if (opens) return `Signup opens ${formatDateOnly(opens)}`;
  return null;
}

/** "opens in 2 days", "closes in 7 days", "closed 3 days ago", "opened 5 days ago". */
function signupTiming(opens: DateOnly | null, closes: DateOnly | null, today: DateOnly): string | null {
  if (opens && opens > today) return `opens ${relativeDayText(opens, today)}`;
  if (closes) return deadlineTiming(closes, today);
  if (opens) return `opened ${relativeDayText(opens, today)}`;
  return null;
}

/** The signup window with its relative text, for detail pages:
 *  "Oct 13–25, 2026 · closes in 7 days", "Nov 15, 2026 · closes in 28 days".
 *  Null when neither date is set. */
export function signupWindowFact(o: Pick<Opportunity, "opens_on" | "deadline_on">, today: DateOnly): string | null {
  const opens = o.opens_on ?? null;
  const window = formatDateRange(opens, o.deadline_on);
  const timing = signupTiming(opens, o.deadline_on, today);
  if (!window || !timing) return null;
  return `${window} · ${timing}`;
}

/** "2026-10" */
export function monthKey(d: DateOnly): string {
  return d.slice(0, 7);
}

/** "2026-10" → "October 2026" */
export function monthLabel(key: string): string {
  return formatDateOnly(`${key}-01`, { month: "long", year: "numeric" });
}
