/* OpportunityDetail — the read-only listing members open from the list at
 * /dashboard/locator/<kind>/<id> (docs/LOCATOR.md, "Members view"). The
 * facts an editor types into OpportunityForm, laid out as text: Overview,
 * Who can apply, When and where, then a source line ("Source: Greenhouse",
 * the posting link, "Closed <date>" once a sync stops seeing it) and a
 * freshness line. Every date carries its relative text ("Nov 15, 2026 ·
 * closes in 28 days"; DESIGN-BRIEF §15). Never Unreviewed, external ids or
 * sync controls. Hackathons show their signup window in place of the
 * deadline and a "Hackathon details" section (team size, prizes, what's
 * provided; nulls omitted). The At a glance, eligibility and interest cards
 * sit in the rail (the page passes them to EditColumns). Server-safe.
 *
 * OutsideBostonNote is the header line under the title for a hackathon or
 * networking event outside Greater Boston (§18); the members' listing page
 * renders it in its header. */

import { ArrowUpRight } from "lucide-react";
import * as React from "react";

import { FormSection } from "@/components/admin/edit-layout";
import { Pill } from "@/components/ui/pill";
import { formatDateOnly, isoDateOnly } from "@/lib/data/dates";
import {
  AREA_LABELS,
  dateWithRelative,
  deadlineTiming,
  eventTiming,
  FORMAT_LABELS,
  formatDateRange,
  isOutsideBoston,
  KIND_CONFIG,
  signupWindowFact,
  sourceLabel,
  jobPillLabels,
} from "@/lib/data/locator";
import type { DateOnly, Opportunity } from "@/lib/data/types";

function Fact({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "flex flex-col gap-0.5 sm:col-span-2" : "flex flex-col gap-0.5"}>
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="whitespace-pre-line text-sm text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

/** "Oct 24–25, 2026 · starts in 6 days", the dates note when undated, else "To be announced". */
function eventDates(o: Opportunity, today: DateOnly): string {
  const range = formatDateRange(o.starts_on, o.ends_on);
  if (!range) return o.dates_note ?? "To be announced";
  return `${range} · ${eventTiming(o, today) ?? "today"}`;
}

/** "Nov 15, 2026 · closes in 28 days"; internships fall back on the dates note ("Rolling"). */
function deadlineText(o: Opportunity, today: DateOnly): string {
  if (o.deadline_on) return `${formatDateOnly(o.deadline_on)} · ${deadlineTiming(o.deadline_on, today)}`;
  if (o.kind === "internship" && o.dates_note) return o.dates_note;
  return "None listed";
}

/** "Closed Oct 20, 2026 · 2 days ago", or null while the listing is open. */
function closedText(o: Opportunity, today: DateOnly): string | null {
  if (!o.closed_at) return null;
  return `Closed ${dateWithRelative(isoDateOnly(new Date(o.closed_at)), today)}`;
}

/** "Outside Boston" under the listing's title, in the danger tone; nothing
 *  for Suffolk, Boston, Online or the kinds that are not marked. */
export function OutsideBostonNote({ opportunity }: { opportunity: Pick<Opportunity, "kind" | "area"> }) {
  if (!isOutsideBoston(opportunity)) return null;
  return <p className="text-sm text-danger">{AREA_LABELS.outside_boston}</p>;
}

export function OpportunityDetail({ opportunity: o, today }: { opportunity: Opportunity; today: DateOnly }) {
  const cfg = KIND_CONFIG[o.kind];
  const internship = o.kind === "internship";
  const hackathon = o.kind === "hackathon";
  const labels = internship ? jobPillLabels(o) : [AREA_LABELS[o.area]];
  const chips = [...labels, ...(o.posting_site ? [o.posting_site] : []), ...o.tags];
  const closed = closedText(o, today);
  const hasRange = formatDateRange(o.starts_on, o.ends_on) !== null;
  const details = hackathon
    ? (
        [
          ["Team size", o.team_size],
          ["Prizes", o.prizes],
          ["What's provided", o.provided],
        ] as [string, string | null | undefined][]
      ).filter((d): d is [string, string] => Boolean(d[1]))
    : [];

  return (
    <>
      <FormSection title="Overview">
        {o.summary ? <p className="text-sm text-ink">{o.summary}</p> : null}
        {o.description ? <p className="whitespace-pre-line text-sm text-ink-muted">{o.description}</p> : null}
        {!o.summary && !o.description ? (
          <p className="text-sm text-ink-muted">No summary yet. Open the posting for the details.</p>
        ) : null}
        {chips.length ? (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c, i) => (
              <Pill key={`${c}-${i}`}>{c}</Pill>
            ))}
          </div>
        ) : null}
      </FormSection>

      <FormSection title="Who can apply">
        {o.eligibility ? (
          <p className="whitespace-pre-line text-sm text-ink">{o.eligibility}</p>
        ) : (
          <p className="text-sm text-ink-muted">
            The listing doesn&apos;t say. The eligibility check will count this as unknown.
          </p>
        )}
      </FormSection>

      <FormSection title="When and where">
        <dl className="grid gap-4 sm:grid-cols-2">
          {cfg.dated ? <Fact label="Dates">{eventDates(o, today)}</Fact> : null}
          {cfg.dated && hasRange && o.dates_note ? <Fact label="Dates note">{o.dates_note}</Fact> : null}
          {hackathon ? (
            <Fact label="Signup window">{signupWindowFact(o, today) ?? "None listed"}</Fact>
          ) : (
            <Fact label={internship ? "Application deadline" : "Registration deadline"}>{deadlineText(o, today)}</Fact>
          )}
          <Fact label="Format">{FORMAT_LABELS[o.format]}</Fact>
          <Fact label="Location">{o.location ?? AREA_LABELS[o.area]}</Fact>
          {o.pay ? <Fact label={internship ? "Pay" : "Cost"}>{o.pay}</Fact> : null}
          {internship ? <Fact label="Terms">{labels.length ? labels.join(", ") : "Not specified"}</Fact> : null}
        </dl>
      </FormSection>

      {details.length ? (
        <FormSection title="Hackathon details">
          <dl className="grid gap-4 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <Fact key={label} label={label} wide={label !== "Team size"}>
                {value}
              </Fact>
            ))}
          </dl>
        </FormSection>
      ) : null}

      <p className="text-sm text-ink-muted">
        Source: <span className="text-ink">{sourceLabel(o)}</span> ·{" "}
        <a
          href={o.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-ink underline-offset-4 hover:underline"
        >
          Posting
          <ArrowUpRight aria-hidden="true" className="size-4 text-ink-muted" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        {closed ? <> · {closed}</> : null}
      </p>

      <p className="text-xs text-ink-muted">
        {o.verified_on ? (
          <>Last checked by the e-board: {dateWithRelative(o.verified_on, today)}.</>
        ) : (
          <>The e-board hasn&apos;t re-checked this listing yet.</>
        )}{" "}
        Details change; the posting is the source of truth.
      </p>
    </>
  );
}
