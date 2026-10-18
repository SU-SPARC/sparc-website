/* The two pills every dashboard calendar row carries: the listing's kind
 * ("Hackathon") and, when the member is attending, "Enrolling" or
 * "Interested" in accent text. Server-safe.
 *
 * Used by: components/locator/calendar-day-events.tsx (the selected day's
 * list) and components/locator/coming-up.tsx. */

import { Pill } from "@/components/ui/pill";
import { kindLabel, type CalendarKind } from "@/lib/data/calendar-events";
import { INTEREST_LABELS } from "@/lib/data/locator";
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
