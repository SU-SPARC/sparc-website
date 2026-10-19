/* AtAGlance — the first card on a listing's detail: the state word large,
 * then a two-column fact grid: Deadline / Registration / Signup, Event, Where, Team size, Prizes, Pay or Cost,
 * Listed, Verified. Facts that are null are left out. Every date carries
 * its relative text ("Oct 25, 2026 · closes in 7 days"). A hackathon or
 * networking event outside Greater Boston prefixes "Where" with "Outside
 * Boston · " in the danger tone. First in the rail
 * of the members' listing page and of the admin edit page. Server-safe. */

import * as React from "react";

import { RailCard } from "@/components/admin/edit-layout";
import { TimeAgo } from "@/components/forms/time-ago";
import { formatDateOnly } from "@/lib/data/dates";
import {
  AREA_LABELS,
  dateWithRelative,
  deadlineTiming,
  eventTiming,
  FORMAT_LABELS,
  formatDateRange,
  isOutsideBoston,
  listedAgo,
  signupWindowFact,
  sourceLabel,
  verifiedState,
} from "@/lib/data/locator";
import type { DateOnly, Opportunity, OpportunityKind } from "@/lib/data/types";

import { ListingState } from "./listing-state";

type Fact = { label: string; value: React.ReactNode; warning?: boolean };

const DEADLINE_LABEL: Record<OpportunityKind, string> = {
  internship: "Deadline",
  conference: "Registration",
  networking: "Registration",
  hackathon: "Signup",
};

/** Internships: the deadline (or "Rolling" from the dates note). Event kinds: the signup window. */
function deadlineFact(o: Opportunity, today: DateOnly): Fact | null {
  const label = DEADLINE_LABEL[o.kind];
  if (o.kind !== "internship") {
    const window = signupWindowFact(o, today);
    return window ? { label, value: window } : null;
  }
  if (o.deadline_on)
    return { label, value: `${formatDateOnly(o.deadline_on)} · ${deadlineTiming(o.deadline_on, today)}` };
  return o.dates_note ? { label, value: o.dates_note } : null;
}

/** Event kinds: the dates with "starts in 6 days", or the dates note when undated. */
function eventFact(o: Opportunity, today: DateOnly): Fact | null {
  if (o.kind === "internship") return null;
  const range = formatDateRange(o.starts_on, o.ends_on);
  if (range) return { label: "Event", value: `${range} · ${eventTiming(o, today) ?? "today"}` };
  return o.dates_note ? { label: "Event", value: o.dates_note } : null;
}

/** "Cambridge, MA · In person"; the format is dropped when the place already says it
 *  ("Online (virtual only)"). */
function placeWithFormat(place: string, format: string): string {
  return place.toLowerCase().includes(format.toLowerCase()) ? place : `${place} · ${format}`;
}

/** The place and format. Outside Boston: "Outside Boston · Austin, TX · In person",
 *  the marker in the danger tone; with no location the area label is the place, so only
 *  the format follows the marker. */
function whereFact(o: Opportunity): Fact {
  const format = FORMAT_LABELS[o.format];
  if (!isOutsideBoston(o)) return { label: "Where", value: placeWithFormat(o.location ?? AREA_LABELS[o.area], format) };
  const rest = o.location ? placeWithFormat(o.location, format) : format;
  return {
    label: "Where",
    value: (
      <>
        <span className="text-danger">{AREA_LABELS.outside_boston}</span> · {rest}
      </>
    ),
  };
}

function textFact(label: string, value: string | null | undefined): Fact | null {
  return value ? { label, value } : null;
}

function listedFact(o: Opportunity): Fact {
  return {
    label: "Listed",
    value: (
      <>
        <TimeAgo date={listedAgo(o)} /> via {sourceLabel(o)}
      </>
    ),
  };
}

/** The verified date with its relative text, or the warning ("Not verified since Sep 10"). */
function verifiedFact(o: Opportunity, today: DateOnly): Fact | null {
  const state = verifiedState(o, today);
  if (!state) return null;
  if (state.warning || !o.verified_on) return { label: "Verified", value: state.text, warning: true };
  return { label: "Verified", value: dateWithRelative(o.verified_on, today) };
}

function glanceFacts(o: Opportunity, today: DateOnly): Fact[] {
  const facts = [
    deadlineFact(o, today),
    eventFact(o, today),
    whereFact(o),
    textFact("Team size", o.team_size),
    textFact("Prizes", o.prizes),
    textFact(o.kind === "internship" ? "Pay" : "Cost", o.pay),
    listedFact(o),
    verifiedFact(o, today),
  ];
  return facts.filter((fact): fact is Fact => fact !== null);
}

export function AtAGlance({ opportunity, today }: { opportunity: Opportunity; today: DateOnly }) {
  return (
    <RailCard title="At a glance">
      <ListingState opportunity={opportunity} today={today} />
      <dl className="grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-2">
        {glanceFacts(opportunity, today).map((fact) => (
          <React.Fragment key={fact.label}>
            <dt className="text-xs text-ink-muted">{fact.label}</dt>
            <dd
              className={
                fact.warning
                  ? "text-sm text-warning [overflow-wrap:anywhere]"
                  : "whitespace-pre-line text-sm text-ink [overflow-wrap:anywhere]"
              }
            >
              {fact.value}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </RailCard>
  );
}
