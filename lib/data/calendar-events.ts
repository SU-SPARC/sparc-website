/* The CalendarEvent type and where events land on the members' dashboard
 * calendar (docs/DESIGN-BRIEF.md §14): which days an event marks, one day's
 * list, the "Next up" link and "Coming up for you". Client-safe: no
 * "server-only". Date arithmetic lives in ./calendar-helpers.ts.
 *
 * The long-event rule: an event that spans more than 14 days (a long online
 * hackathon, a submission window) marks only its start day and its end day,
 * and those entries are labelled "starts" / "ends". Shorter events mark every
 * day of their span. eventsByDay(), nextEventAfter() and comingUp() all apply
 * it, so the dots, the day labels and the lists agree.
 *
 * Used by: lib/data/calendar.ts and the components/locator calendar files
 * (mini-calendar, calendar-month-grid, calendar-day-events,
 * calendar-event-meta, coming-up). */

import { addDays, daysBetween } from "./calendar-helpers";
import { AREA_LABELS, KIND_CONFIG } from "./locator";
import type { DateOnly, InterestStatus, OpportunityArea, OpportunityFormat, OpportunityKind } from "./types";

/** The Locator kinds that have dates and so appear on the calendar. */
export type CalendarKind = Exclude<OpportunityKind, "internship">;

export const CALENDAR_KINDS: CalendarKind[] = ["conference", "networking", "hackathon"];

/** One listing on the dashboard calendar, from getCalendar(). */
export type CalendarEvent = {
  id: string;
  kind: CalendarKind;
  title: string;
  starts_on: DateOnly;
  /** null for a one-day event */
  ends_on: DateOnly | null;
  location: string | null;
  area: OpportunityArea;
  format: OpportunityFormat;
  /** the members' listing page, /dashboard/locator/<kind>/<id> */
  href: string;
  /** the signed-in member's own interest, or null */
  attending: InterestStatus | null;
};

/** Events longer than this many days show as two moments, not a span. */
export const LONG_EVENT_DAYS = 14;

/** A long event's entry on its start or end day. */
export type EventMoment = "starts" | "ends";

/* ─── Which days an event marks ───────────────────────────────── */

/** The last day of an event: ends_on, or starts_on for a one-day event. */
export function lastDayOf(event: Pick<CalendarEvent, "starts_on" | "ends_on">): DateOnly {
  if (event.ends_on && event.ends_on > event.starts_on) return event.ends_on;
  return event.starts_on;
}

/** How many calendar days the event covers, counting both ends (a one-day event is 1). */
export function spanDays(event: Pick<CalendarEvent, "starts_on" | "ends_on">): number {
  return daysBetween(event.starts_on, lastDayOf(event)) + 1;
}

/** True for an event longer than 14 days. */
export function isLongEvent(event: Pick<CalendarEvent, "starts_on" | "ends_on">): boolean {
  return spanDays(event) > LONG_EVENT_DAYS;
}

/** The days an event puts a dot on: every day of its span, or for a long
 *  event only its start day and its end day. */
export function markedDays(event: Pick<CalendarEvent, "starts_on" | "ends_on">): DateOnly[] {
  const last = lastDayOf(event);
  if (isLongEvent(event)) return [event.starts_on, last];
  const days: DateOnly[] = [];
  for (let day = event.starts_on; day <= last; day = addDays(day, 1)) days.push(day);
  return days;
}

/** "starts" / "ends" for a long event on its start or end day; null otherwise. */
export function momentOn(event: Pick<CalendarEvent, "starts_on" | "ends_on">, day: DateOnly): EventMoment | null {
  if (!isLongEvent(event)) return null;
  if (day === event.starts_on) return "starts";
  if (day === lastDayOf(event)) return "ends";
  return null;
}

/** Each marked day → the events on it, in the order given. A three-day event
 *  appears under all three days; a 30-day event under its first and last. */
export function eventsByDay(events: CalendarEvent[]): Map<DateOnly, CalendarEvent[]> {
  const byDay = new Map<DateOnly, CalendarEvent[]>();
  for (const event of events) {
    for (const day of markedDays(event)) {
      const list = byDay.get(day) ?? [];
      list.push(event);
      byDay.set(day, list);
    }
  }
  return byDay;
}

/* ─── Lists ───────────────────────────────────────────────────── */

/** One day's events for the list under the grid: attending first, then events
 *  that begin that day before ones already running, then by title. */
export function sortDayEvents(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => {
    const attendingOrder = Number(b.attending !== null) - Number(a.attending !== null);
    if (attendingOrder !== 0) return attendingOrder;
    if (a.starts_on !== b.starts_on) return b.starts_on.localeCompare(a.starts_on);
    return a.title.localeCompare(b.title);
  });
}

/** An event on one particular day: the day it is listed under, and
 *  "starts" / "ends" when it is a long event's start or end. */
export type EventOnDay = { event: CalendarEvent; day: DateOnly; moment: EventMoment | null };

/** The first marked day of `event` on or after `from`, or null when it has none. */
function firstMarkedDayFrom(event: CalendarEvent, from: DateOnly): DateOnly | null {
  return markedDays(event).find((day) => day >= from) ?? null;
}

/** The earliest marked day after `day` across all events (the empty day's
 *  "Next up" link), or null. */
export function nextEventAfter(events: CalendarEvent[], day: DateOnly): EventOnDay | null {
  let next: EventOnDay | null = null;
  for (const event of events) {
    const nextDay = firstMarkedDayFrom(event, addDays(day, 1));
    if (!nextDay) continue;
    if (!next || nextDay < next.day) next = { event, day: nextDay, moment: momentOn(event, nextDay) };
  }
  return next;
}

/** "Coming up for you": the next five events the member is attending (still
 *  running or later), else the next five upcoming. A long event appears once,
 *  on whichever of its start or end comes next; a shorter one on its start
 *  day, even when it is already running. */
export function comingUp(
  events: CalendarEvent[],
  today: DateOnly,
  limit = 5,
): { attending: boolean; items: EventOnDay[] } {
  const items: { item: EventOnDay; attending: boolean; started: boolean }[] = [];
  for (const event of events) {
    if (lastDayOf(event) < today) continue;
    const day = isLongEvent(event) ? firstMarkedDayFrom(event, today) : event.starts_on;
    if (!day) continue;
    items.push({
      item: { event, day, moment: momentOn(event, day) },
      attending: event.attending !== null,
      started: day < today,
    });
  }
  items.sort((a, b) => a.item.day.localeCompare(b.item.day) || a.item.event.title.localeCompare(b.item.event.title));

  const attending = items.filter((i) => i.attending);
  if (attending.length > 0) return { attending: true, items: attending.slice(0, limit).map((i) => i.item) };
  // Not attending anything: upcoming only, so short events already running are left out.
  const upcoming = items.filter((i) => !i.started);
  return { attending: false, items: upcoming.slice(0, limit).map((i) => i.item) };
}

/* ─── Labels ──────────────────────────────────────────────────── */

/** "Hackathon", "Conference", "Networking event". */
export function kindLabel(kind: CalendarKind): string {
  const noun = KIND_CONFIG[kind].noun;
  return noun.charAt(0).toUpperCase() + noun.slice(1);
}

/** Where it happens: the location, "Online", or the area as a fallback. */
export function eventPlace(event: Pick<CalendarEvent, "location" | "format" | "area">): string {
  if (event.location) return event.location;
  if (event.format === "online") return "Online";
  return AREA_LABELS[event.area];
}
