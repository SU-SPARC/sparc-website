/* Pure helpers for the board: sprint wording and grouping, the backlog
 * rule, date-only arithmetic, due-date states and the visible-task filter.
 * No React, no I/O; safe on the server and in the browser. */

import { formatDateOnly, isoDateOnly } from "@/lib/data/dates";
import type { BoardColumn, BoardSprint, BoardTask } from "@/lib/data/pm";
import type { DateOnly, Methodology } from "@/lib/data/types";

export const usesSprints = (m: Methodology) => m !== "kanban";

/** "Sprint" everywhere, "Iteration" for SAFe. */
export function sprintNoun(m: Methodology, plural = false): string {
  const word = m === "safe" ? "Iteration" : "Sprint";
  return plural ? `${word}s` : word;
}

/** The backlog column is the first column when its name ends in "Backlog"
 *  (Backlog / Product Backlog / Program Backlog). It always shows tasks with
 *  no sprint. "Sprint Backlog" is second, so it never matches. */
export function backlogColumnId(columns: BoardColumn[]): string | null {
  const first = columns[0];
  return first && /backlog$/i.test(first.name.trim()) ? first.id : null;
}

/** Today in America/New_York as YYYY-MM-DD. */
export const todayDateOnly = (): DateOnly => isoDateOnly(new Date());

function utcDays(d: DateOnly): number {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day) / 86_400_000;
}

/** b − a in whole days. */
export const daysBetween = (a: DateOnly, b: DateOnly) => utcDays(b) - utcDays(a);

export type SprintPhase = "current" | "upcoming" | "past" | "undated";

export function sprintPhase(s: BoardSprint, today: DateOnly): SprintPhase {
  if (!s.startsOn && !s.endsOn) return "undated";
  if (s.endsOn && s.endsOn < today) return "past";
  if (s.startsOn && s.startsOn > today) return "upcoming";
  return "current";
}

/** "Oct 6–19", "Oct 28–Nov 9", "from Oct 6". */
export function sprintDates(s: BoardSprint): string {
  const short = (d: DateOnly) => formatDateOnly(d, { month: "short", day: "numeric" });
  if (s.startsOn && s.endsOn) {
    const sameMonth = s.startsOn.slice(0, 7) === s.endsOn.slice(0, 7);
    return sameMonth
      ? `${short(s.startsOn)}–${formatDateOnly(s.endsOn, { day: "numeric" })}`
      : `${short(s.startsOn)}–${short(s.endsOn)}`;
  }
  if (s.startsOn) return `from ${short(s.startsOn)}`;
  if (s.endsOn) return `until ${short(s.endsOn)}`;
  return "No dates";
}

/** "Sprint 3 · Oct 6–19 · 6 days left" */
export function sprintLabel(s: BoardSprint, today: DateOnly): string {
  const parts = [s.name, sprintDates(s)];
  if (sprintPhase(s, today) === "current" && s.endsOn) {
    const left = daysBetween(today, s.endsOn);
    parts.push(left === 0 ? "ends today" : `${left} day${left === 1 ? "" : "s"} left`);
  }
  return parts.filter((p) => p !== "No dates").join(" · ");
}

/** "PI 2" from "PI 2 · Iteration 3", else null. */
export function piOf(name: string): string | null {
  const m = /^\s*(PI\s*\d+)/i.exec(name);
  return m ? m[1].toUpperCase().replace(/\s+/, " ") : null;
}

/** Group sprints for the selector: SAFe by PI, others by phase. */
export function groupSprints(
  sprints: BoardSprint[],
  methodology: Methodology,
  today: DateOnly,
): Array<{ label: string; sprints: BoardSprint[] }> {
  if (methodology === "safe") {
    const groups = new Map<string, BoardSprint[]>();
    for (const s of sprints) {
      const key = piOf(s.name) ?? "No PI";
      groups.set(key, [...(groups.get(key) ?? []), s]);
    }
    return [...groups.entries()].map(([label, list]) => ({ label, sprints: list }));
  }
  const order: SprintPhase[] = ["current", "upcoming", "past", "undated"];
  const names: Record<SprintPhase, string> = { current: "Current", upcoming: "Upcoming", past: "Past", undated: "No dates" };
  return order
    .map((phase) => ({ label: names[phase], sprints: sprints.filter((s) => sprintPhase(s, today) === phase) }))
    .filter((g) => g.sprints.length > 0);
}

/** The default selection: Scrum/SAFe → the current sprint (if any),
 *  Scrumban and everything else → all. */
export function defaultSprint(sprints: BoardSprint[], methodology: Methodology, today: DateOnly): string {
  if (methodology === "scrum" || methodology === "safe") {
    const current = sprints.find((s) => sprintPhase(s, today) === "current");
    if (current) return current.id;
  }
  return "all";
}

/** Next suggested name: "Sprint 4", or "PI 2 · Iteration 3" for SAFe. */
export function nextSprintName(sprints: BoardSprint[], methodology: Methodology): string {
  if (methodology === "safe") {
    const last = sprints[sprints.length - 1];
    const m = last ? /PI\s*(\d+)\s*·\s*Iteration\s*(\d+)/i.exec(last.name) : null;
    if (m) return `PI ${m[1]} · Iteration ${Number(m[2]) + 1}`;
    return "PI 1 · Iteration 1";
  }
  let max = 0;
  for (const s of sprints) {
    const m = /(\d+)\s*$/.exec(s.name);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `Sprint ${max + 1}`;
}

export type DueState = "overdue" | "soon" | "plain";

/** Overdue when past (and not done), soon within 2 days, else plain. */
export function dueState(dueOn: DateOnly, today: DateOnly, done: boolean): DueState {
  if (done) return "plain";
  const d = daysBetween(today, dueOn);
  if (d < 0) return "overdue";
  if (d <= 2) return "soon";
  return "plain";
}

export const shortDate = (d: DateOnly) => formatDateOnly(d, { month: "short", day: "numeric" });

export type Filters = { sprint: string; assignee: "me" | "all" };

/** Is this task shown under the current filters? */
export function isVisible(
  t: BoardTask,
  f: Filters,
  me: string,
  backlogId: string | null,
  sprintsOn: boolean,
): boolean {
  if (f.assignee === "me" && t.assigneeId !== me) return false;
  if (!sprintsOn) return true;
  if (t.columnId === backlogId) return t.sprintId === null;
  if (f.sprint === "all") return true;
  return t.sprintId === f.sprint;
}

/** The sprint a task should carry after landing in `columnId`, or
 *  undefined to leave it unchanged. Backlog clears it; other columns take
 *  the selected sprint so the task stays visible. */
export function sprintAfterMove(
  task: BoardTask,
  columnId: string,
  f: Filters,
  backlogId: string | null,
  sprintsOn: boolean,
): string | null | undefined {
  if (!sprintsOn) return undefined;
  if (columnId === backlogId) return task.sprintId === null ? undefined : null;
  if (f.sprint !== "all" && task.sprintId !== f.sprint) return f.sprint;
  return undefined;
}

/** Cookie listing declined request ids the dashboard has already shown. */
export const SEEN_DECLINED_COOKIE = "sparc_seen_declined";
