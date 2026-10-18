"use client";

/* The 7-column month grid of the dashboard calendar (docs/DESIGN-BRIEF.md
 * §14, point 1): weekday initials, then six weeks of day buttons. Each day
 * shows an accent dot when the member is attending something that day and a
 * muted dot for any other event. Outside-month days are faint; days outside
 * the loaded window are disabled.
 *
 * Keyboard: roving tabindex (only the focused day is in the tab order), the
 * arrow keys move it a day or a week, Enter or Space selects.
 *
 * Used by: components/locator/mini-calendar.tsx, which owns the state. */

import { useEffect, useRef, type KeyboardEvent } from "react";

import type { CalendarEvent } from "@/lib/data/calendar-events";
import { addDays, isWithin, longDay, monthGrid, sameMonth, weekdayInitials } from "@/lib/data/calendar-helpers";
import { parseDateOnly } from "@/lib/data/dates";
import type { DateOnly } from "@/lib/data/types";
import { cn } from "@/lib/utils";

/** Arrow key → days to move the focused day. */
const ARROW_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

const NO_EVENTS: CalendarEvent[] = [];

export interface CalendarMonthGridProps {
  /** the first day of the visible month */
  month: DateOnly;
  /** "October 2026", the grid's accessible name */
  monthName: string;
  today: DateOnly;
  selected: DateOnly;
  /** the one day in the tab order */
  focused: DateOnly;
  windowFrom: DateOnly;
  windowTo: DateOnly;
  byDay: Map<DateOnly, CalendarEvent[]>;
  onSelect: (day: DateOnly) => void;
  /** an arrow key moved focus to `day` (always inside the window) */
  onFocusDay: (day: DateOnly) => void;
}

export function CalendarMonthGrid({
  month,
  monthName,
  today,
  selected,
  focused,
  windowFrom,
  windowTo,
  byDay,
  onSelect,
  onFocusDay,
}: CalendarMonthGridProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  // Set by an arrow key so the effect below moves DOM focus after the
  // re-render (the target day may be in a month that was not shown yet).
  const focusAfterRender = useRef(false);

  useEffect(() => {
    if (!focusAfterRender.current) return;
    focusAfterRender.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)?.focus();
  }, [focused, month]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, day: DateOnly) {
    const step = ARROW_STEPS[event.key];
    if (step === undefined) return;
    event.preventDefault();
    const target = addDays(day, step);
    if (!isWithin(target, windowFrom, windowTo)) return;
    focusAfterRender.current = true;
    onFocusDay(target);
  }

  const { year, month: monthNumber } = parseDateOnly(month);
  const weeks = monthGrid(year, monthNumber);

  return (
    <div ref={gridRef} role="group" aria-label={monthName} className="flex flex-col gap-1">
      <div aria-hidden="true" className="grid grid-cols-7">
        {weekdayInitials.map((initial, index) => (
          <span key={index} className="py-1 text-center text-label text-ink-muted">
            {initial}
          </span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week[0]} className="grid grid-cols-7">
          {week.map((day) => {
            // Days past the loaded window have incomplete data, so they show no dots.
            const inWindow = isWithin(day, windowFrom, windowTo);
            return (
              <DayButton
                key={day}
                day={day}
                today={today}
                events={inWindow ? (byDay.get(day) ?? NO_EVENTS) : NO_EVENTS}
                inMonth={sameMonth(day, month)}
                inWindow={inWindow}
                selected={day === selected}
                focused={day === focused}
                onSelect={onSelect}
                onKeyDown={handleKeyDown}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

interface DayButtonProps {
  day: DateOnly;
  today: DateOnly;
  events: CalendarEvent[];
  inMonth: boolean;
  inWindow: boolean;
  selected: boolean;
  focused: boolean;
  onSelect: (day: DateOnly) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, day: DateOnly) => void;
}

function DayButton({ day, today, events, inMonth, inWindow, selected, focused, onSelect, onKeyDown }: DayButtonProps) {
  const attendingCount = events.filter((e) => e.attending !== null).length;
  const hasOtherEvents = events.length > attendingCount;
  const isToday = day === today;

  return (
    <button
      type="button"
      data-day={day}
      tabIndex={focused ? 0 : -1}
      disabled={!inWindow}
      aria-pressed={selected}
      aria-current={isToday ? "date" : undefined}
      aria-label={
        inWindow ? dayLabel(day, today, events.length, attendingCount) : `${longDay(day, today)}: outside this window`
      }
      onClick={() => onSelect(day)}
      onKeyDown={(event) => onKeyDown(event, day)}
      className={cn(
        "mx-auto flex h-11 w-full max-w-11 flex-col items-center justify-center gap-1 rounded-control border",
        "text-sm leading-none tabular-nums transition-colors enabled:hover:bg-surface-2 sm:size-9",
        isToday ? "border-accent" : "border-transparent",
        selected && "bg-surface-2",
        inMonth ? "text-ink" : "text-ink-faint",
      )}
    >
      <span>{parseDateOnly(day).day}</span>
      {/* Always rendered so every number sits at the same height. */}
      <span aria-hidden="true" className="flex h-1 gap-0.5">
        {attendingCount > 0 ? <span className="size-1 rounded-full bg-accent" /> : null}
        {hasOtherEvents ? <span className="size-1 rounded-full bg-ink-muted" /> : null}
      </span>
    </button>
  );
}

/** "Saturday, October 24: 2 events, 1 attending" / "…: no events". */
function dayLabel(day: DateOnly, today: DateOnly, eventCount: number, attendingCount: number): string {
  const name = longDay(day, today);
  if (eventCount === 0) return `${name}: no events`;
  const events = eventCount === 1 ? "1 event" : `${eventCount} events`;
  if (attendingCount === 0) return `${name}: ${events}`;
  return `${name}: ${events}, ${attendingCount} attending`;
}
