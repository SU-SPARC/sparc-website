"use client";

/* /preview — the exhibits.
 *
 * Specimen catalogue for the design system. Every exhibit here either MOUNTS
 * the real component (Navbar, Footer, PersonCard) or is built from the S2
 * primitives in components/ui/ — nothing in this file re-implements a card, a
 * pill, a chip or (especially) an expand. If you find yourself adding a second
 * expand mechanism, stop: components/ui/expand.tsx is the only one.
 *
 * The event and project rows are still local compositions, and deliberately:
 * /events and /projects build their rows inside their own page modules
 * (app/events/events-record.tsx, app/projects/project-index.tsx) rather than
 * exporting a row component, so there is nothing to import. If a shared row
 * primitive is ever extracted, these two exhibits mount it instead.
 *
 * CONTENT RULE. No name, date, role, term or count is typed into this file.
 * Every demo entry is selected from lib/content by PREDICATE (see the DEMO
 * block below), so when the roster changes this page follows it. The only
 * literal strings here are UI chrome: section labels, token names, and the
 * "SPARC" / "Aa" type specimens.
 *
 * Bundle note: importing the content modules into a client component ships
 * them to the browser. That is fine here and nowhere else — /preview is
 * noindexed, internal, and not on any user path.
 */

import * as React from "react";

import { Expand, ExpandTrigger } from "@/components/ui/expand";
import { FilterChip } from "@/components/ui/filter-chip";
import { Footer } from "@/components/ui/footer";
import { MicroLabel } from "@/components/ui/micro-label";
import Navbar from "@/components/ui/navbar";
import { PersonCard } from "@/components/ui/person-card";
import { Pill } from "@/components/ui/pill";
import { PosterText } from "@/components/ui/poster-text";
import { SurfaceCard } from "@/components/ui/surface-card";
import { events } from "@/lib/content/events";
import { members } from "@/lib/content/members";
import { projects } from "@/lib/content/projects";
import type { Member, Project, SparcEvent } from "@/lib/content/types";
import { cn } from "@/lib/utils";

/* ── themes ──────────────────────────────────────────────────────────── */

/* All three are FORCING classes in globals.css, so a `.light` container
   inside a `.dark` page paints light. That is what makes the side-by-side
   columns possible at all. */
export const THEMES = ["light", "dark", "dim"] as const;
export type ThemeName = (typeof THEMES)[number];

/* ── demo entries, selected by predicate ─────────────────────────────── */

/* A current member who has held a previous office — exercises the
   role_history line inside the expand. */
const DEMO_CURRENT: Member =
  members.find((m) => m.status === "current" && m.role_history.length > 0) ??
  members[0];

/* An alumni — exercises the desaturated photo, muted name and the "Alumni"
   word under the class line. */
const DEMO_ALUMNI: Member =
  members.find((m) => m.status === "alumni") ?? members[members.length - 1];

const DEMO_EVENT: SparcEvent = events[0];
const DEMO_PROJECT: Project = projects[0];

/* Badge and tag vocabularies, read off the data rather than listed here. A
   badge that nobody carries does not appear; none is invented to fill a gap. */
const BADGE_VALUES = Array.from(new Set(members.flatMap((m) => m.badges)));
const EVENT_KINDS = Array.from(new Set(events.map((e) => e.kind)));
const PROJECT_STATUSES = Array.from(new Set(projects.map((p) => p.status)));

/* Filter-chip specimens. The label IS the stored value ("current", "founding",
   "personal"), so nothing is renamed on the way to the screen, and the counts
   are real — `personal` is 0, which is exactly the case a filter row has to
   survive. */
const DEMO_CHIPS: Array<{ id: string; count: number }> = [
  { id: "current", count: members.filter((m) => m.status === "current").length },
  { id: "alumni", count: members.filter((m) => m.status === "alumni").length },
  {
    id: "founding",
    count: members.filter((m) => m.badges.includes("founding")).length,
  },
  { id: "team", count: projects.filter((p) => p.kind === "team").length },
  { id: "personal", count: projects.filter((p) => p.kind === "personal").length },
];

/* Dates are formatted from the real Date, never written out. Both the server
   render and the client render build the Date with the local-time constructor
   and format in the same zone, so the two agree. */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/* ── shared bits ─────────────────────────────────────────────────────── */

function ExhibitCaption({ children }: { children: React.ReactNode }) {
  return (
    <MicroLabel as="p" className="mt-3 mb-1.5 block first:mt-0">
      {children}
    </MicroLabel>
  );
}

/* ── nav ─────────────────────────────────────────────────────────────── */

/* The real <Navbar/>. Two things about mounting it in a column:
 *
 * STICKY NEUTRALISATION. Navbar's root is `sticky top-0 z-50`. A sticky
 * element positions against its nearest ancestor SCROLL CONTAINER, and an
 * element with a non-visible overflow is one — so wrapping the mount in
 * `overflow-hidden` makes this box the scrollport. The box never scrolls, so
 * the offset is permanently zero and the nav sits inert where it is drawn
 * instead of latching onto the page viewport and floating over the exhibits
 * below. Nothing about Navbar itself is changed or forked to achieve that.
 *
 * LANDMARKS. Navbar renders <header> and <nav aria-label="Main">. A <header>
 * inside <main> is not a banner landmark, so the three mounts do not fight the
 * real one in layout.tsx — but <nav> is a landmark wherever it sits, so this
 * page does carry four "Main" navigations. Accepted: /preview is a noindexed
 * internal instrument, and the alternative (aria-hidden over focusable
 * controls) is a worse defect than the duplication.
 *
 * Same shape of thing, recorded rather than fixed: Navbar's mobile panel id is
 * a module constant, so three mounts plus the layout's own put four
 * id="nav-menu-panel" in the document and every MENU button's aria-controls
 * resolves to the first. It only bites below lg, where the MENU button is not
 * display:none — and it is the same trade the SparcMark ids already make by
 * design (see the header of components/ui/sparc-mark.tsx). Nothing in this
 * page's own code looks anything up by id; the contrast measurement scans
 * [data-swatch] with querySelectorAll, so the duplicates cannot reach it.
 *
 * WIDTH. This one is mounted through ExhibitRow's `stacked` layout, full
 * width, because Tailwind breakpoints read the VIEWPORT and not the box: in a
 * 396px column at a 1440px viewport the nav still resolved its `lg:` desktop
 * link row and laid out 699px of content in a 332px box. See the note on
 * ExhibitRow in ./preview-client.
 *
 * Live, not a screenshot: the theme control inside each mount is the real
 * ThemeToggle and drives the PAGE theme, not its own panel — the panel is
 * pinned by its forcing class. That is the expected behaviour, not a bug. */
export function NavExhibit() {
  return (
    <div className="relative overflow-hidden rounded-card border border-line">
      <Navbar />
    </div>
  );
}

/* ── footer ──────────────────────────────────────────────────────────── */

/* The real <Footer/>. It is a client component that measures its own wordmark
 * (canvas ink metrics + ResizeObserver), so three columns fit three times,
 * independently — which is the point of the exhibit: the per-letter photo mask
 * blends multiply on light and screen on dark, so the same five frames have to
 * hold the accent on all three grounds, and here they can be compared at once.
 *
 * WIDTH — and this one is not cosmetic. Mounted full width via ExhibitRow's
 * `stacked` layout. In a narrow column the band's `xl:` single-row rules still
 * fired (breakpoints read the viewport, not the box), `flex-nowrap` crushed the
 * lockup column, and the wordmark slot measured 0px wide — so the fitted
 * wordmark, 334px of it, was clipped away to nothing by the slot's own
 * overflow-hidden. The exhibit rendered a footer with no wordmark in it, which
 * is precisely the thing it exists to show. Measured, not guessed.
 *
 * Each mount also emits its own copy of the footer's <style> block; the CSS is
 * identical and scoped to .sparc-footer, so the copies are inert duplicates.
 *
 * RESOLVED DEFECT, found by this exhibit and fixed in footer.tsx — it
 * declared
 *
 *     :where(.dark, .dim) .sparc-footer { --sparc-mask-blend: screen }
 *
 * with no `.light` counterpart. globals.css made `.light` a FORCING
 * class so a light container inside a dark page gets the light ramp, but that
 * only covers the variables globals declares — this one lives in footer.tsx,
 * so the light panel below inherits `screen` from the page whenever the page
 * itself is dark or dim. Measured: page=light gives multiply/screen/screen
 * correctly; page=dark and page=dim give screen/screen/screen.
 *
 * The live site was never affected (the theme sits on <html>; no real footer
 * is nested in a differently-themed box), but this page renders exactly that
 * nesting, which is how it surfaced. The fix — a `.light` rule mirroring the
 * dark one — landed in footer.tsx at integration; deliberately NOT patched
 * here first, because a local override in /preview would have hidden the very
 * class of bug this page exists to catch. All nine page-theme x panel-theme
 * combinations now resolve the correct blend.
 *
 * A <footer> inside <main> is not a contentinfo landmark, so these three do not
 * collide with the real one in layout.tsx. */
export function FooterExhibit() {
  return (
    <div className="overflow-hidden rounded-card border border-line">
      <Footer />
    </div>
  );
}

/* ── buttons ─────────────────────────────────────────────────────────── */

/* There is still deliberately NO Button primitive. These are PAGE-LEVEL
 * PATTERNS: two treatments that the pages converged on independently, each
 * declared as a local const at its call site. This exhibit is where they get
 * compared, and it is the evidence for promoting them to a primitive if a
 * third treatment ever appears.
 *
 * Every class string below is copied verbatim from the cited file. Every label
 * is a string the repo already ships. Specimens are <button type="button">
 * rather than links: the treatment is what is under review, and a specimen
 * that navigated away from /preview (or an <a> with no href, which is not
 * focusable) would both be worse. The wired versions are at the call sites. */

/* (a) The accent CTA. The treatment is constant — bg-accent + text-on-accent +
   rounded-control + hover:bg-accent-hover — and only the size changes per call
   site. hero's copy omits `duration-200 ease-out`, which is a no-op because
   globals.css sets exactly those as the transition defaults; it is reproduced
   as written rather than normalised. hero's leading `mt-6` is dropped: that is
   layout at the call site, not part of the treatment. */
const ACCENT_CTA = [
  {
    id: "sm · hero",
    src: "components/ui/hero.tsx:573",
    label: "Join Us",
    cls: "inline-flex items-center gap-2 rounded-control bg-accent px-4 py-2.5 text-sm text-on-accent transition-colors hover:bg-accent-hover",
  },
  {
    id: "md · about",
    src: "app/about/page.tsx:178",
    label: "Join Us",
    cls: "rounded-control bg-accent px-6 py-3 text-on-accent transition-colors duration-200 ease-out hover:bg-accent-hover",
  },
  {
    id: "lg · join",
    src: "app/join/page.tsx:114",
    label: "Join Discord",
    cls: "inline-flex items-center gap-3 rounded-control bg-accent px-6 py-4 text-lg text-on-accent transition-colors duration-200 ease-out hover:bg-accent-hover",
  },
] as const;

/* (b) The quiet link chip — the site's "this is a link, not a call to action"
   control. It is NOT one byte-identical string across all five files: it is two
   variants of one treatment. The border/ground/size/hover half is identical in
   both; they differ only in display box and padding, and each file's comment
   cites app/not-found.tsx:43 as the origin. Worth a look side by side — if the
   two are meant to be one control, this is the divergence to close. */
const QUIET_LINK = [
  {
    id: "inline-block · px-3 py-2",
    src: "app/not-found.tsx:43 · app/events/events-record.tsx:60 · app/projects/project-index.tsx:94",
    label: "View Project",
    cls: "inline-block rounded-control border border-line bg-surface-1 px-3 py-2 text-sm text-ink transition-colors duration-200 ease-out hover:border-line-strong",
  },
  {
    id: "inline-flex · px-4 py-2.5",
    src: "app/join/page.tsx:71 · app/home-sections.tsx:38",
    label: "All events",
    cls: "inline-flex items-center gap-2 rounded-control border border-line bg-surface-1 px-4 py-2.5 text-sm text-ink transition-colors duration-200 ease-out hover:border-line-strong",
  },
] as const;

export function ButtonExhibit() {
  return (
    <div>
      <ExhibitCaption>accent CTA · no primitive, three sizes</ExhibitCaption>
      <div className="flex flex-col items-start gap-2">
        {ACCENT_CTA.map((cta) => (
          <div key={cta.id} className="flex flex-col items-start gap-1">
            <button type="button" className={cta.cls}>
              {cta.label}
            </button>
            <MicroLabel as="p" className="block">
              {cta.id}
            </MicroLabel>
          </div>
        ))}
      </div>

      <ExhibitCaption>quiet link chip · two variants of one treatment</ExhibitCaption>
      <div className="flex flex-col items-start gap-2">
        {QUIET_LINK.map((link) => (
          <div key={link.id} className="flex flex-col items-start gap-1">
            <button type="button" className={link.cls}>
              {link.label}
            </button>
            <MicroLabel as="p" className="block">
              {link.id}
            </MicroLabel>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── people card ─────────────────────────────────────────────────────── */

/* The PRODUCTION card — components/ui/person-card.tsx. The illustrative
 * composition that stood here through the first pass is gone, as its own
 * comment said it would be; there is one PersonCard and this exhibit shows it.
 *
 * PersonCard renders `as="li"` and owns its own `open` state (no open prop),
 * so the four states are reached by USING it rather than by forcing them:
 * both specimens mount collapsed and the + expands them in place. Forking the
 * component to pin one open would mean maintaining a second card, which is the
 * thing this section exists to prevent.
 *
 * Selection is still by predicate — a current member with role history (so the
 * "Previously" line has something to render) and an alumni (desaturated photo,
 * muted name, "Alumni" under the class line). */
export function PeopleCardExhibit() {
  return (
    <div>
      <ExhibitCaption>
        current + alumni · both start collapsed, press + to expand
      </ExhibitCaption>
      <ul className="flex flex-col gap-3">
        <PersonCard member={DEMO_CURRENT} />
        <PersonCard member={DEMO_ALUMNI} />
      </ul>
    </div>
  );
}

/* ── pills ───────────────────────────────────────────────────────────── */

export function PillExhibit() {
  return (
    <div>
      <ExhibitCaption>filled</ExhibitCaption>
      <div className="flex flex-wrap gap-1.5">
        {BADGE_VALUES.map((badge) => (
          <Pill key={badge} variant="filled" className="uppercase">
            {badge}
          </Pill>
        ))}
        {EVENT_KINDS.map((kind) => (
          <Pill key={kind} variant="filled" className="uppercase">
            {kind}
          </Pill>
        ))}
      </div>

      <ExhibitCaption>outline</ExhibitCaption>
      <div className="flex flex-wrap gap-1.5">
        {PROJECT_STATUSES.map((status) => (
          <Pill key={status} className="uppercase">
            {status}
          </Pill>
        ))}
        {EVENT_KINDS.map((kind) => (
          <Pill key={kind} className="uppercase">
            {kind}
          </Pill>
        ))}
      </div>

      {/* The wrap rules are the thing to check here: a pill in a narrow
          column must wrap, never clip. */}
      <ExhibitCaption>long label · wrap behaviour</ExhibitCaption>
      <div className="max-w-52">
        <Pill variant="filled" className="uppercase">
          {DEMO_PROJECT.title}
        </Pill>
      </div>
    </div>
  );
}

/* ── filter chips ────────────────────────────────────────────────────── */

export function FilterChipExhibit() {
  const [pressed, setPressed] = React.useState<string[]>([]);

  return (
    <div>
      <ExhibitCaption>interactive · aria-pressed</ExhibitCaption>
      <div className="flex flex-wrap gap-1.5">
        {DEMO_CHIPS.map((chip) => (
          <FilterChip
            key={chip.id}
            pressed={pressed.includes(chip.id)}
            count={chip.count}
            className="uppercase"
            onPressedChange={(next) =>
              setPressed((current) =>
                next
                  ? [...current, chip.id]
                  : current.filter((id) => id !== chip.id),
              )
            }
          >
            {chip.id}
          </FilterChip>
        ))}
      </div>
    </div>
  );
}

/* ── event row ───────────────────────────────────────────────────────── */

function EventRow({
  event,
  defaultOpen,
}: {
  event: SparcEvent;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const bodyId = React.useId();

  return (
    <SurfaceCard as="article" open={open}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <MicroLabel as="p" className="block">
            {event.ref} · {DATE_FORMAT.format(event.starts_at)}
            {event.location ? ` · ${event.location}` : ""}
          </MicroLabel>
          <h3 className="mt-1.5 text-lg font-medium [overflow-wrap:anywhere]">
            {event.title}
          </h3>
        </div>
        <ExpandTrigger
          open={open}
          controls={bodyId}
          onOpenChange={setOpen}
          aria-label={`More about ${event.title}`}
        />
      </div>
      <Expand open={open} id={bodyId}>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            <Pill className="uppercase">{event.kind}</Pill>
          </div>
          {event.description ? (
            <p className="text-sm text-ink-muted">{event.description}</p>
          ) : null}
        </div>
      </Expand>
    </SurfaceCard>
  );
}

export function EventRowExhibit() {
  return (
    <div>
      <ExhibitCaption>collapsed</ExhibitCaption>
      <EventRow event={DEMO_EVENT} defaultOpen={false} />
      <ExhibitCaption>expanded</ExhibitCaption>
      <EventRow event={DEMO_EVENT} defaultOpen />
    </div>
  );
}

/* ── project row ─────────────────────────────────────────────────────── */

function ProjectRow({
  project,
  defaultOpen,
}: {
  project: Project;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const bodyId = React.useId();

  return (
    <SurfaceCard as="article" open={open}>
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <MicroLabel as="p" className="block">
            {project.ref} · {project.term}
          </MicroLabel>
          <h3 className="mt-1.5 text-lg font-medium [overflow-wrap:anywhere]">
            {project.title}
          </h3>
        </div>
        <ExpandTrigger
          open={open}
          controls={bodyId}
          onOpenChange={setOpen}
          aria-label={`More about ${project.title}`}
        />
      </div>
      <Expand open={open} id={bodyId}>
        <div className="flex flex-col gap-2.5">
          <div className="flex flex-wrap gap-1.5">
            <Pill className="uppercase">{project.kind}</Pill>
            <Pill className="uppercase">{project.status}</Pill>
          </div>
          {project.summary ? (
            <p className="text-sm text-ink-muted">{project.summary}</p>
          ) : null}
          {project.highlights.length > 0 ? (
            <ul className="flex list-disc flex-col gap-1 pl-4 text-sm text-ink-muted">
              {project.highlights.map((highlight) => (
                <li key={highlight}>{highlight}</li>
              ))}
            </ul>
          ) : null}
        </div>
      </Expand>
    </SurfaceCard>
  );
}

export function ProjectRowExhibit() {
  return (
    <div>
      <ExhibitCaption>collapsed</ExhibitCaption>
      <ProjectRow project={DEMO_PROJECT} defaultOpen={false} />
      <ExhibitCaption>expanded</ExhibitCaption>
      <ProjectRow project={DEMO_PROJECT} defaultOpen />
    </div>
  );
}

/* ── micro-labels ────────────────────────────────────────────────────── */

export function MicroLabelExhibit() {
  return (
    <div className="flex flex-col gap-2.5">
      {/* Default colour is ink-muted, NOT ink-faint — a micro-label carries
          content at 13px and so owes 4.5:1. See the header of
          components/ui/micro-label.tsx before "fixing" that. */}
      <MicroLabel as="p" className="block">
        Class of {DEMO_CURRENT.class_year}
      </MicroLabel>
      <MicroLabel as="p" className="block">
        {DATE_FORMAT.format(DEMO_EVENT.starts_at)}
        {DEMO_EVENT.location ? ` · ${DEMO_EVENT.location}` : ""}
      </MicroLabel>
      <MicroLabel as="p" className="block">
        {DEMO_PROJECT.ref} · {DEMO_PROJECT.term}
      </MicroLabel>
      {/* Inline against body copy — the width-axis snap back to normal is the
          thing to look at here. */}
      <p className="text-sm text-ink-muted">
        <MicroLabel>{DEMO_PROJECT.status}</MicroLabel> {DEMO_PROJECT.summary}
      </p>
    </div>
  );
}

/* ── type scale ──────────────────────────────────────────────────────── */

/* Class names are written out in full: Tailwind finds utilities by scanning
   source text, so a constructed `text-${step}` would never be generated. */
const TYPE_STEPS = [
  { cls: "text-xs", name: "text-xs", px: "13px" },
  { cls: "text-sm", name: "text-sm", px: "14px" },
  { cls: "text-base", name: "text-base", px: "16px" },
  { cls: "text-lg", name: "text-lg", px: "19px" },
  { cls: "text-xl", name: "text-xl", px: "23px" },
  { cls: "text-2xl", name: "text-2xl", px: "28px" },
  { cls: "text-3xl", name: "text-3xl", px: "33px" },
  { cls: "text-4xl", name: "text-4xl", px: "40px" },
  { cls: "text-label uppercase", name: "text-label", px: "13px" },
] as const;

const POSTER_STEPS = [
  { size: "sm", name: "text-poster-sm", px: "48px", specimen: "SPARC" },
  { size: "md", name: "text-poster-md", px: "72px", specimen: "SPARC" },
  { size: "lg", name: "text-poster-lg", px: "104px", specimen: "Aa" },
] as const;

/* ULTRA EXEMPTION. Site-wide, the poster face appears exactly three times —
   the hero, the footer wordmark and the /about statement. /preview is a
   noindexed internal specimen catalogue, not a page anyone browses, so the
   three poster steps below are shown here for review and do NOT count against
   that budget. Nothing else on this page uses Ultra; the headings are Martian.
   "SPARC" and "Aa" are specimen chrome, not content. */
export function TypeScaleExhibit() {
  return (
    <div>
      <ExhibitCaption>mono ramp · Martian</ExhibitCaption>
      <div className="flex flex-col">
        {TYPE_STEPS.map((step) => (
          <div
            key={step.name}
            className="flex items-baseline justify-between gap-3 border-b border-line py-2"
          >
            <span className={cn("min-w-0 truncate", step.cls)}>SPARC</span>
            <MicroLabel className="flex-none">
              {step.name} · {step.px}
            </MicroLabel>
          </div>
        ))}
      </div>

      <ExhibitCaption>poster · Ultra</ExhibitCaption>
      <div className="flex flex-col">
        {POSTER_STEPS.map((step) => (
          /* Label above rather than beside: measured in the browser, "SPARC"
             at 72px is 286px of ink and the column's content box is 398px, so
             a label sharing the line clips the specimen. overflow-hidden is
             the backstop at narrower widths. */
          <div
            key={step.name}
            className="overflow-hidden border-b border-line py-3"
          >
            <MicroLabel as="p" className="mb-2 block">
              {step.name} · {step.px}
            </MicroLabel>
            <PosterText size={step.size}>{step.specimen}</PosterText>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── colour ramp + measured contrast ─────────────────────────────────── */

/* The ramp, by semantic name. Nothing here reaches past the semantic layer to
   a raw --n-* value; that is the whole point of the layer. */
const RAMP = [
  { cls: "bg-surface", name: "surface" },
  { cls: "bg-surface-1", name: "surface-1" },
  { cls: "bg-surface-2", name: "surface-2" },
  { cls: "bg-line", name: "line" },
  { cls: "bg-line-strong", name: "line-strong" },
  { cls: "bg-ink-faint", name: "ink-faint" },
  { cls: "bg-ink-muted", name: "ink-muted" },
  { cls: "bg-ink", name: "ink" },
  { cls: "bg-accent-quiet", name: "accent-quiet" },
  { cls: "bg-accent", name: "accent" },
  { cls: "bg-chip", name: "chip" },
] as const;

/* Each pair renders as ONE element carrying both roles, so the measurement
   reads `color` and `background-color` off the same node — no palette table
   is written down anywhere in this file, and a token that only works on one
   ground shows up as a failing number in exactly one column.
   `min`: 4.5 for text, 3.0 for the non-text hairline. */
export const CONTRAST_PAIRS = [
  { id: "ink", cls: "bg-surface text-ink", name: "ink / surface", min: 4.5 },
  {
    id: "ink-muted",
    cls: "bg-surface text-ink-muted",
    name: "ink-muted / surface",
    min: 4.5,
  },
  {
    id: "accent-text",
    cls: "bg-surface text-accent-text",
    name: "accent-text / surface",
    min: 4.5,
  },
  {
    id: "on-accent",
    cls: "bg-accent text-on-accent",
    name: "on-accent / accent",
    min: 4.5,
  },
  {
    id: "line-strong",
    cls: "bg-surface text-line-strong",
    name: "line-strong / surface",
    min: 3,
  },
] as const;

/** The key written to data-swatch and read back out of the ratios map. */
export function swatchKey(theme: ThemeName, pairId: string) {
  return `${theme}:${pairId}`;
}

export function ColourExhibit({
  theme,
  ratios,
}: {
  theme: ThemeName;
  /** Empty until the measuring effect has run; missing entries render "—". */
  ratios: Record<string, number>;
}) {
  return (
    <div>
      <ExhibitCaption>ramp</ExhibitCaption>
      <div className="flex flex-col gap-1">
        {RAMP.map((step) => (
          <div key={step.name} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn(
                "h-6 w-12 flex-none rounded-control border border-line",
                step.cls,
              )}
            />
            <MicroLabel className="min-w-0 truncate">{step.name}</MicroLabel>
          </div>
        ))}
      </div>

      <ExhibitCaption>measured contrast</ExhibitCaption>
      <div className="flex flex-col gap-1">
        {CONTRAST_PAIRS.map((pair) => {
          const ratio = ratios[swatchKey(theme, pair.id)];
          const measured = typeof ratio === "number";
          const passes = measured && ratio >= pair.min;
          return (
            <div key={pair.id} className="flex items-center gap-2">
              <span
                data-swatch={swatchKey(theme, pair.id)}
                aria-hidden="true"
                className={cn(
                  "grid h-6 w-12 flex-none place-items-center rounded-control border border-line text-sm",
                  pair.cls,
                )}
              >
                Aa
              </span>
              <MicroLabel className="min-w-0 flex-1 truncate">
                {pair.name}
              </MicroLabel>
              <span className="flex-none text-sm tabular-nums">
                {measured ? ratio.toFixed(1) : "—"}
              </span>
              {/* The tint goes on a CHILD, not through MicroLabel's className.
                  cn() is a plain join and at equal specificity the winner is
                  stylesheet emission order — .text-accent-text emits before
                  .text-ink-muted, so an override passed in would silently lose.
                  Declared-on-the-child beats inherited regardless of order.
                  See the header of components/ui/micro-label.tsx. */}
              <MicroLabel className="flex-none">
                {measured ? (
                  <span className={passes ? undefined : "text-accent-text"}>
                    {passes ? "pass" : "fail"}
                  </span>
                ) : null}
              </MicroLabel>
            </div>
          );
        })}
      </div>
    </div>
  );
}
