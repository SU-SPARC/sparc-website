/* TimeAgo — <time dateTime title> with relative text ("2d ago") and the
 * absolute date (America/New_York) in `title`. Server-safe; relative text
 * is computed at render, so hydration differences are suppressed. */

import { formatInstant } from "@/lib/data/dates";

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

/** "just now", "5m ago", "2d ago", "in 3d". */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diff = Math.round((date.getTime() - now.getTime()) / 1000);
  const abs = Math.abs(diff);
  if (abs < 45) return "just now";
  for (const [unit, secs] of UNITS) {
    if (abs >= secs || unit === "minute") {
      const n = Math.max(1, Math.round(abs / secs));
      const short = { year: "y", month: "mo", week: "w", day: "d", hour: "h", minute: "m" }[
        unit as "year"
      ];
      return diff < 0 ? `${n}${short} ago` : `in ${n}${short}`;
    }
  }
  return "just now";
}

export interface TimeAgoProps {
  date: Date | string;
  className?: string;
}

export function TimeAgo({ date, className }: TimeAgoProps) {
  const d = typeof date === "string" ? new Date(date) : date;
  const absolute = formatInstant(d, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <time dateTime={d.toISOString()} title={absolute} className={className} suppressHydrationWarning>
      {relativeTime(d)}
    </time>
  );
}
