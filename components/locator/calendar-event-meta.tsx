/* The pieces every dashboard calendar row carries: the listing's kind
 * ("Hackathon"), "Enrolling" or "Interested" in accent text when the member
 * is attending, and the place with the "Outside Boston" marker.
 * Server-safe.
 *
 * Used by: components/locator/calendar-day-events.tsx (the selected day's
 * list) and components/locator/coming-up.tsx. */

import { Pill } from "@/components/ui/pill";
import { eventPlace, kindLabel, type CalendarEvent, type CalendarKind } from "@/lib/data/calendar-events";
import { AREA_LABELS, INTEREST_LABELS, isOutsideBoston } from "@/lib/data/locator";
import type { InterestStatus } from "@/lib/data/types";

export function KindPill({ kind }: { kind: CalendarKind }) {
  return <Pill className="whitespace-nowrap">{kindLabel(kind)}</Pill>;
}

/** The colour sits on a child span: Pill's own text colour would win a
 *  className override (see components/ui/micro-label.tsx). */
export function AttendingPill({ status }: { status: InterestStatus }) {
  return (
    <Pill className="whitespace-nowrap">
      <span className="text-accent-text">{INTEREST_LABELS[status]}</span>
    </Pill>
  );
}

/** "Austin, TX · Outside Boston", the word in the danger tone, for a
 *  hackathon or networking event in person outside Greater Boston; the
 *  plain place for everything else. When there is no location the place
 *  already is the area's label, so it is coloured rather than repeated.
 *  Sits inside a `text-xs` line, so the marker inherits that size. */
export function EventPlace({ event }: { event: CalendarEvent }) {
  const place = eventPlace(event);
  if (!isOutsideBoston(event)) return <>{place}</>;
  if (place === AREA_LABELS.outside_boston) return <span className="text-xs text-danger">{place}</span>;
  return (
    <>
      {place} · <span className="text-xs text-danger">{AREA_LABELS.outside_boston}</span>
    </>
  );
}
