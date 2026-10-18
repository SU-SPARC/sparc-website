"use client";

/* LocatorRow — one listing in the Locator list (docs/DESIGN-BRIEF.md §15;
 * docs/LOCATOR.md, "List screen"). Left block (date block or organizer
 * initials, faded when the listing is past), the title with its pills, meta
 * `organizer · location · dates`, a right column with the state word and
 * "Listed 3d ago", then for editors the Published / Hidden pill and the ⋯
 * menu. Members (`mode="member"`) get no editor pills, no state pill, and a
 * menu with only "View posting" and "Check my eligibility". */

import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { ActionMenu, type ActionMenuItem } from "@/components/forms/action-menu";
import { ListRow, ListThumb, StatePill } from "@/components/forms/list";
import { TimeAgo } from "@/components/forms/time-ago";
import { Pill } from "@/components/ui/pill";
import { markOpportunityReviewed, markOpportunityVerified, setOpportunityPublished } from "@/lib/actions/opportunities";
import { formatDateOnly, parseDateOnly } from "@/lib/data/dates";
import {
  AREA_LABELS,
  formatDateRange,
  interestLabel,
  isPastListing,
  isUnreviewed,
  kindPath,
  listedAgo,
  type LocatorMode,
  profilePath,
  sourceLabel,
  TERM_LABELS,
  VERDICT_LABELS,
  verifiedState,
} from "@/lib/data/locator";
import type { OpportunityWithCheck } from "@/lib/data/opportunities";
import type { DateOnly, EligibilityVerdict } from "@/lib/data/types";

import { ListingState } from "./listing-state";

export const VERDICT_TONE: Record<EligibilityVerdict, string> = {
  eligible: "text-success",
  likely: "text-ink",
  unclear: "text-warning",
  not_eligible: "text-danger",
};

export type CheckError = { code: string; error: string };

export interface LocatorRowProps {
  row: OpportunityWithCheck;
  today: DateOnly;
  mode: LocatorMode;
  aiConfigured: boolean;
  /** An eligibility check for this row is running. */
  checking: boolean;
  checkError: CheckError | null;
  onCheck: () => void;
  onDelete: () => void;
}

/** Day number over the short month; the calendar icon when undated. */
function DateBlock({ date }: { date: DateOnly | null }) {
  if (!date) return <ListThumb icon={<CalendarDays aria-hidden="true" className="size-4" />} />;
  return (
    <span className="flex size-10 flex-none flex-col items-center justify-center gap-0.5 rounded-control bg-surface-2 leading-none">
      <span className="text-sm leading-none font-medium text-ink tabular-nums">{parseDateOnly(date).day}</span>
      <span className="text-label leading-none uppercase text-ink-muted">
        {formatDateOnly(date, { month: "short" })}
      </span>
    </span>
  );
}

function LeftBlock({ row, past }: { row: OpportunityWithCheck; past: boolean }) {
  const block = row.kind === "internship" ? <ListThumb name={row.organizer} /> : <DateBlock date={row.starts_on} />;
  return <div className={past ? "opacity-60" : undefined}>{block}</div>;
}

/** Terms or area; "via Greenhouse" (editors) or the posting site (members);
 *  "3 interested"; the viewer's eligibility verdict. */
function RowPills({ row, member }: { row: OpportunityWithCheck; member: boolean }) {
  const labels = row.kind === "internship" ? row.internship_terms.map((t) => TERM_LABELS[t]) : [AREA_LABELS[row.area]];
  const origin = member ? row.posting_site : `via ${sourceLabel(row)}`;
  const interested = interestLabel(row.interest_count);
  return (
    <span className="flex flex-wrap gap-1.5">
      {!member && isUnreviewed(row) ? (
        <Pill className="whitespace-nowrap">
          <span className="text-warning">Unreviewed</span>
        </Pill>
      ) : null}
      {labels.map((label) => (
        <Pill key={label} className="whitespace-nowrap">
          {label}
        </Pill>
      ))}
      {origin ? <Pill className="whitespace-nowrap">{origin}</Pill> : null}
      {interested ? <Pill className="whitespace-nowrap">{interested}</Pill> : null}
      {row.check ? (
        <Pill className="whitespace-nowrap">
          <span className={VERDICT_TONE[row.check.verdict]}>{VERDICT_LABELS[row.check.verdict]}</span>
        </Pill>
      ) : null}
    </span>
  );
}

/** "Oct 24–25, 2026" for the event kinds; "Due Nov 15, 2026" or the dates note for internships. */
function whenText(row: OpportunityWithCheck): string | null {
  if (row.kind !== "internship") return formatDateRange(row.starts_on, row.ends_on) ?? row.dates_note;
  if (row.deadline_on) return `Due ${formatDateOnly(row.deadline_on)}`;
  return row.dates_note;
}

function CheckErrorLine({ error, mode }: { error: CheckError; mode: LocatorMode }) {
  return (
    <span role="alert" className="block whitespace-normal text-danger">
      {error.code === "refused" ? "The AI declined to assess this listing." : error.error}
      {error.code === "no_profile" ? (
        <>
          {" "}
          <Link href={profilePath(mode)} className="underline underline-offset-4 hover:text-ink">
            Locator profile
          </Link>
        </>
      ) : null}
    </span>
  );
}

/** The state word, "Listed 3d ago", and the verification warning when there is one. */
function RowStatus({ row, today }: { row: OpportunityWithCheck; today: DateOnly }) {
  const verified = verifiedState(row, today);
  return (
    <div className="flex flex-col gap-0.5 sm:w-48">
      <ListingState opportunity={row} today={today} compact />
      <p className="text-xs text-ink-muted">
        Listed <TimeAgo date={listedAgo(row)} />
      </p>
      {verified?.warning ? <p className="text-xs text-warning">{verified.text}</p> : null}
    </div>
  );
}

function useRowMenu({
  row,
  mode,
  aiConfigured,
  checking,
  onCheck,
  onDelete,
}: Omit<LocatorRowProps, "today" | "checkError">): ActionMenuItem[] {
  const router = useRouter();
  const [, startTransition] = React.useTransition();
  const items: ActionMenuItem[] = [{ label: "View posting", href: row.url, external: true }];
  if (aiConfigured) {
    items.push({ label: checking ? "Checking…" : "Check my eligibility", disabled: checking, onSelect: onCheck });
  }
  if (mode === "member") return items;
  if (isUnreviewed(row)) {
    items.push({
      label: "Mark reviewed",
      onSelect: () =>
        startTransition(async () => {
          await markOpportunityReviewed(row.id);
          router.refresh();
        }),
    });
  }
  items.push({ label: "Mark verified today", onSelect: () => startTransition(() => markOpportunityVerified(row.id)) });
  if (row.source_url) items.push({ label: "Open source", href: row.source_url, external: true });
  items.push(
    {
      label: row.published ? "Unpublish" : "Publish",
      onSelect: () => startTransition(() => setOpportunityPublished(row.id, !row.published)),
    },
    { type: "divider" },
    { label: "Delete…", tone: "danger", onSelect: onDelete },
  );
  return items;
}

export function LocatorRow(props: LocatorRowProps) {
  const { row, today, mode, checking, checkError } = props;
  const member = mode === "member";
  const past = isPastListing(row, today);
  const items = useRowMenu(props);
  const meta = [row.organizer, row.location, whenText(row)].filter(Boolean).join(" · ");
  return (
    <ListRow
      thumb={<LeftBlock row={row} past={past} />}
      title={past ? <span className="text-ink-muted">{row.title}</span> : row.title}
      href={`${kindPath(row.kind, mode)}/${row.id}`}
      titleAside={<RowPills row={row} member={member} />}
      meta={
        <>
          {meta}
          {checking ? (
            <span role="status" className="block">
              Checking eligibility…
            </span>
          ) : null}
          {checkError && !checking ? <CheckErrorLine error={checkError} mode={mode} /> : null}
        </>
      }
      aside={<RowStatus row={row} today={today} />}
      state={member ? undefined : <StatePill published={row.published} />}
      controls={<ActionMenu label={`Actions for ${row.title}`} items={items} />}
    />
  );
}
