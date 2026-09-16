/* Home — the two sections added after the client review ("the home page is
 * empty", two mockups supplied Aug 2026). Both are STATIC SERVER MARKUP: no
 * "use client", no WAAPI, no rAF, no observers. The photo drift stays the
 * only moving thing on this page, which is what SPEC's "the hero and the
 * drift must not both be moving at once" is protecting — a third animated
 * band would break that guarantee by a different route.
 *
 * They live in a sibling rather than in page.tsx only to keep page.tsx as
 * composition; nothing here needs its own module boundary.
 *
 * PROVENANCE. Every visible string below is either (a) countable data read
 * off lib/content, (b) copy already in the repo with the file:line given, or
 * (c) a string the client wrote in the mockup, each one marked
 * `client mockup, Aug 2026`. Nothing is written here.
 *
 * MOTION. One hover, `.lift` from globals.css — the site's existing -2px
 * card hover, already wrapped in @media (hover: hover) and (pointer: fine)
 * at 200ms. No new mechanism and no new CSS.
 */

import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { MicroLabel } from "@/components/ui/micro-label";
import { PosterText } from "@/components/ui/poster-text";
import { members } from "@/lib/content/members";
import { news } from "@/lib/content/news";
import { projects } from "@/lib/content/projects";

/* The quiet-link chip, verbatim from app/join/page.tsx:70-71 — itself the
   404 route chip (app/not-found.tsx:43). It is the site's established
   "this is a link, not a call to action" control, which is exactly what the
   mockup's outline "ALL EVENTS" button is. Duplicated rather than imported
   because it is a local const in join/page.tsx and this task does not own
   that file; if a third caller appears it should move to a primitive. */
const quietLink =
  "inline-flex items-center gap-2 rounded-control border border-line bg-surface-1 px-4 py-2.5 text-sm text-ink transition-colors duration-200 ease-out hover:border-line-strong";

/* ── stats band ──────────────────────────────────────────────────────
 *
 * Mockup A: a full-width band, four tiles, vertical hairlines between them
 * and a hairline above and below the row.
 *
 * The band is bg-surface-1 between two border-line hairlines, NOT a forced
 * .dark ramp. The mockup is a dark-theme screenshot, and a band pinned dark
 * in every theme would be a new theming mechanism nobody asked for; on the
 * dark and dim ramps surface-1 IS the dark band the client drew. Flagged to
 * the orchestrator rather than decided silently.
 *
 * SCREEN READERS. The value/label pair is a <dl>: MicroLabel as="dt" first
 * in the DOM, the value in a <dd> after it, and flex-col-reverse puts the
 * value on top visually without reordering the pair. This is the same
 * structure the /about facts strip already uses (app/about/page.tsx:153-162)
 * — one pattern for one idea, so the two read identically.
 *
 * ULTRA — SPEC AMENDMENT. SPEC caps the poster face at three appearances
 * (hero, footer wordmark, /about statement); these four values are a FOURTH,
 * approved by the client's own mockup and rendered only through PosterText,
 * which is still the only way the face is allowed on screen
 * (components/ui/poster-text.tsx). Nothing else on this page uses it — the
 * news heading below is Martian.
 *
 * COUNTS ARE DERIVED, NEVER TYPED. Anything countable is read off
 * lib/content so a stat cannot disagree with the page that lists the items.
 */

/* app/about/page.tsx:55 (STORY): "SPARC was founded in 2025". A string, not a
   number: it is a year read out of prose, not a count of anything. */
const FOUNDED = "2025";

const STATS: {
  value: string;
  label: string;
  /* Written out per tile rather than built from the index: Tailwind finds
     utilities by scanning source text, so every class has to appear whole.
     Two columns below lg (a 4-up row of poster-size values does not fit a
     phone), four at lg. */
  rule: string;
  accent?: boolean;
}[] = [
  {
    value: FOUNDED,
    /* client mockup, Aug 2026 — "FOUNDED AT SUFFOLK". The all-caps is
       MicroLabel's `uppercase`, not the source string, so every label in
       this array is stored in its natural casing and renders identically
       either way. */
    label: "Founded at Suffolk",
    rule: "pr-5",
    accent: true,
  },
  {
    /* Counted off the BADGE, not off the roster. The tile is labelled
       "Founding Members", so the thing it counts has to be founding badges —
       otherwise the label and the number are free to drift apart, which is
       exactly what the resolved NOTE(client) below was about.
       It renders identically today: the club confirmed (Aug 2026) that all
       12 members are founding and lib/content/members.ts badges every one of
       them, so this is 12 either way. The difference is that it now stays
       right on its own — the first non-founding member to join moves the
       roster without moving this number, which is what the label promises. */
    value: String(
      members.filter((m) => m.badges.includes("founding")).length,
    ),
    /* client mockup, Aug 2026 — "FOUNDING MEMBERS". A NOTE(client) stood here
       flagging the mockup's label as contradicting the data (only 7 of 12
       members carried the 'founding' badge, so the tile would have disagreed
       with the people cards on /about); the club resolved it by confirming
       all 12, Aug 2026. */
    label: "Founding Members",
    rule: "border-l border-line pr-5 pl-5",
  },
  {
    /* Zero-padded to two digits per the mockup's "03". padStart, not a typed
       "03", so it still reads off projects.length. */
    value: String(projects.length).padStart(2, "0"),
    /* client mockup, Aug 2026 — "PROJECTS SHIPPED". "ship" is the site's own
       verb for this: "we build and ship real software"
       (components/ui/hero.tsx:566-567, and app/page.tsx:28 metadata). */
    label: "Projects shipped",
    rule: "border-t border-line pt-8 pr-5 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5",
  },
  {
    /* The tagline's own tail, split at its natural seam: "All majors
       welcome." — components/ui/hero.tsx:568-569, app/page.tsx:28. */
    value: "All",
    label: "Majors welcome",
    rule: "border-t border-l border-line pt-8 pl-5 lg:border-t-0 lg:pt-0",
  },
];

export function StatsBand() {
  return (
    <section className="border-y border-line bg-surface-1">
      <dl className="mx-auto grid max-w-page grid-cols-2 gap-y-8 px-gutter py-10 lg:grid-cols-4 lg:py-12">
        {STATS.map((stat) => (
          /* dt before dd in the DOM; column-reverse puts the value on top
             without reordering the pair for a screen reader.
             justify-end pins the pair to the TOP of the stretched grid item:
             a column-reverse box runs its main axis upward, so flex-end IS
             the top edge. Without it the pair sits at the bottom, and in the
             2x2 at 375px a row where one label wraps to two lines and the
             other does not pushes the two values 16px out of line. */
          <div
            key={stat.label}
            className={`flex flex-col-reverse justify-end gap-2 ${stat.rule}`}
          >
            <MicroLabel as="dt">{stat.label}</MicroLabel>
            <dd>
              <PosterText
                size="sm"
                className={stat.accent ? "text-accent" : undefined}
              >
                {stat.value}
              </PosterText>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ── news preview ────────────────────────────────────────────────────
 *
 * Mockup B: kicker, heading, three photo cards, an outline chip under them.
 *
 * This is NOT the carousel SPEC killed. SPEC's objection was the interaction
 * — "dated items whose value is that they accumulate should not hide behind
 * interaction" — and these three are visible at once, in order, with no
 * control to advance them. /events still owns the full dated list, which is
 * where every card and the chip point; news has no detail pages.
 *
 * DATES are formatted from the Date in lib/content/news.ts, never re-typed.
 * en-GB with weekday/day/month/year short produces exactly the shape the
 * repo stored as a display string ("Fri, 24 Apr 2026"), so the weekday on
 * screen is the weekday the calendar says. An explicit locale, not the
 * runtime default, so the prerendered HTML is deterministic.
 *
 * ALT TEXT is empty. These are undescribed club photos and the card's own
 * title sits next to each one, so the image is decorative in context —
 * describing it would either repeat the title or invent a caption. (The
 * gallery in page.tsx numbers its photos instead, because there is no
 * adjacent text there to carry the meaning.)
 */

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/* Machine-readable pair for <time dateTime>, built off the same local Date so
   it cannot drift a day the way an ISO parse would. */
function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/* 0799ca5^:app/page.tsx:76 — the kicker the deleted news section carried. */
const NEWS_KICKER = "Latest Updates";
/* client mockup, Aug 2026. */
const NEWS_HEADING = "News from the club";
/* client mockup, Aug 2026 — the mockup's "ALL EVENTS →"; the arrow is the
   lucide ArrowRight the site already uses on its links (hero.tsx:576). */
const NEWS_CTA = "All events";

export function NewsPreview() {
  return (
    <section className="mx-auto flex max-w-page flex-col gap-6 px-gutter py-section">
      <div className="flex flex-col gap-3">
        <MicroLabel as="p" className="block">
          {NEWS_KICKER}
        </MicroLabel>
        {/* Martian, not the poster face — the four stat values above are the
            only Ultra this page adds. */}
        <h2 className="text-2xl font-medium sm:text-3xl">{NEWS_HEADING}</h2>
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((item) => (
          <li key={item.slug}>
            {/* The accessible name is the date plus the title, both inside
                the link, so no aria-label is needed to say where it goes. */}
            <Link href="/events" className="lift flex flex-col gap-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-card bg-surface-2">
                <Image
                  src={item.image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
                {/* Bottom-left of the photo, per the mockup — but on an
                    opaque surface chip rather than straight onto the
                    picture. Text over an arbitrary photo has no measurable
                    contrast ratio; accent-text on surface measures ~7:1 and
                    stays true on every ramp. */}
                <div className="absolute bottom-0 left-0 rounded-tr-card bg-surface px-3 py-2">
                  {/* The accent is on the <time>, NOT passed through
                      MicroLabel's className — cn() is a plain join with no
                      conflict resolution (lib/utils.ts), and the built
                      stylesheet emits .text-accent-text BEFORE
                      .text-ink-muted, so at equal specificity the
                      primitive's own colour would win and this would
                      silently render muted. Measured, not assumed: grep the
                      two class names in .next/static/chunks/*.css. Setting
                      the colour on the child means it is declared rather
                      than inherited, which beats inheritance outright and
                      does not depend on emission order at all. Everything
                      else — 13px, tracking, uppercase, width axis —
                      inherits down from MicroLabel unchanged. This is the
                      hazard app/join/page.tsx:123-128 warns about. */}
                  <MicroLabel as="span">
                    <time
                      dateTime={isoDate(item.date)}
                      className="text-accent-text"
                    >
                      {DATE_FORMAT.format(item.date)}
                    </time>
                  </MicroLabel>
                </div>
              </div>
              <h3 className="text-base font-medium text-ink">{item.title}</h3>
            </Link>
          </li>
        ))}
      </ul>

      <div>
        <Link href="/events" className={quietLink}>
          {NEWS_CTA}
          <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>
    </section>
  );
}
