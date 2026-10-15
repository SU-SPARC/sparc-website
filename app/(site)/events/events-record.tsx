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
 * every one of those comes from lib/content/events.ts. The only literal
 * strings are UI chrome traceable to the page this replaces (see the
 * per-string comments below).
 *
 * Bundle note: this imports the content module rather than taking the events
 * as props, and that is deliberate, not laziness. `starts_at` is built with
 * the local-time Date constructor, so a Date handed across the RSC boundary
 * would be one absolute instant formatted in two different zones — server
 * midnight Feb 5 renders as "Feb 4" for any visitor west of the build
 * machine, i.e. a hydration mismatch on every date on the page. Importing the
 * module means each side constructs midnight in its OWN zone and formats it
 * in that same zone, so the two renders agree by construction. Same reasoning
 * as app/preview/exhibits.tsx:81-88. The cost is ~3 events + 3 recordings of
 * JSON in the client bundle.
 */

import * as React from "react";

import { Expand, ExpandTrigger } from "@/components/ui/expand";
import { MicroLabel } from "@/components/ui/micro-label";
import { Pill } from "@/components/ui/pill";
import {
  currentTerm,
  events,
  past,
  recordings,
  upcoming,
} from "@/lib/content/events";
import type { SparcEvent } from "@/lib/content/types";

/* Dates are formatted from the real Date, never written out. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/* The one link treatment on this page. Same class string as the 404's route
   links (app/not-found.tsx:43) so the two do not drift. `hover:` is already
   wrapped in a pointer-capability query by Tailwind v4, so it never fires on
   touch, and the colour transition is covered by the global reduced-motion
   block. */
const LINK_CLASS =
  "inline-block rounded-control border border-line bg-surface-1 px-3 py-2 text-sm text-ink transition-colors duration-200 ease-out hover:border-line-strong";

/**
 * Puts a derived list back into the source array's order — #01 → #03,
 * ascending, so the record reads oldest → newest and continues downward
 * (SPEC "/events"). `past()` returns most-recent-first, which is the opposite;
 * rather than re-sort by date here (a second place that could disagree with
 * the helper), the refs are simply looked up against `events`, which is
 * already in ref order.
 */
function inRecordOrder(list: SparcEvent[]): SparcEvent[] {
  const refs = new Set(list.map((event) => event.ref));
  return events.filter((event) => refs.has(event.ref));
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
              {DATE_FORMAT.format(event.starts_at)}
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
          {/* The recording slot. `recording_url` is null on all three events
              and nothing in the repo maps the three Zoom recordings to them
              (lib/content/events.ts:66-71), so today this renders on no row.
              It ships for when the data does — attaching a recording by guess
              would be inventing a fact. */}
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
        <EventRow key={event.ref} event={event} />
      ))}
    </ul>
  );
}

/* ── the record ──────────────────────────────────────────────────────── */

/**
 * HOW `now` IS HANDLED — the whole reason this component is a client one.
 *
 * The page is statically prerendered, so a `now` taken during render would be
 * the BUILD clock baked into HTML: every visitor after the build date would
 * see a stale upcoming/past split, and lib/content/events.ts:103-105 forbids a
 * module-scope clock for exactly that reason.
 *
 * So `now` starts null and is set in an effect, which runs only in the
 * browser. While it is null — server render AND the first client render, the
 * two that hydration compares — every event renders in one unheaded list in
 * ref order. Identical markup on both sides, so there is nothing to mismatch.
 * The split headings appear on mount. Nothing is hidden before then: all three
 * rows are in the prerendered HTML and readable with JS off.
 */
export function EventRecord() {
  const [now, setNow] = React.useState<Date | null>(null);

  React.useEffect(() => {
    setNow(new Date());
  }, []);

  if (now === null) {
    return <EventList list={events} />;
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
          /* Empty state. The term is DERIVED — currentTerm(now), never a typed
             "Fall 2026" (SPEC "/events"). The sentence is the old page's own,
             verbatim from app/events/page.tsx:128. */
          <div className="mt-3 border-y border-line py-4">
            <MicroLabel as="p" className="block">
              {currentTerm(now)}
            </MicroLabel>
            <p className="mt-2 max-w-text text-sm text-ink-muted">
              No upcoming events right now. Check back soon for updates.
            </p>
          </div>
        )}
      </section>

      <section className="mt-section">
        {/* "PAST" — app/events/page.tsx:136 (pre-rewrite). MicroLabel
            uppercases, so this renders as it did there. */}
        <MicroLabel as="h2" className="block">
          Past
        </MicroLabel>
        <EventList list={pastRows} />
      </section>
    </>
  );
}

/* ── recordings ──────────────────────────────────────────────────────── */

/**
 * The three Zoom recordings, as their own ruled list after the events. They
 * are NOT attached to any event — see lib/content/events.ts:66-71: their dates
 * match no event and nothing in the repo maps one to the other.
 *
 * No state and no clock here; it lives in this file rather than the server
 * shell only so that one DATE_FORMAT covers the whole page. The URLs are read
 * from the data and never retyped.
 */
export function RecordingList() {
  return (
    <ul className="mt-3 border-b border-line">
      {recordings.map((recording) => (
        <li key={recording.link} className="border-t border-line py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <MicroLabel as="span">
              {DATE_FORMAT.format(recording.date)}
            </MicroLabel>
            <Pill className="uppercase">{recording.kind}</Pill>
          </div>
          <h3 className="mt-2 text-lg font-medium [overflow-wrap:anywhere]">
            {recording.title}
          </h3>
          <p className="mt-1 max-w-text text-sm text-ink-muted">
            {recording.description}
          </p>
          {/* "Watch Recording" — app/events/page.tsx:170 (pre-rewrite). */}
          <a
            href={recording.link}
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
