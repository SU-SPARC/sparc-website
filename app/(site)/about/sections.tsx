"use client";

/* /about — the two sections that need the browser.
 *
 * app/about/page.tsx is a server component (it owns the metadata export and
 * every string on the page); these are the client islands it mounts. They live
 * next to the page rather than in components/ui/ because neither is a
 * primitive — PeopleDirectory is this page's filter state, and PhotoReveal is
 * this page's one signature motion.
 *
 * CONTENT RULE. The only literal strings here are the three filter labels,
 * which SPEC names itself ("Current, Alumni and E-Board are filters, not
 * pills"). No name, role, year or count is typed — members arrive as a prop
 * from the server page, which reads lib/content/members.ts, and every count is
 * computed from that array.
 */

import * as React from "react";

import { FilterChip } from "@/components/ui/filter-chip";
import { PersonCard } from "@/components/ui/person-card";
import type { Member } from "@/lib/content/types";

/* ── the group photo reveal ─────────────────────────────────────────────
 *
 * SPEC "Motion, site-wide": About's one motion is a clip-path reveal on the
 * group photo, on scroll, fired once. Scroll reveals use `clip-path: inset()`
 * with IntersectionObserver at `{ once: true }` — here that is one
 * `disconnect()` inside the callback, so the observer stops watching the
 * moment it fires and the reveal cannot replay.
 *
 * REDUCED MOTION, two ways, both in this commit:
 *  1. The effect reads prefers-reduced-motion and, when it is set, never arms
 *     the clip at all. The photo is simply there — which is the right reduced
 *     behaviour for an entrance, rather than a 0.01ms wipe.
 *  2. The transition is a plain CSS transition, so the universal
 *     prefers-reduced-motion block in globals.css flattens its duration with
 *     !important — important author declarations beat inline styles, so the
 *     inline transition below is covered even if (1) is somehow bypassed.
 *
 * WHY THE UNCLIPPED STATE IS THE INITIAL ONE. The server renders `open`, so
 * the HTML that ships — and the page a reader with JavaScript off sees — has
 * the photo fully visible. The clip is applied on mount in a layout effect,
 * which React flushes before the browser paints, so the first painted frame is
 * already the clipped one and there is no flash of the photo appearing and
 * then hiding. useLayoutEffect would warn during SSR, hence the alias.
 */

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

type RevealState = "open" | "armed" | "revealed";

export interface PhotoRevealProps {
  className?: string;
  children: React.ReactNode;
}

export function PhotoReveal({ className, children }: PhotoRevealProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [state, setState] = React.useState<RevealState>("open");

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    /* No observer (very old browser) — leave the photo visible. */
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setState("armed");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          setState("revealed");
          /* { once: true } */
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        clipPath:
          state === "armed" ? "inset(18% 0% 18% 0%)" : "inset(0% 0% 0% 0%)",
        transition: "clip-path 600ms var(--ease-out)",
      }}
    >
      {children}
    </div>
  );
}

/* ── people ─────────────────────────────────────────────────────────────
 *
 * Filters, not pills. Three of them, and each one's count is derived:
 *
 *   Current / Alumni — `status`, which members.ts:33 is explicit is sourced
 *     data and must be read, never inferred from a class year.
 *   E-Board — sort_order < 100. members.ts:29 defines the order as "the six
 *     e-board members first, in team2026's own order (10,20,30,40,50,60), then
 *     everyone else in the `team` array's own order (100,110,…160)", so the
 *     e-board is exactly the block below 100. Deriving it from `role` would
 *     mean deciding which role strings count as offices, and deriving it from
 *     role_term === '2026' would sweep in anyone who happens to hold that
 *     term later.
 *
 * A filter whose count is zero is not rendered.
 *
 * SELECTION MODEL: single-select, and pressing the pressed chip clears it.
 * Multi-select would have to answer what Current + Alumni means — the union is
 * everyone (the filter row does nothing) and the intersection is nobody (the
 * grid empties). One at a time has neither failure mode, and the counts on the
 * chips already tell you the size of every set without pressing anything.
 */

type FilterId = "current" | "alumni" | "eboard";

const FILTERS: { id: FilterId; label: string; match: (m: Member) => boolean }[] = [
  { id: "current", label: "Current", match: (m) => m.status === "current" },
  { id: "alumni", label: "Alumni", match: (m) => m.status === "alumni" },
  { id: "eboard", label: "E-Board", match: (m) => m.sort_order < 100 },
];

export interface PeopleDirectoryProps {
  members: Member[];
}

export function PeopleDirectory({ members }: PeopleDirectoryProps) {
  const [active, setActive] = React.useState<FilterId | null>(null);

  const chips = React.useMemo(
    () =>
      FILTERS.map((filter) => ({
        ...filter,
        count: members.filter(filter.match).length,
      })).filter((filter) => filter.count > 0),
    [members],
  );

  const shown = React.useMemo(() => {
    const filter = FILTERS.find((entry) => entry.id === active);
    return filter ? members.filter(filter.match) : members;
  }, [members, active]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <FilterChip
            key={chip.id}
            pressed={active === chip.id}
            count={chip.count}
            onPressedChange={(pressed) => setActive(pressed ? chip.id : null)}
          >
            {chip.label}
          </FilterChip>
        ))}
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((member) => (
          <PersonCard key={member.slug} member={member} />
        ))}
      </ul>
    </div>
  );
}
