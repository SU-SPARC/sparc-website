"use client";

/* /events — the record rows and the recordings list.
 *
 * Client because two things here can only be decided in the browser: which
 * events are upcoming (needs a real clock) and whether a row is open.
 * Everything static on the page — the h1, the intro, the section headings —
 * stays in the server shell (./page.tsx).
 *
 * NO SEARCH, NO CARDS, NO IMAGES, NO MOTION beyond <Expand> (SPEC "/events").
 * The expand is components/ui/expand.tsx and nothing in this file
 * re-implements it: there is exactly one grid-template-rows animation in the
 * codebase and it lives there. Its reduced-motion behaviour comes from the
 * universal block in globals.css, so no JS guard is needed or wanted.
 *
 * CONTENT RULE. No date, room, title, kind or URL is typed into this file —
 * every one of those comes from the events and recordings tables, fetched by
 * the server shell (./page.tsx) and passed down as props. The only literal
 * strings are UI chrome traceable to the page this replaces (see the
 * per-string comments below).
 *
 * DATES. `starts_at` is an instant (timestamptz) and arrives here as a real
 * Date — React 19 serialises Date across the RSC boundary. It is formatted
 * with formatInstant(), which pins America/New_York, so the server render
 * and the hydrated client produce the same string whatever either machine's
 * zone is. Recording dates are date-only strings ('YYYY-MM-DD') formatted by
 * formatDateOnly(), which does no zone arithmetic at all. Nothing here calls
 * Intl.DateTimeFormat without a zone.
 */

import * as React from "react";

import { Expand, ExpandTrigger } from "@/components/ui/expand";
import { MicroLabel } from "@/components/ui/micro-label";
import { Pill } from "@/components/ui/pill";
import { formatDateOnly, formatInstant, isoDateOnly } from "@/lib/data/dates";
import { currentTerm, past, upcoming } from "@/lib/data/events-helpers";
import type { Recording, SparcEvent } from "@/lib/data/types";

/* Dates are formatted from the data, never written out: "Feb 5, 2026". */
const DATE_OPTS: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

/* The one link treatment on this page. Same class string as the 404's route
   links (app/not-found.tsx:43) so the two do not drift. `hover:` is already
   wrapped in a pointer-capability query by Tailwind v4, so it never fires on
   touch, and the colour transition is covered by the global reduced-motion
   block. */
const LINK_CLASS =
  "inline-block rounded-control border border-line bg-surface-1 px-3 py-2 text-sm text-ink transition-colors duration-200 ease-out hover:border-line-strong";

/**
 * The record reads oldest → newest and continues downward (SPEC "/events").
 * `past()` returns most-recent-first, which is the opposite, so every list is
 * put back in ascending `starts_at` order here. Ordered by the date itself,
 * never by array position or by the `#NN` ref: refs are editable text and an
 * event added later with an earlier date must still land in its place.
 */
function inRecordOrder(list: SparcEvent[]): SparcEvent[] {
  return [...list].sort(
    (a, b) => a.starts_at.getTime() - b.starts_at.getTime(),
  );
}

/* ── one row ─────────────────────────────────────────────────────────── */

/* A ruled row, not a card: a hairline on top and nothing else. The list adds
   the closing rule at the bottom. */
function EventRow({ event }: { event: SparcEvent }) {
  const [open, setOpen] = React.useState(false);
  const bodyId = React.useId();

  return (
    <li className="border-t border-line">
      <div className="flex items-start justify-between gap-3 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <MicroLabel as="span">{event.ref}</MicroLabel>
            <MicroLabel as="span">
              <time dateTime={isoDateOnly(event.starts_at)}>
                {formatInstant(event.starts_at, DATE_OPTS)}
              </time>
            </MicroLabel>
            <Pill className="uppercase">{event.kind}</Pill>
          </div>
          <h3 className="mt-2 text-lg font-medium [overflow-wrap:anywhere]">
            {event.title}
          </h3>
        </div>

        {/* The trigger owns aria-expanded/aria-controls; the row must not
            carry them. It renders an icon and no text, so it needs a name —
            the event's own title, so nothing is invented for it. */}
        <ExpandTrigger
          open={open}
          controls={bodyId}
          onOpenChange={setOpen}
          aria-label={event.title}
        />
      </div>

      <Expand open={open} id={bodyId}>
        <div className="flex max-w-text flex-col gap-2.5 pb-4">
          {event.location ? (
            <MicroLabel as="p" className="block">
              {event.location}
            </MicroLabel>
          ) : null}
          {event.description ? (
            <p className="text-sm text-ink-muted">{event.description}</p>
          ) : null}
          {/* The recording slot: renders only when the event row carries a
              recording_url. The seeded events have none — nothing maps the
              Zoom recordings to them, and attaching one by guess would be
              inventing a fact. */}
          {event.recording_url ? (
            <a
              href={event.recording_url}
              target="_blank"
              rel="noreferrer"
              className={`${LINK_CLASS} self-start`}
            >
              Watch Recording
            </a>
          ) : null}
        </div>
      </Expand>
    </li>
  );
}

function EventList({ list }: { list: SparcEvent[] }) {
  return (
    <ul className="mt-3 border-b border-line">
      {list.map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </ul>
  );
}

/* ── the record ──────────────────────────────────────────────────────── */

/* The empty state. The term is DERIVED — currentTerm(now), never a typed
   "Fall 2026" (SPEC "/events"); before mount there is no clock, so the label
   is left out rather than guessed. The sentence is the old page's own,
   verbatim from app/events/page.tsx:128. */
function NoUpcoming({ now }: { now: Date | null }) {
  return (
    <div className="mt-3 border-y border-line py-4">
      {now ? (
        <MicroLabel as="p" className="mb-2 block">
          {currentTerm(now)}
        </MicroLabel>
      ) : null}
      <p className="max-w-text text-sm text-ink-muted">
        No upcoming events right now. Check back soon for updates.
      </p>
    </div>
  );
}

/**
 * HOW `now` IS HANDLED — the whole reason this component is a client one.
 *
 * The page is prerendered (ISR), so a `now` taken during render would be the
 * clock of whichever request regenerated the page, baked into HTML: visitors
 * after that would see a stale upcoming/past split. lib/data/events-helpers.ts
 * forbids a module-scope clock for the same reason.
 *
 * So `now` starts null and is set in an effect, which runs only in the
 * browser. While it is null — server render AND the first client render, the
 * two that hydration compares — every event renders in one unheaded list in
 * date order. Identical markup on both sides, so there is nothing to
 * mismatch. The split headings appear on mount. Nothing is hidden before then:
 * every row is in the prerendered HTML and readable with JS off.
 */
export function EventRecord({ events }: { events: SparcEvent[] }) {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
  }, []);

  if (now === null) {
    return events.length > 0 ? (
      <EventList list={inRecordOrder(events)} />
    ) : (
      <NoUpcoming now={null} />
    );
  }

  const upcomingRows = inRecordOrder(upcoming(events, now));
  const pastRows = inRecordOrder(past(events, now));

  return (
    <>
      <section>
        {/* "Upcoming" — app/events/page.tsx:121 (pre-rewrite). */}
        <MicroLabel as="h2" className="block">
          Upcoming
        </MicroLabel>
        {upcomingRows.length > 0 ? (
          <EventList list={upcomingRows} />
        ) : (
          <NoUpcoming now={now} />
        )}
      </section>

      {pastRows.length > 0 ? (
        <section className="mt-section">
          {/* "PAST" — app/events/page.tsx:136 (pre-rewrite). MicroLabel
              uppercases, so this renders as it did there. */}
          <MicroLabel as="h2" className="block">
            Past
          </MicroLabel>
          <EventList list={pastRows} />
        </section>
      ) : null}
    </>
  );
}

/* ── recordings ──────────────────────────────────────────────────────── */

/**
 * The Zoom recordings, as their own ruled list after the events, in the
 * order getRecordings() returns (sort_order, then date). They are listed on
 * their own rather than under events: the seeded recordings' dates match no
 * event, and `event_id` is optional.
 *
 * No state and no clock here; it lives in this file rather than the server
 * shell only so that one DATE_OPTS covers the whole page. The URLs are read
 * from the data and never retyped.
 */
export function RecordingList({ recordings }: { recordings: Recording[] }) {
  return (
    <ul className="mt-3 border-b border-line">
      {recordings.map((recording) => (
        <li key={recording.id} className="border-t border-line py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <MicroLabel as="span">
              <time dateTime={recording.recorded_on}>
                {formatDateOnly(recording.recorded_on, DATE_OPTS)}
              </time>
            </MicroLabel>
            <Pill className="uppercase">{recording.kind}</Pill>
          </div>
          <h3 className="mt-2 text-lg font-medium [overflow-wrap:anywhere]">
            {recording.title}
          </h3>
          {recording.description ? (
            <p className="mt-1 max-w-text text-sm text-ink-muted">
              {recording.description}
            </p>
          ) : null}
          {/* "Watch Recording" — app/events/page.tsx:170 (pre-rewrite). */}
          <a
            href={recording.url}
            target="_blank"
            rel="noreferrer"
            className={`${LINK_CLASS} mt-3`}
          >
            Watch Recording
          </a>
        </li>
      ))}
    </ul>
  );
}
