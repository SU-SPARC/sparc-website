"use client";

/* The selected day's events, under the month grid inside the dashboard
 * calendar card (docs/DESIGN-BRIEF.md §14, point 2): a "Sat, Oct 24"
 * heading, then one row per event with its kind, title link, place and the
 * member's "Enrolling" / "Interested" pill. A long event (over 14 days) is
 * listed only on its start and end days, with "starts" / "ends" after the
 * title. Busy days show the first five and a "Show N more" button.
 *
 * Used by: components/locator/mini-calendar.tsx, which passes key={day} so
 * the "Show more" state resets when the day changes. */

import Link from "next/link";
import { useState } from "react";

import { MicroLabel } from "@/components/ui/micro-label";
import { eventPlace, momentOn, type CalendarEvent, type EventOnDay } from "@/lib/data/calendar-events";
import { dayHeading, shortDay } from "@/lib/data/calendar-helpers";
import { formatDateRange } from "@/lib/data/locator";
import type { DateOnly } from "@/lib/data/types";
import { cn } from "@/lib/utils";

import { AttendingPill, KindPill } from "./calendar-event-meta";

const FIRST_ROWS = 5;
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
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? events : events.slice(0, FIRST_ROWS);
  const hiddenCount = events.length - FIRST_ROWS;

  return (
    <section aria-labelledby="calendar-day-heading" className="flex flex-col gap-2 border-t border-line pt-4">
      <MicroLabel as="h3" id="calendar-day-heading">
        {dayHeading(day, today)}
      </MicroLabel>

      {events.length === 0 ? <EmptyDayLine day={day} today={today} nextUp={nextUp} onSelectDay={onSelectDay} /> : null}

      {visible.length > 0 ? (
        <ul id="calendar-day-events" className="flex flex-col">
          {visible.map((event) => (
            <DayEventRow key={event.id} event={event} day={day} />
          ))}
        </ul>
      ) : null}

      {hiddenCount > 0 ? (
        <p className="text-sm">
          <button
            type="button"
            aria-expanded={showAll}
            aria-controls="calendar-day-events"
            onClick={() => setShowAll(!showAll)}
            className={cn("min-h-11 sm:min-h-0", linkClass)}
          >
            {showAll ? "Show fewer" : `Show ${hiddenCount} more`}
          </button>
        </p>
      ) : null}
    </section>
  );
}

function DayEventRow({ event, day }: { event: CalendarEvent; day: DateOnly }) {
  const moment = momentOn(event, day);
  const multiDay = event.ends_on !== null && event.ends_on !== event.starts_on;
  const dates = multiDay ? formatDateRange(event.starts_on, event.ends_on) : null;
  return (
    <li className="flex flex-wrap items-start gap-x-3 gap-y-1.5 border-t border-line py-3 first:border-t-0">
      <KindPill kind={event.kind} />
      <div className="flex min-w-0 flex-1 basis-48 flex-col gap-0.5">
        <p className="text-sm [overflow-wrap:anywhere]">
          <Link href={event.href} className="font-medium text-ink underline-offset-4 hover:underline">
            {event.title}
          </Link>
          {moment ? <span className="text-xs text-ink-muted"> · {moment}</span> : null}
        </p>
        <span className="text-xs text-ink-muted [overflow-wrap:anywhere]">
          {eventPlace(event)}
          {dates ? ` · ${dates}` : null}
        </span>
      </div>
      {event.attending ? <AttendingPill status={event.attending} /> : null}
    </li>
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
