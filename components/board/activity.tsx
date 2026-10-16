/* Activity timeline (docs/DESIGN-BRIEF.md §8, Activity tab): newest first,
 * grouped by day ("Today", "Yesterday", "Oct 12") in America/New_York; each
 * line a 20px avatar, a sentence and the time on the right. Task names link
 * to the task (?task=<id>) when it still exists. Server-safe; the task
 * sheet renders the same lines for one task. */

import Link from "next/link";
import * as React from "react";

import { formatInstant, isoDateOnly } from "@/lib/data/dates";
import type { ActivityItem } from "@/lib/data/pm";
import type { Methodology } from "@/lib/data/types";

import { shortDate, sprintNoun } from "./board-utils";
import { PersonAvatar } from "./meta";

type D = ActivityItem["detail"];

function TaskName({ item, href }: { item: ActivityItem; href?: (taskId: string) => string }) {
  const title = item.detail.title ?? "a task";
  if (item.taskId && href) {
    return (
      <Link href={href(item.taskId)} className="font-medium text-ink underline-offset-4 hover:underline">
        {title}
      </Link>
    );
  }
  return <span className="font-medium text-ink">{title}</span>;
}

const b = (s: string | null | undefined) => <span className="font-medium text-ink">{s}</span>;

/** "Allan moved **Fix nav** to Review" (without the actor). */
export function activityPredicate(
  item: ActivityItem,
  methodology: Methodology,
  href?: (taskId: string) => string,
): React.ReactNode {
  const d: D = item.detail;
  const task = <TaskName item={item} href={href} />;
  const noun = sprintNoun(methodology).toLowerCase();
  switch (item.action) {
    case "task_created":
      return <>added {task}{d.to ? <> to {b(d.to)}</> : null}</>;
    case "task_moved":
      return <>moved {task} to {b(d.to)}</>;
    case "task_completed":
      return <>completed {task}</>;
    case "task_deleted":
      return <>deleted {b(d.title)}</>;
    case "task_edited":
      switch (d.field) {
        case "title":
          return <>renamed {b(d.from)} to {task}</>;
        case "assignee":
          return d.to ? <>assigned {task} to {b(d.to)}</> : <>unassigned {task}</>;
        case "priority":
          return <>set {task} to {b(d.to)} priority</>;
        case "due":
          return d.to ? <>set {task} due {b(shortDate(d.to))}</> : <>cleared the due date of {task}</>;
        case "sprint":
          return d.to ? <>put {task} in {b(d.to)}</> : <>took {task} out of its {noun}</>;
        default:
          return <>edited {task}</>;
      }
    case "member_added":
      return <>added {b(d.name)} as {d.role === "lead" ? "lead" : "a member"}</>;
    case "member_removed":
      return <>removed {b(d.name)}</>;
    case "sprint_created":
      return <>planned {noun} {b(d.name)}</>;
    case "approved":
      return <>approved the project as {b(d.ref)}</>;
    case "declined":
      return <>declined the request{d.reason ? <>: {d.reason}</> : null}</>;
    default:
      return <>{item.action.replace(/_/g, " ")}</>;
  }
}

export function ActivityLine({
  item,
  methodology,
  href,
}: {
  item: ActivityItem;
  methodology: Methodology;
  href?: (taskId: string) => string;
}) {
  const at = new Date(item.createdAt);
  const name = item.actor?.name ?? "Someone";
  return (
    <li className="flex items-start gap-3 py-2">
      <PersonAvatar name={name} photo={item.actor?.photo} size={20} className="mt-px" />
      <p className="min-w-0 flex-1 text-sm text-ink-muted [overflow-wrap:anywhere]">
        <span className="text-ink">{name}</span> {activityPredicate(item, methodology, href)}
      </p>
      <time
        dateTime={item.createdAt}
        title={formatInstant(at, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        className="flex-none pt-px text-xs text-ink-muted tabular-nums"
      >
        {formatInstant(at, { hour: "numeric", minute: "2-digit" })}
      </time>
    </li>
  );
}

/** Group by New York calendar day: Today / Yesterday / "Oct 12". */
export function groupByDay(items: ActivityItem[], now = new Date()): Array<{ label: string; items: ActivityItem[] }> {
  const today = isoDateOnly(now);
  const yesterday = isoDateOnly(new Date(now.getTime() - 86_400_000));
  const groups: Array<{ key: string; label: string; items: ActivityItem[] }> = [];
  for (const it of items) {
    const key = isoDateOnly(new Date(it.createdAt));
    let g = groups[groups.length - 1];
    if (!g || g.key !== key) {
      const sameYear = key.slice(0, 4) === today.slice(0, 4);
      const label =
        key === today
          ? "Today"
          : key === yesterday
            ? "Yesterday"
            : sameYear
              ? shortDate(key)
              : `${shortDate(key)}, ${key.slice(0, 4)}`;
      g = { key, label, items: [] };
      groups.push(g);
    }
    g.items.push(it);
  }
  return groups;
}
