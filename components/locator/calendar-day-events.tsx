"use client";

/* The selected day's events, under the month grid inside the compact
 * dashboard calendar card: a
 * "Sat, Oct 24" heading, then at most three rows, each with the title link,
 * the place (with the "Outside Boston" marker) and the dates, then the
 * kind and the member's "Enrolling" / "Interested" pill. A long event (over
 * 14 days) is listed only on its start and end days, with "starts" / "ends"
 * after the title. A busier day ends with "N more in Locator →", which opens
 * the members' list for the hidden entries' kind, or the Locator when they
 * are of mixed kinds.
 *
 * Used by: components/locator/mini-calendar.tsx. */

import Link from "next/link";

import { MicroLabel } from "@/components/ui/micro-label";
import { momentOn, type CalendarEvent, type EventOnDay } from "@/lib/data/calendar-events";
import { dayHeading, shortDay } from "@/lib/data/calendar-helpers";
import { formatDateRange, kindPath } from "@/lib/data/locator";
import type { DateOnly } from "@/lib/data/types";

import { AttendingPill, EventPlace, KindPill } from "./calendar-event-meta";

/** The compact card lists this many events; the rest are a link away. */
const MAX_ROWS = 3;
const LOCATOR_HREF = "/dashboard/locator";
const linkClass = "text-ink underline underline-offset-4 hover:text-accent-text";

export interface CalendarDayEventsProps {
  day: DateOnly;
  today: DateOnly;
  /** that day's events, already sorted (sortDayEvents) */
  events: CalendarEvent[];
  /** the next marked day after `day` and its event, for the empty line */
  nextUp: EventOnDay | null;
  /** selects a day (the empty line's "Next up" link) */
  onSelectDay: (day: DateOnly) => void;
}

export function CalendarDayEvents({ day, today, events, nextUp, onSelectDay }: CalendarDayEventsProps) {
  const visible = events.slice(0, MAX_ROWS);
  const hidden = events.slice(MAX_ROWS);

  return (
    <section aria-labelledby="calendar-day-heading" className="flex flex-col gap-1.5 border-t border-line pt-3">
      <MicroLabel as="h3" id="calendar-day-heading">
        {dayHeading(day, today)}
      </MicroLabel>

      {events.length === 0 ? <EmptyDayLine day={day} today={today} nextUp={nextUp} onSelectDay={onSelectDay} /> : null}

      {visible.length > 0 ? (
        <ul className="flex flex-col">
          {visible.map((event) => (
            <DayEventRow key={event.id} event={event} day={day} />
          ))}
        </ul>
      ) : null}

      {hidden.length > 0 ? <MoreInLocator hidden={hidden} /> : null}
    </section>
  );
}

/** Title (and "starts" / "ends"), then place · dates, then the pills. */
function DayEventRow({ event, day }: { event: CalendarEvent; day: DateOnly }) {
  const moment = momentOn(event, day);
  const multiDay = event.ends_on !== null && event.ends_on !== event.starts_on;
  const dates = multiDay ? formatDateRange(event.starts_on, event.ends_on) : null;
  return (
    <li className="flex flex-col gap-1 border-t border-line py-2 first:border-t-0 first:pt-1">
      <p className="text-sm [overflow-wrap:anywhere]">
        <Link href={event.href} className="font-medium text-ink underline-offset-4 hover:underline">
          {event.title}
        </Link>
        {moment ? <span className="text-xs text-ink-muted"> · {moment}</span> : null}
      </p>
      <span className="text-xs text-ink-muted [overflow-wrap:anywhere]">
        <EventPlace event={event} />
        {dates ? ` · ${dates}` : null}
      </span>
      <span className="flex flex-wrap gap-1.5">
        <KindPill kind={event.kind} />
        {event.attending ? <AttendingPill status={event.attending} /> : null}
      </span>
    </li>
  );
}

/** "2 more in Locator →": the hidden entries' kind list when they share one
 *  kind, else the Locator itself. */
function MoreInLocator({ hidden }: { hidden: CalendarEvent[] }) {
  const firstKind = hidden[0].kind;
  const oneKind = hidden.every((event) => event.kind === firstKind);
  const href = oneKind ? kindPath(firstKind, "member") : LOCATOR_HREF;
  return (
    <p className="text-sm">
      <Link href={href} className={linkClass}>
        {hidden.length} more in Locator →
      </Link>
    </p>
  );
}

/** "Nothing on Oct 18. Next up: HackHarvard, Oct 24 →" (the link selects that day).
 *  A long event's end reads "Next up: <title> ends, Nov 3 →". */
function EmptyDayLine({
  day,
  today,
  nextUp,
  onSelectDay,
}: {
  day: DateOnly;
  today: DateOnly;
  nextUp: EventOnDay | null;
  onSelectDay: (day: DateOnly) => void;
}) {
  return (
    <p className="text-sm text-ink-muted">
      Nothing on {shortDay(day, today)}.{" "}
      {nextUp ? (
        <>
          Next up:{" "}
          <button type="button" onClick={() => onSelectDay(nextUp.day)} className={linkClass}>
            {nextUp.event.title}
            {nextUp.moment ? ` ${nextUp.moment}` : null}, {shortDay(nextUp.day, today)} →
          </button>
        </>
      ) : (
        <>
          Nothing later in this window.{" "}
          <Link href={LOCATOR_HREF} className={linkClass}>
            Open Locator →
          </Link>
        </>
      )}
    </p>
  );
}
