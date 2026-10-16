"use client";

/* LocatorList — one list for all four Locator kinds (docs/LOCATOR.md,
 * "List screen"; brief §2). Header, search + FilterChips with counts,
 * "Search elsewhere", the ?notice= banner, then rows: internships in one
 * table (deadline order from the data layer), dated kinds grouped by month,
 * then Undated, then Past. The ⋯ menu runs the eligibility check, marks the
 * listing verified, publishes, and deletes through a ConfirmDialog.
 *
 * `today` comes from the server (America/New_York) so grouping and
 * "Closing soon" match the server render. */

import { CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { ActionMenu, type ActionMenuItem } from "@/components/forms/action-menu";
import { Button, ButtonLink } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { EmptyState } from "@/components/forms/empty-state";
import { Input } from "@/components/forms/input";
import { ListRow, ListTable, ListThumb, StatePill } from "@/components/forms/list";
import { StatusBanner } from "@/components/forms/status-banner";
import { FilterChip } from "@/components/ui/filter-chip";
import { MicroLabel } from "@/components/ui/micro-label";
import { Pill } from "@/components/ui/pill";
import { checkEligibility } from "@/lib/actions/locator-ai";
import { deleteOpportunity, markOpportunityVerified, setOpportunityPublished } from "@/lib/actions/opportunities";
import { formatDateOnly, parseDateOnly } from "@/lib/data/dates";
import {
  AREA_LABELS,
  dateStatus,
  deadlineStatus,
  formatDateRange,
  KIND_CONFIG,
  kindPath,
  monthKey,
  monthLabel,
  rowFilterKeys,
  TERM_LABELS,
  VERDICT_LABELS,
} from "@/lib/data/locator";
import type { OpportunityWithCheck } from "@/lib/data/opportunities";
import type { DateOnly, EligibilityVerdict, OpportunityKind } from "@/lib/data/types";

import { SearchElsewhere } from "./search-elsewhere";

export const VERDICT_TONE: Record<EligibilityVerdict, string> = {
  eligible: "text-success",
  likely: "text-ink",
  unclear: "text-warning",
  not_eligible: "text-danger",
};

export interface LocatorListProps {
  kind: OpportunityKind;
  rows: OpportunityWithCheck[];
  today: DateOnly;
  notice?: string;
  aiConfigured: boolean;
}

type Section = { key: string; label: string; rows: OpportunityWithCheck[]; past?: boolean };

/** Upcoming/ongoing by month, then Undated (newest first), then Past (most recent first). */
function groupByMonth(rows: OpportunityWithCheck[], today: DateOnly): Section[] {
  const months = new Map<string, OpportunityWithCheck[]>();
  const undated: OpportunityWithCheck[] = [];
  const past: OpportunityWithCheck[] = [];
  for (const r of rows) {
    const s = dateStatus(r, today);
    if (s === "undated") undated.push(r);
    else if (s === "past") past.push(r);
    else {
      const key = monthKey(r.starts_on as DateOnly);
      months.set(key, [...(months.get(key) ?? []), r]);
    }
  }
  const sections: Section[] = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({ key, label: monthLabel(key), rows: list }));
  if (undated.length) {
    undated.sort((a, b) => b.created_at.localeCompare(a.created_at));
    sections.push({ key: "undated", label: "Undated", rows: undated });
  }
  if (past.length) {
    past.sort((a, b) => (b.starts_on ?? "").localeCompare(a.starts_on ?? ""));
    sections.push({ key: "past", label: "Past", rows: past, past: true });
  }
  return sections;
}

function DateBlock({ date }: { date: DateOnly | null }) {
  if (!date) return <ListThumb icon={<CalendarDays aria-hidden="true" className="size-4" />} />;
  return (
    <span className="flex size-10 flex-none flex-col items-center justify-center gap-0.5 rounded-control bg-surface-2 leading-none">
      <span className="text-sm leading-none font-medium text-ink tabular-nums">{parseDateOnly(date).day}</span>
      <span className="text-label leading-none uppercase text-ink-muted">{formatDateOnly(date, { month: "short" })}</span>
    </span>
  );
}

function omit<T>(map: Record<string, T>, id: string): Record<string, T> {
  const next = { ...map };
  delete next[id];
  return next;
}

function errorText(code: string, error: string): string {
  return code === "refused" ? "The AI declined to assess this listing." : error;
}

export function LocatorList({ kind, rows, today, notice, aiConfigured }: LocatorListProps) {
  const cfg = KIND_CONFIG[kind];
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [deleting, setDeleting] = React.useState<OpportunityWithCheck | null>(null);
  const [checking, setChecking] = React.useState<Record<string, boolean>>({});
  const [checkErrors, setCheckErrors] = React.useState<Record<string, string>>({});
  const [, startTransition] = React.useTransition();

  const keysById = React.useMemo(() => new Map(rows.map((r) => [r.id, rowFilterKeys(r, today)])), [rows, today]);
  const filters = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "hidden", label: "Hidden" },
    ...cfg.filters,
  ];
  const matchesFilter = (r: OpportunityWithCheck, key: string) =>
    key === "all" ||
    (key === "published" ? r.published : key === "hidden" ? !r.published : (keysById.get(r.id) ?? []).includes(key));

  const q = query.trim().toLowerCase();
  const matchesQuery = (r: OpportunityWithCheck) =>
    !q ||
    [r.title, r.organizer, r.location ?? "", r.posting_site ?? "", ...r.tags].join(" ").toLowerCase().includes(q);
  const visible = rows.filter((r) => matchesFilter(r, filter) && matchesQuery(r));
  const activeLabel = filters.find((f) => f.key === filter)?.label.toLowerCase();
  const sections: Section[] = cfg.dated ? groupByMonth(visible, today) : [{ key: "all", label: cfg.label, rows: visible }];

  const runCheck = (id: string) => {
    setChecking((c) => ({ ...c, [id]: true }));
    setCheckErrors((e) => omit(e, id));
    startTransition(async () => {
      const res = await checkEligibility(id);
      setChecking((c) => omit(c, id));
      if (!res.ok) setCheckErrors((e) => ({ ...e, [id]: errorText(res.code, res.error) }));
      router.refresh();
    });
  };

  const renderRow = (r: OpportunityWithCheck, past?: boolean) => {
    const when = cfg.dated
      ? (formatDateRange(r.starts_on, r.ends_on) ?? r.dates_note)
      : r.deadline_on
        ? `Due ${formatDateOnly(r.deadline_on)}`
        : r.dates_note;
    const metaText = [r.organizer, r.location, when].filter(Boolean).join(" · ");
    const closingSoon = deadlineStatus(r.deadline_on, today) === "closing_soon";
    const busy = checking[r.id];
    const err = checkErrors[r.id];
    const labels = kind === "internship" ? r.internship_terms.map((t) => TERM_LABELS[t]) : [AREA_LABELS[r.area]];

    const items: ActionMenuItem[] = [
      { label: "View posting", href: r.url, external: true },
      ...(aiConfigured
        ? [{ label: busy ? "Checking…" : "Check my eligibility", disabled: busy, onSelect: () => runCheck(r.id) }]
        : []),
      { label: "Mark verified today", onSelect: () => startTransition(() => markOpportunityVerified(r.id)) },
      {
        label: r.published ? "Unpublish" : "Publish",
        onSelect: () => startTransition(() => setOpportunityPublished(r.id, !r.published)),
      },
      { type: "divider" },
      { label: "Delete…", tone: "danger", onSelect: () => setDeleting(r) },
    ];

    return (
      <ListRow
        key={r.id}
        thumb={kind === "internship" ? <ListThumb name={r.organizer} /> : <DateBlock date={r.starts_on} />}
        title={past ? <span className="text-ink-muted">{r.title}</span> : r.title}
        href={`${kindPath(kind)}/${r.id}`}
        meta={
          <>
            {metaText}
            {closingSoon ? (
              <>
                {metaText ? " · " : null}
                <span className="text-warning">Closing soon</span>
              </>
            ) : null}
            {busy ? (
              <span role="status" className="block">
                Checking eligibility…
              </span>
            ) : err ? (
              <span role="alert" className="block whitespace-normal text-danger">
                {err}
              </span>
            ) : null}
          </>
        }
        extra={[
          {
            content: (
              <span className="flex flex-wrap gap-1.5">
                {labels.map((l) => (
                  <Pill key={l} className="whitespace-nowrap">
                    {l}
                  </Pill>
                ))}
                {r.posting_site ? <Pill className="whitespace-nowrap">{r.posting_site}</Pill> : null}
                {r.check ? (
                  <Pill className="whitespace-nowrap">
                    <span className={VERDICT_TONE[r.check.verdict]}>{VERDICT_LABELS[r.check.verdict]}</span>
                  </Pill>
                ) : null}
              </span>
            ),
          },
        ]}
        state={<StatePill published={r.published} />}
        controls={<ActionMenu label={`Actions for ${r.title}`} items={items} />}
      />
    );
  };

  const columns = [
    { label: kind === "internship" ? "Company" : "Date", srOnly: true },
    { label: cfg.noun.charAt(0).toUpperCase() + cfg.noun.slice(1) },
    { label: "Details" },
    { label: "Status" },
    { label: "Actions", srOnly: true, end: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="flex items-baseline gap-3 text-2xl font-medium text-ink">
          {cfg.label}
          <span className="text-base font-normal text-ink-muted tabular-nums">{rows.length}</span>
        </h1>
        <ButtonLink href={`${kindPath(kind)}/new`} variant="primary">
          <span className="sm:hidden">New</span>
          <span className="max-sm:hidden">New {cfg.noun}</span>
        </ButtonLink>
      </header>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="sm:w-72 sm:flex-none">
              <label htmlFor="locator-search" className="sr-only">
                Search {cfg.plural}
              </label>
              <Input
                id="locator-search"
                type="search"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
              {filters.map((f) => (
                <FilterChip
                  key={f.key}
                  pressed={filter === f.key}
                  onPressedChange={() => setFilter(f.key)}
                  count={rows.filter((r) => matchesFilter(r, f.key)).length}
                  className="flex-none"
                >
                  {f.label}
                </FilterChip>
              ))}
            </div>
          </div>
          <SearchElsewhere kind={kind} query={query} />
        </div>
      ) : null}

      {notice ? <StatusBanner clearParam="notice">{notice}</StatusBanner> : null}

      {rows.length === 0 ? (
        <EmptyState
          title={`No ${cfg.plural} yet.`}
          action={
            <ButtonLink href={`${kindPath(kind)}/new`} variant="outline">
              New {cfg.noun}
            </ButtonLink>
          }
        >
          <p>{cfg.purpose}</p>
          <div className="mt-3 flex justify-center">
            <SearchElsewhere kind={kind} query="" />
          </div>
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter !== "all" && !q ? `No ${activeLabel} ${cfg.plural}.` : `No ${cfg.plural} match “${query.trim()}”.`}
          action={
            <Button
              variant="text"
              onClick={() => {
                setFilter("all");
                setQuery("");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {sections.map((s) => (
            <section key={s.key} aria-labelledby={cfg.dated ? `sec-${s.key}` : undefined} className="flex flex-col gap-2">
              {cfg.dated ? (
                <MicroLabel as="h2" id={`sec-${s.key}`}>
                  {s.label}
                </MicroLabel>
              ) : null}
              <ListTable caption={cfg.dated ? `${cfg.label}: ${s.label}` : cfg.label} columns={columns}>
                {s.rows.map((r) => renderRow(r, s.past))}
              </ListTable>
            </section>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={deleting !== null && rows.some((r) => r.id === deleting.id)}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title={deleting ? `Delete ${deleting.title}?` : ""}
        confirmLabel={`Delete ${cfg.noun}`}
        pendingLabel="Deleting…"
        onConfirm={async () => {
          if (deleting) await deleteOpportunity(deleting.id);
        }}
      >
        <p>Removes this {cfg.noun} from Locator. Eligibility checks for it are removed too. This can&apos;t be undone.</p>
      </ConfirmDialog>
    </div>
  );
}
