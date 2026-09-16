/* /events — server shell.
 *
 * Numbered, ruled rows read from lib/content/events.ts. No cards, no search,
 * no images, no motion beyond the shared expand (SPEC "/events"). This file
 * carries the metadata and the static copy; the rows and the recordings —
 * the only parts that need a clock or open/closed state — are in
 * ./events-record.tsx.
 *
 * Every visible string here comes from the page this replaces: the heading
 * (old app/events/page.tsx:101), the intro (:103) and the recordings heading
 * (:148). Nothing is rewritten and nothing new is invented.
 *
 * The old page's two-column upcoming/past grid (old :118) dies here. It was
 * written with a comma inside a Tailwind v4 arbitrary value, which is invalid
 * and silently collapsed the layout; the rewrite has no such grid at all. The
 * literal is not repeated in this comment because scripts/verify.sh greps for
 * it, and a gate that trips on a comment is a gate people learn to ignore.
 */

import type { Metadata } from "next";

import { MicroLabel } from "@/components/ui/micro-label";

import { EventRecord, RecordingList } from "./events-record";

/* Verbatim from the old page's intro paragraph (app/events/page.tsx:103).
   One constant so the page and its metadata cannot drift apart. */
const INTRO =
  "Stay posted for upcoming SPARC events! We host workshops, talks, panels, and social gatherings to build community and share knowledge. Check back here for the latest updates on what we have planned.";

export const metadata: Metadata = {
  title: "Events",
  description: INTRO,
};

export default function EventsPage() {
  return (
    <main className="mx-auto max-w-page px-gutter py-section">
      <header>
        <h1 className="text-3xl font-medium">Events</h1>
        <p className="prose-block mt-3 text-ink-muted">{INTRO}</p>
      </header>

      <div className="mt-10">
        <EventRecord />
      </div>

      <section className="mt-section">
        {/* "Past Zoom Recordings" — app/events/page.tsx:148 (pre-rewrite). */}
        <MicroLabel as="h2" className="block">
          Past Zoom Recordings
        </MicroLabel>
        <RecordingList />
      </section>
    </main>
  );
}
