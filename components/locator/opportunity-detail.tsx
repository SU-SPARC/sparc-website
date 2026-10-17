/* OpportunityDetail — the read-only listing members open from the list at
 * /dashboard/locator/<kind>/<id> (docs/LOCATOR.md, "Members view"). The
 * facts an editor types into OpportunityForm, laid out as text: Overview,
 * Who can apply, When and where, then a source line ("Source: Greenhouse",
 * the posting link, "Closed <date>" once a sync stops seeing it) and a
 * freshness line. Never Unreviewed, external ids or sync controls. The eligibility
 * card sits in the rail (the page passes it to EditColumns). Server-safe. */

import { ArrowUpRight } from "lucide-react";
import * as React from "react";

import { FormSection } from "@/components/admin/edit-layout";
import { Pill } from "@/components/ui/pill";
import { formatDateOnly } from "@/lib/data/dates";
import {
  AREA_LABELS,
  closedOnLabel,
  deadlineStatus,
  FORMAT_LABELS,
  formatDateRange,
  KIND_CONFIG,
  sourceLabel,
  TERM_LABELS,
} from "@/lib/data/locator";
import type { DateOnly, Opportunity } from "@/lib/data/types";

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
}

export function OpportunityDetail({ opportunity: o, today }: { opportunity: Opportunity; today: DateOnly }) {
  const cfg = KIND_CONFIG[o.kind];
  const internship = o.kind === "internship";
  const when = formatDateRange(o.starts_on, o.ends_on);
  const deadline = deadlineStatus(o.deadline_on, today);
  const labels = internship ? o.internship_terms.map((t) => TERM_LABELS[t]) : [AREA_LABELS[o.area]];
  const chips = [...labels, ...(o.posting_site ? [o.posting_site] : []), ...o.tags];
  const closedOn = closedOnLabel(o);

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
          <p className="text-sm text-ink-muted">The listing doesn&apos;t say. The eligibility check will count this as unknown.</p>
        )}
      </FormSection>

      <FormSection title="When and where">
        <dl className="grid gap-4 sm:grid-cols-2">
          {cfg.dated ? <Fact label="Dates">{when ?? o.dates_note ?? "To be announced"}</Fact> : null}
          {cfg.dated && when && o.dates_note ? <Fact label="Dates note">{o.dates_note}</Fact> : null}
          <Fact label={internship ? "Application deadline" : "Registration deadline"}>
            {o.deadline_on ? (
              <>
                {formatDateOnly(o.deadline_on)}
                {deadline === "closing_soon" ? <span className="text-warning"> · Closing soon</span> : null}
                {deadline === "closed" ? <span className="text-ink-muted"> · Passed</span> : null}
              </>
            ) : !cfg.dated && o.dates_note ? (
              o.dates_note
            ) : (
              "None listed"
            )}
          </Fact>
          <Fact label="Format">{FORMAT_LABELS[o.format]}</Fact>
          <Fact label="Location">{o.location ?? AREA_LABELS[o.area]}</Fact>
          {o.pay ? <Fact label={internship ? "Pay" : "Cost"}>{o.pay}</Fact> : null}
          {internship ? (
            <Fact label="Terms">{labels.length ? labels.join(", ") : "Not specified"}</Fact>
          ) : null}
        </dl>
      </FormSection>

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
        {closedOn ? <> · Closed {closedOn}</> : null}
      </p>

      <p className="text-xs text-ink-muted">
        {o.verified_on ? <>The e-board last checked this listing on {formatDateOnly(o.verified_on)}.</> : <>The e-board hasn&apos;t re-checked this listing yet.</>}{" "}
        Details change; the posting is the source of truth.
      </p>
    </>
  );
}
