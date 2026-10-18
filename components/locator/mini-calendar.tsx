"use client";

/* The "Locator calendar" card on the members' dashboard
 * (docs/DESIGN-BRIEF.md §14, points 1 and 2): month and year with
 * previous / next / Today, the month grid, a two-dot legend, and the
 * selected day's events under it. It moves only inside the window the page
 * loaded; at its first and last month a line points to the Locator.
 *
 * Used by: app/(members)/dashboard/page.tsx. Children:
 * calendar-month-grid.tsx and calendar-day-events.tsx. */

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { Button } from "@/components/forms/button";
import { MicroLabel } from "@/components/ui/micro-label";
import { SurfaceCard } from "@/components/ui/surface-card";
import { eventsByDay, nextEventAfter, sortDayEvents, type CalendarEvent } from "@/lib/data/calendar-events";
import { addMonths, isWithin, sameMonth, startOfMonth } from "@/lib/data/calendar-helpers";
import { monthKey, monthLabel } from "@/lib/data/locator";
import type { DateOnly } from "@/lib/data/types";

import { CalendarDayEvents } from "./calendar-day-events";
import { CalendarMonthGrid } from "./calendar-month-grid";

const linkClass = "text-ink underline underline-offset-4 hover:text-accent-text";

export interface MiniCalendarProps {
  /** every event in the window, from getCalendar() */
  events: CalendarEvent[];
  /** today in America/New_York, computed on the server */
  today: DateOnly;
  /** the first and last day the page loaded */
  windowFrom: DateOnly;
  windowTo: DateOnly;
}

export function MiniCalendar({ events, today, windowFrom, windowTo }: MiniCalendarProps) {
  const byDay = useMemo(() => eventsByDay(events), [events]);
  const [month, setMonth] = useState(startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [focused, setFocused] = useState(today);

  const firstMonth = startOfMonth(windowFrom);
  const lastMonth = startOfMonth(windowTo);
  const atFirstMonth = month <= firstMonth;
  const atLastMonth = month >= lastMonth;
  const monthName = monthLabel(monthKey(month));

  /** Prev / next: show that month; focus the selected day if it is there, else the 1st. */
  function showMonth(target: DateOnly) {
    const next = startOfMonth(target);
    if (next < firstMonth || next > lastMonth) return;
    setMonth(next);
    setFocused(sameMonth(selected, next) ? selected : next);
  }

  /** Click, Enter, or the "Next up" link: select the day and show its month. */
  function selectDay(day: DateOnly) {
    if (!isWithin(day, windowFrom, windowTo)) return;
    setSelected(day);
    setFocused(day);
    if (!sameMonth(day, month)) setMonth(startOfMonth(day));
  }

  /** An arrow key moved focus; follow it into the next or previous month. */
  function focusDay(day: DateOnly) {
    setFocused(day);
    if (!sameMonth(day, month)) setMonth(startOfMonth(day));
  }

  function showToday() {
    setMonth(startOfMonth(today));
    setSelected(today);
    setFocused(today);
  }

  return (
    <section aria-labelledby="locator-calendar">
      <SurfaceCard className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <MicroLabel as="h2" id="locator-calendar">
              Locator calendar
            </MicroLabel>
            <p aria-live="polite" className="text-base font-medium text-ink">
              {monthName}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <MonthButton label="Previous month" disabled={atFirstMonth} onClick={() => showMonth(addMonths(month, -1))}>
              <ChevronLeft aria-hidden="true" className="size-4" />
            </MonthButton>
            <MonthButton label="Next month" disabled={atLastMonth} onClick={() => showMonth(addMonths(month, 1))}>
              <ChevronRight aria-hidden="true" className="size-4" />
            </MonthButton>
            <Button variant="text" size="sm" onClick={showToday}>
              Today
            </Button>
          </div>
        </div>

        <CalendarMonthGrid
          month={month}
          monthName={monthName}
          today={today}
          selected={selected}
          focused={focused}
          windowFrom={windowFrom}
          windowTo={windowTo}
          byDay={byDay}
          onSelect={selectDay}
          onFocusDay={focusDay}
        />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-ink-muted">
          <Legend />
          {atFirstMonth || atLastMonth ? (
            <p>
              Beyond this window:{" "}
              <Link href="/dashboard/locator" className={linkClass}>
                open Locator →
              </Link>
            </p>
          ) : null}
        </div>

        <CalendarDayEvents
          key={selected}
          day={selected}
          today={today}
          events={sortDayEvents(byDay.get(selected) ?? [])}
          nextUp={nextEventAfter(events, selected)}
          onSelectDay={selectDay}
        />
      </SurfaceCard>
    </section>
  );
}

/** "● attending · ● event": the accent dot first, as in the grid. */
function Legend() {
  return (
    <p className="flex items-center gap-1.5">
      <span aria-hidden="true" className="size-1 rounded-full bg-accent" />
      attending
      <span aria-hidden="true">·</span>
      <span aria-hidden="true" className="size-1 rounded-full bg-ink-muted" />
      event
    </p>
  );
}

/** Previous / next month: 44px on touch screens, 32px on pointer layouts. */
function MonthButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-control text-ink-muted transition-colors enabled:hover:bg-surface-2 enabled:hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 sm:size-8"
    >
      {children}
    </button>
  );
}
