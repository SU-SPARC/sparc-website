/* "Coming up for you" on the members' dashboard: the next five events the
 * member is attending, or, when there are none, the next five upcoming events with a hint. Each row: a date
 * block, the title link, the kind, the place (with the "Outside Boston"
 * marker) and a relative day. A long event (over 14 days) appears
 * once, on whichever of its start or end comes next, with "starts" /
 * "ends" after the title. Left column, above My tasks. Server-safe, no
 * state.
 *
 * Used by: app/(members)/dashboard/page.tsx, with the same events the
 * calendar gets. */

import Link from "next/link";

import { MicroLabel } from "@/components/ui/micro-label";
import { comingUp, type CalendarEvent, type EventOnDay } from "@/lib/data/calendar-events";
import { relativeDay } from "@/lib/data/calendar-helpers";
import { formatDateOnly, parseDateOnly } from "@/lib/data/dates";
import { formatDateRange } from "@/lib/data/locator";
import type { DateOnly } from "@/lib/data/types";

import { AttendingPill, EventPlace, KindPill } from "./calendar-event-meta";

const linkClass = "text-ink underline underline-offset-4 hover:text-accent-text";

export interface ComingUpProps {
  /** every event in the dashboard's window, from getCalendar() */
  events: CalendarEvent[];
  /** today in America/New_York, computed on the server */
  today: DateOnly;
}

export function ComingUp({ events, today }: ComingUpProps) {
  const list = comingUp(events, today);
  return (
    <section aria-labelledby="coming-up" className="flex flex-col gap-3">
      <MicroLabel as="h2" id="coming-up">
        Coming up for you
      </MicroLabel>
      {list.attending ? null : (
        <p className="text-sm text-ink-muted">Mark 'I'm interested' on a listing to see it here.</p>
      )}
      {list.items.length === 0 ? (
        <p className="text-sm text-ink-muted">
          Nothing scheduled in the next few months.{" "}
          <Link href="/dashboard/locator" className={linkClass}>
            Open Locator →
          </Link>
        </p>
      ) : (
        <ul className="flex flex-col">
          {list.items.map((item) => (
            <ComingUpRow key={item.event.id} item={item} today={today} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ComingUpRow({ item, today }: { item: EventOnDay; today: DateOnly }) {
  const { event, day, moment } = item;
  return (
    <li className="flex items-start gap-3 border-t border-line py-3 last:border-b">
      <DateBlock date={day} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-sm [overflow-wrap:anywhere]">
          <Link href={event.href} className="font-medium text-ink underline-offset-4 hover:underline">
            {event.title}
          </Link>
          {moment ? <span className="text-xs text-ink-muted"> · {moment}</span> : null}
        </p>
        <span className="text-xs text-ink-muted [overflow-wrap:anywhere]">
          <EventPlace event={event} />
        </span>
        <span className="flex flex-wrap gap-1.5">
          <KindPill kind={event.kind} />
          {event.attending ? <AttendingPill status={event.attending} /> : null}
        </span>
      </div>
      <time
        dateTime={day}
        title={formatDateRange(event.starts_on, event.ends_on) ?? undefined}
        className="flex-none pt-0.5 text-xs text-ink-muted tabular-nums"
      >
        {whenLabel(day, today)}
      </time>
    </li>
  );
}

/** "In 6 days", "Tomorrow", "Today"; "Ongoing" for an event the member is
 *  attending that has already started (its row sits on its start day). */
function whenLabel(day: DateOnly, today: DateOnly): string {
  if (day < today) return "Ongoing";
  return relativeDay(day, today);
}

/** Day over a three-letter month, as in the Locator list's rows. */
function DateBlock({ date }: { date: DateOnly }) {
  return (
    <span className="flex size-10 flex-none flex-col items-center justify-center gap-0.5 rounded-control bg-surface-2 leading-none">
      <span className="text-sm leading-none font-medium text-ink tabular-nums">{parseDateOnly(date).day}</span>
      <span className="text-label leading-none uppercase text-ink-muted">
        {formatDateOnly(date, { month: "short" })}
      </span>
    </span>
  );
}
