"use client";

/* PersonCard — one card per person on /about.
 *
 * Layout follows design/people-badges.html: square photo, class line with the
 * `+` level to it, reserved name and role blocks, everything else behind the
 * expand. It is assembled from the S2 primitives only — SurfaceCard, Expand,
 * ExpandTrigger, Pill, MicroLabel. Nothing here re-implements an expand;
 * components/ui/expand.tsx is the only one in the codebase.
 *
 * CONTENT RULE. This file contains no name, role, bio, year or badge value.
 * Everything visible comes off the `member` prop (lib/content/members.ts).
 * The only literal strings are the two badge LABELS below and the words
 * "Alumni", "Class of", "Previously", "Participated", "Visit LinkedIn" and
 * "Visit Website" — see the provenance note on each.
 *
 * BADGES. `badges` is a free-form string array in the schema, so the label and
 * the variant are a lookup, not a branch: 'founding' → filled "Founding
 * Member", 'collegiatex' → outline "CollegiateX" (SPEC "/about → People":
 * badges are *only* those two). Today the data carries 'founding' and nothing
 * else — members.ts:39 records that the CollegiateX participants are unknown —
 * so the CollegiateX pill renders the moment the data says so and never
 * before. Same for `participated`: an empty array renders nothing at all. A
 * hardcoded pill or a placeholder year would be invented content.
 *
 * Current / Alumni / E-Board are deliberately NOT pills. They are filters (see
 * the directory in app/about/sections.tsx) — everyone has one of the first two,
 * and the role line already says the third.
 *
 * RESERVED HEIGHTS. --name-lines / --role-lines exist in no token layer and
 * are declared on the card root here, because they are a property of this
 * card's own type sizes. Tuning is in the comment on RESERVED_BLOCKS.
 *
 * MOTION. The expand (260ms) is the S2 component's own CSS transition, and the
 * alumni photo's desaturation is a CSS filter transition; the universal
 * prefers-reduced-motion block in globals.css flattens both. No JS-driven
 * motion lives in this file. Hover is a Tailwind `hover:`/`group-hover:`
 * variant, which v4 already wraps in a pointer-capability media query.
 */

import * as React from "react";
import Image from "next/image";

import { Expand, ExpandTrigger } from "@/components/ui/expand";
import { MicroLabel } from "@/components/ui/micro-label";
import { Pill } from "@/components/ui/pill";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { Member } from "@/lib/content/types";
import { cn } from "@/lib/utils";

/* The two badges SPEC allows, and their rendering. Keyed by the value stored
   in `Member.badges` (types.ts:41 — "Known values: 'founding', 'collegiatex'").
   An unknown value renders nothing rather than printing its own slug. */
const BADGE_LABELS: Record<string, { label: string; variant: "filled" | "outline" }> = {
  founding: { label: "Founding Member", variant: "filled" },
  /* Shortened from "CollegiateX Internship" for the same reason the reference
     shortened it: the long form overflows a 238px card. The filter chip is
     where the full name would live. */
  collegiatex: { label: "CollegiateX", variant: "outline" },
};

/* Collapsed cards must be the same height whatever the text does, so the name
   and role blocks reserve theirs. Both values are in `em`, i.e. relative to
   the block's own font-size, so they stay two lines if the ramp moves.
 *
 * Tuned against the two longest strings at the narrowest column the grid ever
 * produces — 4 columns inside max-w-page (1152px) minus px-gutter (2×24) and
 * three 16px gaps = 264px, minus the card's own 2×14px padding = 236px of text.
 * Martian Mono's advance is 0.7em.
 *
 *   name  19px (text-lg), leading 1.25 → 23.75px/line, 2 lines = 2.5em.
 *         "Margulan Kudaibergen" is 20ch ≈ 255px at 12.73px/ch (0.7em advance
 *         less 0.03em tracking) → wraps to "Margulan" (102px) + "Kudaibergen"
 *         (140px), both inside 236px. Two lines. Three would need a single
 *         word past 18ch and the longest is "Kudaibergen" at 11ch.
 *         The nickname renders as a second line inside the same block, so
 *         "Montasir Moyen" + "Monty" is 23.75 + 22.4 = 46.2px, also inside
 *         the reserved 47.5px.
 *   role  14px (text-sm), leading 1.45 → 20.3px/line, 2 lines = 2.9em.
 *         "Vice-President & Project Lead" plus the term is 34ch ≈ 324px at
 *         9.52px/ch → "Vice-President & Project" (228px) + "Lead 2026".
 *         Two lines.
 *
 * If a longer name or role ever lands in the data, re-measure and bump. */
const RESERVED_BLOCKS = {
  "--name-lines": "2.5em",
  "--role-lines": "2.9em",
} as React.CSSProperties;

export interface PersonCardProps {
  member: Member;
}

export function PersonCard({ member }: PersonCardProps) {
  const [open, setOpen] = React.useState(false);
  const bodyId = React.useId();
  /* Read from the data, never derived from class_year — members.ts:33 is
     explicit that a future member classed 2026 would not be alumni. */
  const isAlumni = member.status === "alumni";

  const badges = member.badges
    .map((badge) => ({ badge, spec: BADGE_LABELS[badge] }))
    .filter((entry) => entry.spec !== undefined);

  return (
    <SurfaceCard
      as="li"
      open={open}
      padded={false}
      style={RESERVED_BLOCKS}
      className="group flex flex-col overflow-hidden"
    >
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        {member.photo ? (
          <Image
            src={member.photo}
            /* Decorative: the name is the next thing in the reading order. */
            alt=""
            fill
            sizes="(min-width: 1280px) 264px, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 92vw"
            className={cn(
              "object-cover transition-[filter] duration-300 ease-out",
              /* Alumni card state, per SPEC: desaturated photo. Hover restores
                 it — `group-hover:` is wrapped in a hover-capability query by
                 Tailwind v4, so it never fires on touch. */
              isAlumni &&
                "saturate-[.25] contrast-[.95] group-hover:saturate-100 group-hover:contrast-100",
            )}
          />
        ) : null}
      </div>

      <div className="flex flex-col px-3.5 pt-3 pb-4">
        {/* Top row: class line left, the + top right level with it. min-h-9
            (36px) is the taller of the two cases — the 30px trigger, and an
            alumni class line of two 15.6px label lines plus its 4px offset —
            so a current and an alumni card start their name block at the same
            y. */}
        <div className="flex min-h-9 items-start justify-between gap-2.5">
          <MicroLabel as="p" className="mt-1 block min-w-0">
            Class of {member.class_year}
            {/* SPEC: the word sits on its own line under the class year, with
                no separator. */}
            {isAlumni ? <span className="block">Alumni</span> : null}
          </MicroLabel>
          <ExpandTrigger
            open={open}
            controls={bodyId}
            onOpenChange={setOpen}
            aria-label={`More about ${member.name}`}
          />
        </div>

        <h3
          style={{ minHeight: "var(--name-lines)" }}
          className={cn(
            "mt-1.5 text-lg leading-[1.25] font-medium [overflow-wrap:anywhere]",
            isAlumni && "text-ink-muted",
          )}
        >
          {member.name}
          {member.nickname ? (
            <span className="block text-sm font-normal text-ink-muted">
              {member.nickname}
            </span>
          ) : null}
        </h3>

        <p
          style={{ minHeight: "var(--role-lines)" }}
          className="mt-1 text-sm leading-[1.45] [overflow-wrap:anywhere]"
        >
          {member.role}
          {member.role_term ? (
            <span className="whitespace-nowrap text-ink-muted">
              {" "}
              {member.role_term}
            </span>
          ) : null}
        </p>

        <Expand open={open} id={bodyId}>
          <div className="flex flex-col gap-2.5">
            {/* "Previously" is SPEC's own word for this line ("the second role
                becomes a 'Previously' line inside the one card"). The roles
                themselves come from the array. */}
            {member.role_history.length > 0 ? (
              <p className="text-xs text-ink-muted">
                Previously {member.role_history.join(" · ")}
              </p>
            ) : null}

            {member.bio ? (
              <p className="text-sm text-ink-muted">{member.bio}</p>
            ) : null}

            {badges.length > 0 ? (
              <div className="flex min-w-0 flex-wrap gap-1.5">
                {badges.map(({ badge, spec }) => (
                  <Pill key={badge} variant={spec.variant}>
                    {spec.label}
                  </Pill>
                ))}
              </div>
            ) : null}

            {/* Years come straight off `participated`. It is empty for every
                member today (members.ts:39), and an empty array renders this
                line not at all — no placeholder years are manufactured. */}
            {member.participated.length > 0 ? (
              <MicroLabel as="p" className="block">
                Participated {member.participated.join(" · ")}
              </MicroLabel>
            ) : null}

            {member.linkedin || member.website ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {/* Labels are the repo's own, from app/team/page.tsx:216 and
                    :223 as it stood before this rewrite. */}
                {member.linkedin ? (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink-muted underline underline-offset-4 transition-colors duration-200 ease-out hover:text-accent-text"
                  >
                    Visit LinkedIn
                  </a>
                ) : null}
                {member.website ? (
                  <a
                    href={member.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-ink-muted underline underline-offset-4 transition-colors duration-200 ease-out hover:text-accent-text"
                  >
                    Visit Website
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        </Expand>
      </div>
    </SurfaceCard>
  );
}
