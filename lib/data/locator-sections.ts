/* Locator list sections. Dated kinds: This week,
 * Running now (under way and longer than 14 days, like a month-long online
 * hackathon), Later this month, one per later month, Undated, then Past. Internships:
 * Closing this week, Open, No deadline, then Deadline passed. The last
 * section (the past rows) is collapsed unless it is the only one, so a
 * "Past" filter shows it open. Empty sections are left out. Pure;
 * re-exported from lib/data/locator.ts, so import from there. */

import { addDays, dateStatus, daysBetween, monthKey, monthLabel } from "./locator-dates";
import { isPastListing, type StateFields } from "./locator-state";
import type { DateOnly, Opportunity } from "./types";

export type LocatorSection<T> = { key: string; label: string; rows: T[]; collapsed: boolean };

type SectionFields = StateFields & Pick<Opportunity, "created_at">;

/** "This week" is today and the next six days (plus short events under way). */
const WEEK_AFTER_TODAY = 6;
/** An event under way that spans more days than this goes to "Running now"
 *  (the calendar's long-event rule). */
const LONG_EVENT_DAYS = 14;

const FIXED_LABELS: Record<string, string> = {
  this_week: "This week",
  running_now: "Running now",
  later_this_month: "Later this month",
  undated: "Undated",
  past: "Past",
  closing_this_week: "Closing this week",
  open: "Open",
  no_deadline: "No deadline",
  deadline_passed: "Deadline passed",
};

/** Rows grouped by key, each group in input order. */
function groupBy<T>(rows: T[], keyOf: (row: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const key = keyOf(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return groups;
}

/** Sections in `order`, skipping empty ones; the past section collapses
 *  when anything else is showing. */
function buildSections<T>(order: string[], groups: Map<string, T[]>, pastKey: string): LocatorSection<T>[] {
  const present = order.filter((key) => groups.has(key));
  return present.map((key) => ({
    key,
    label: FIXED_LABELS[key] ?? monthLabel(key),
    rows: groups.get(key) ?? [],
    collapsed: key === pastKey && present.length > 1,
  }));
}

/** Oldest first; rows without the date go last. */
function byDateAscending<T>(dateOf: (row: T) => string | null): (a: T, b: T) => number {
  return (a, b) => (dateOf(a) ?? "9999").localeCompare(dateOf(b) ?? "9999");
}

/** Most recent first; rows without the date go last. */
function byDateDescending<T>(dateOf: (row: T) => string | null): (a: T, b: T) => number {
  return (a, b) => (dateOf(b) ?? "").localeCompare(dateOf(a) ?? "");
}

/** Under way today and longer than 14 days, both ends counted. */
function isLongRunning(row: SectionFields, today: DateOnly): boolean {
  if (!row.starts_on || dateStatus(row, today) !== "ongoing") return false;
  const spanDays = daysBetween(row.starts_on, row.ends_on ?? row.starts_on) + 1;
  return spanDays > LONG_EVENT_DAYS;
}

function eventBucket(row: SectionFields, today: DateOnly): string {
  if (isPastListing(row, today)) return "past";
  if (!row.starts_on) return "undated";
  if (isLongRunning(row, today)) return "running_now";
  if (row.starts_on <= addDays(today, WEEK_AFTER_TODAY)) return "this_week";
  if (monthKey(row.starts_on) === monthKey(today)) return "later_this_month";
  return monthKey(row.starts_on);
}

/** Conferences, networking events and hackathons. Dated sections run by
 *  start date, Undated newest first, Past most recently ended first. */
export function sectionsForEvents<T extends SectionFields>(rows: T[], today: DateOnly): LocatorSection<T>[] {
  const groups = groupBy(rows, (row) => eventBucket(row, today));
  for (const [key, list] of groups) {
    if (key === "undated") list.sort(byDateDescending((r) => r.created_at));
    else if (key === "past") list.sort(byDateDescending((r) => r.ends_on ?? r.starts_on));
    else list.sort(byDateAscending((r) => r.starts_on));
  }
  const months = [...groups.keys()].filter((key) => !(key in FIXED_LABELS)).sort();
  const order = ["this_week", "running_now", "later_this_month", ...months, "undated", "past"];
  return buildSections(order, groups, "past");
}

function internshipBucket(row: SectionFields, today: DateOnly): string {
  if (isPastListing(row, today)) return "deadline_passed";
  if (!row.deadline_on) return "no_deadline";
  if (row.deadline_on <= addDays(today, WEEK_AFTER_TODAY)) return "closing_this_week";
  return "open";
}

/** Internships. Deadlines soonest first; Deadline passed most recent first;
 *  No deadline keeps the data layer's order (newest first). */
export function sectionsForInternships<T extends SectionFields>(rows: T[], today: DateOnly): LocatorSection<T>[] {
  const groups = groupBy(rows, (row) => internshipBucket(row, today));
  for (const [key, list] of groups) {
    if (key === "deadline_passed") list.sort(byDateDescending((r) => r.deadline_on));
    else if (key !== "no_deadline") list.sort(byDateAscending((r) => r.deadline_on));
  }
  return buildSections(["closing_this_week", "open", "no_deadline", "deadline_passed"], groups, "deadline_passed");
}
