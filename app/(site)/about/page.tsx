/* /about — the merged about + team page. Server component; the two client
 * islands it mounts live in ./sections.tsx.
 *
 * /team is deleted; next.config.ts redirects it here (owned by the
 * orchestrator, not touched from this file).
 *
 * CONTENT RULE. Every visible string on this page is lifted from the two pages
 * this one replaces — app/about/page.tsx and app/team/page.tsx as they stood
 * before this rewrite — from lib/content, or from SPEC's approved provenance
 * list. Copy is TRIMMED in one place (the statement); nothing is reworded and
 * nothing is written. The `about:NN` references below are to the pre-rewrite
 * about page.
 *
 * Two things that are deliberately absent:
 *  - No values grid, per SPEC: every version of it needs one distinct photo
 *    per value and there is one classroom photo set. The old page's "Focus
 *    Areas" list was the same idea in bullet form and covers the same ground
 *    as the mission paragraph beside the statement, which is kept.
 *  - No member count anywhere. SPEC: two or three numbers only, and there is
 *    no member count — inventing one would be inventing a fact.
 *
 * ORDER, from SPEC "/about": oversized statement → full-bleed group photo with
 * an overlapping card → three facts → people → join CTA. <main> is deliberately
 * NOT the width container; each section carries its own, so the photo section
 * can be genuinely full-bleed instead of breaking out of a clamped parent.
 */

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { MicroLabel } from "@/components/ui/micro-label";
import { PosterText } from "@/components/ui/poster-text";
import { SurfaceCard } from "@/components/ui/surface-card";
import { members } from "@/lib/content/members";
import { projects } from "@/lib/content/projects";

import { PeopleDirectory, PhotoReveal } from "./sections";

/* about:11, trimmed to the clause the sentence is built on. The full sentence
   is the page description below; this is the same words, cut for display.
   Ultra's third and last sanctioned appearance (SPEC "Identity": the hero
   wordmark, the footer wordmark, and the /about opening statement). */
const STATEMENT = "We build and ship real software.";

/* about:33, verbatim. */
const MISSION =
  "We're open to all majors and exist to give students hands-on experience building real software and shipping it to actual users. We use AI agentic coding tools, collaborate on projects with real stakes, and create pathways for members to gain industry experience through internships.";

/* about:57 */
const STORY_LABEL = "Club Story";

/* about:62 and about:65, verbatim. */
const STORY = [
  "SPARC was founded in 2025 by a group of students who wanted to build real things, not just study theory. We started small and quickly grew into a community of builders from across majors, united by a shared drive to create software that matters.",
  "Formerly Computational Science and Mathematics (CSMA), we rebranded to SPARC in 2026 to better reflect who we are: a programming and AI club that ships software, secures internships for members, and stays plugged into where technology is actually heading.",
];

/* SPEC "/about": 3 projects · 4 semesters · biweekly meetings, and SPEC
   "Provenance of facts" — the semester count and the cadence are club-supplied
   (Aug 2026) and approved; the project count agrees with the repo. Two numbers
   and a cadence, no member count.

   The 3 is read off lib/content/projects rather than typed: it is countable
   data, so it should not be able to disagree with the projects page. */
const FACTS: { value: string; label: string }[] = [
  { value: String(projects.length), label: "Projects" },
  { value: "4", label: "Semesters" },
  { value: "Biweekly", label: "Meetings" },
];

/* people-badges.html:94 — the section is called People in the reference. */
const PEOPLE_LABEL = "People";

/* The CTA is the repo's own: the heading is the join page's h1 (join:18), the
   line under it is the tail of join:21, and "Join Us" is the home page's own
   call to action (app/page.tsx:63). */
const JOIN_HEADING = "Join SPARC";
const JOIN_LINE = "All experience levels welcome.";
const JOIN_CTA = "Join Us";

export const metadata: Metadata = {
  /* layout.tsx's template appends " · SPARC". */
  title: "About",
  /* about:11, verbatim. */
  description:
    "We're a student club at Suffolk University where we build and ship real software, explore AI agentic coding, discuss what's happening in tech, and help members land real-world internships.",
};

export default function AboutPage() {
  /* The module is already in this order; sorting here means the page cannot
     inherit a future edit's ordering mistake. */
  const roster = [...members].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="flex flex-col gap-section py-section">
      {/* ── statement ────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-page px-gutter">
        <div className="grid gap-8 md:grid-cols-[3fr_2fr] md:items-start">
          {/* text-poster-md is the spec'd size and is what renders from 640px
              up. Below that it cannot: "software." alone measures 410px at
              72px Ultra, which is wider than a 375px phone's whole text
              column, and a grid item's min-content had the statement pushing
              the document 59px wide (measured). poster-sm is the floor the
              token layer allows — below 48px Ultra's counters close up — and
              overflow-wrap covers the last few pixels on a 320px screen
              rather than scrolling the page sideways. */}
          <PosterText
            as="h1"
            size="sm"
            className="[overflow-wrap:anywhere] sm:text-poster-md"
          >
            {STATEMENT}
          </PosterText>
          <p className="prose-block text-ink-muted">{MISSION}</p>
        </div>
      </section>

      {/* ── group photo, full-bleed, with the story card overlapping its
             lower-left. The card is pulled up by a negative margin rather
             than absolutely positioned: it is prose, so its height is not
             knowable, and an absolute card would either clip or overhang the
             photo at some width. ──────────────────────────────────── */}
      <section>
        <PhotoReveal className="relative aspect-[4/3] w-full overflow-hidden bg-surface-2 sm:aspect-[16/9] lg:aspect-[21/9]">
          <Image
            src="/images/sparc-vc-4.webp"
            /* Decorative. The club is described in words on either side of it,
               and a written-out description of who is in the room would be
               content nobody supplied. */
            alt=""
            fill
            sizes="100vw"
            priority={false}
            className="object-cover"
          />
        </PhotoReveal>

        <div className="mx-auto w-full max-w-page px-gutter">
          {/* `relative` is load-bearing, not spacing. PhotoReveal always
              carries an inline clip-path, and clip-path creates a stacking
              context; a stacking context with z-index:auto paints in the
              positioned layer, which is above in-flow static content. So a
              STATIC card painted UNDER the photo where the negative margin
              overlaps them — the heading and most of the first paragraph
              disappeared behind the photo's bottom edge — no matter that it
              comes later in the DOM. Positioning the card puts it in the same
              layer, where DOM order decides and the card wins. This is
              invisible in any environment that cannot composite frames, which
              is how it shipped. */}
          <SurfaceCard className="relative -mt-10 flex flex-col gap-3 sm:-mt-16 sm:max-w-text lg:-mt-24">
            <MicroLabel as="h2">{STORY_LABEL}</MicroLabel>
            {STORY.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="text-sm text-ink-muted">
                {paragraph}
              </p>
            ))}
          </SurfaceCard>
        </div>
      </section>

      {/* ── facts ────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-page px-gutter">
        <dl className="grid gap-6 border-t border-line pt-6 sm:grid-cols-3">
          {FACTS.map((fact) => (
            /* dt before dd in the DOM; column-reverse puts the value on top
               without reordering the pair for a screen reader. */
            <div key={fact.label} className="flex flex-col-reverse gap-1">
              <MicroLabel as="dt">{fact.label}</MicroLabel>
              <dd className="text-4xl tabular-nums">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── people ───────────────────────────────────────────────── */}
      <section className="mx-auto flex w-full max-w-page flex-col gap-6 px-gutter">
        <MicroLabel as="h2">{PEOPLE_LABEL}</MicroLabel>
        <PeopleDirectory members={roster} />
      </section>

      {/* ── join ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-page px-gutter">
        <div className="flex flex-col items-start gap-4 rounded-card bg-accent-quiet p-6 sm:p-8">
          <h2 className="text-xl font-medium">{JOIN_HEADING}</h2>
          <p className="max-w-text text-ink-muted">{JOIN_LINE}</p>
          <Link
            href="/join"
            className="rounded-control bg-accent px-6 py-3 text-on-accent transition-colors duration-200 ease-out hover:bg-accent-hover"
          >
            {JOIN_CTA}
          </Link>
        </div>
      </section>
    </main>
  );
}
