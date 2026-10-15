/* Date formatting with no dependence on the server's or browser's zone.
 *
 * Instants (events.starts_at) are formatted in the club's zone, so the server
 * render and the hydrated client agree. Date-only values ('YYYY-MM-DD':
 * recordings.recorded_on, news.published_on, photos.taken_on) carry no zone
 * at all: they are formatted as that calendar date with no arithmetic, by
 * building the UTC midnight of the date and formatting it in UTC. */

import type { DateOnly } from "./types";

export const CLUB_TZ = "America/New_York";

const DEFAULT_OPTS: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };

/** Format an instant in America/New_York. `opts.timeZone` is always overridden. */
export function formatInstant(
  date: Date,
  opts: Intl.DateTimeFormatOptions = DEFAULT_OPTS,
  locale = "en-US",
): string {
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: CLUB_TZ }).format(date);
}

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse 'YYYY-MM-DD' into its parts; throws on anything else. */
export function parseDateOnly(value: DateOnly): { year: number; month: number; day: number } {
  const m = DATE_ONLY.exec(value);
  if (!m) throw new Error(`Not a YYYY-MM-DD date: ${value}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

/** Format a date-only value as that calendar date, whatever the runtime zone.
 *  Time-of-day options are meaningless here; `opts.timeZone` is overridden. */
export function formatDateOnly(
  value: DateOnly,
  opts: Intl.DateTimeFormatOptions = DEFAULT_OPTS,
  locale = "en-US",
): string {
  const { year, month, day } = parseDateOnly(value);
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** The calendar date ('YYYY-MM-DD') of an instant in America/New_York. */
export function isoDateOnly(date: Date): DateOnly {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
