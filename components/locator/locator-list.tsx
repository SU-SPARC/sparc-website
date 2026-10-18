"use client";

/* LocatorList — one list for all four Locator kinds (docs/LOCATOR.md,
 * "List screen"; DESIGN-BRIEF §2, §13, §15). Header with the open count,
 * search + FilterChips with counts, "Search elsewhere", the ?notice= banner,
 * then the rows in sections: dated kinds This week, Later this month, one
 * per later month, Undated, Past; internships Closing this week, Open, No
 * deadline, Deadline passed. The past section starts collapsed. Each row is
 * a LocatorRow; deleting goes through a ConfirmDialog.
 *
 * `mode="member"` is the read-only list under /dashboard/locator
 * (docs/LOCATOR.md, "Members view"): no New button, no Published / Hidden /
 * Closed / Unreviewed chips, no state pills, rows link to the member
 * detail page.
 *
 * `today` comes from the server (America/New_York) so states and sections
 * match the server render. */

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button, ButtonLink } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { EmptyState } from "@/components/forms/empty-state";
import { StatusBanner } from "@/components/forms/status-banner";
import { checkEligibility } from "@/lib/actions/locator-ai";
import { deleteOpportunity } from "@/lib/actions/opportunities";
import {
  CLOSED_CHIP,
  isPastListing,
  KIND_CONFIG,
  kindPath,
  type LocatorMode,
  rowFilterKeys,
  sectionsForEvents,
  sectionsForInternships,
} from "@/lib/data/locator";
import type { OpportunityWithCheck } from "@/lib/data/opportunities";
import type { DateOnly, OpportunityKind } from "@/lib/data/types";

import { type CheckError, LocatorRow } from "./locator-row";
import { LocatorSection } from "./locator-section";
import { type Chip, LocatorToolbar } from "./locator-toolbar";
import { SearchElsewhere } from "./search-elsewhere";

export interface LocatorListProps {
  kind: OpportunityKind;
  rows: OpportunityWithCheck[];
  today: DateOnly;
  notice?: string;
  aiConfigured: boolean;
  /** "admin" (default): the editors' list. "member": read-only under /dashboard/locator. */
  mode?: LocatorMode;
}

function omit<T>(map: Record<string, T>, id: string): Record<string, T> {
  const next = { ...map };
  delete next[id];
  return next;
}

/** "Show 12 past hackathons", "Show 9 whose deadline passed". */
function showPastLabel(kind: OpportunityKind, count: number): string {
  if (kind === "internship") return `Show ${count} whose deadline passed`;
  const cfg = KIND_CONFIG[kind];
  return `Show ${count} past ${count === 1 ? cfg.noun : cfg.plural}`;
}

/** "Hide past hackathons", "Hide passed deadlines". */
function hidePastLabel(kind: OpportunityKind): string {
  if (kind === "internship") return "Hide passed deadlines";
  return `Hide past ${KIND_CONFIG[kind].plural}`;
}

function filterChips(kind: OpportunityKind, member: boolean): Chip[] {
  const editorChips = [{ key: "published", label: "Published" }, { key: "hidden", label: "Hidden" }, CLOSED_CHIP];
  const kindChips = KIND_CONFIG[kind].filters.filter((f) => !(member && f.editorOnly));
  return [{ key: "all", label: "All" }, ...(member ? [] : editorChips), ...kindChips];
}

/** Nothing listed yet: what the kind is for (editors) or "check back" (members). */
function NoListings({ kind, member, base }: { kind: OpportunityKind; member: boolean; base: string }) {
  const cfg = KIND_CONFIG[kind];
  return (
    <EmptyState
      title={`No ${cfg.plural} yet.`}
      action={
        member ? undefined : (
          <ButtonLink href={`${base}/new`} variant="outline">
            New {cfg.noun}
          </ButtonLink>
        )
      }
    >
      <p>{member ? `The e-board hasn't listed any ${cfg.plural} yet. Check back soon.` : cfg.purpose}</p>
      <div className="mt-3 flex justify-center">
        <SearchElsewhere kind={kind} query="" />
      </div>
    </EmptyState>
  );
}

/** "No past hackathons." for a chip alone, else "No hackathons match “…”." */
function NoMatches({ title, onClear }: { title: string; onClear: () => void }) {
  return (
    <EmptyState
      title={title}
      action={
        <Button variant="text" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );
}

export function LocatorList({ kind, rows, today, notice, aiConfigured, mode = "admin" }: LocatorListProps) {
  const cfg = KIND_CONFIG[kind];
  const member = mode === "member";
  const base = kindPath(kind, mode);
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [deleting, setDeleting] = React.useState<OpportunityWithCheck | null>(null);
  const [checking, setChecking] = React.useState<Record<string, boolean>>({});
  const [checkErrors, setCheckErrors] = React.useState<Record<string, CheckError>>({});
  const [, startTransition] = React.useTransition();

  const keysById = React.useMemo(() => new Map(rows.map((r) => [r.id, rowFilterKeys(r, today)])), [rows, today]);
  const filters = filterChips(kind, member);
  const matchesFilter = (r: OpportunityWithCheck, key: string) => {
    if (key === "all") return true;
    if (key === "published") return r.published;
    if (key === "hidden") return !r.published;
    return (keysById.get(r.id) ?? []).includes(key);
  };

  const q = query.trim().toLowerCase();
  const matchesQuery = (r: OpportunityWithCheck) =>
    !q || [r.title, r.organizer, r.location ?? "", r.posting_site ?? "", ...r.tags].join(" ").toLowerCase().includes(q);
  const visible = rows.filter((r) => matchesFilter(r, filter) && matchesQuery(r));
  const activeLabel = filters.find((f) => f.key === filter)?.label.toLowerCase();
  const noMatchTitle =
    filter !== "all" && !q ? `No ${activeLabel} ${cfg.plural}.` : `No ${cfg.plural} match “${query.trim()}”.`;
  const clearFilters = () => {
    setFilter("all");
    setQuery("");
  };
  const sections = cfg.dated ? sectionsForEvents(visible, today) : sectionsForInternships(visible, today);
  const openCount = rows.filter((r) => !isPastListing(r, today)).length;

  const runCheck = (id: string) => {
    setChecking((c) => ({ ...c, [id]: true }));
    setCheckErrors((e) => omit(e, id));
    startTransition(async () => {
      const res = await checkEligibility(id);
      setChecking((c) => omit(c, id));
      if (!res.ok) setCheckErrors((e) => ({ ...e, [id]: { code: res.code, error: res.error } }));
      router.refresh();
    });
  };

  // Widths for the fixed table layout; the title column takes the rest.
  const columns = [
    { label: kind === "internship" ? "Company" : "Date", srOnly: true, className: "w-14" },
    { label: cfg.noun.charAt(0).toUpperCase() + cfg.noun.slice(1) },
    { label: "Status", className: "w-52" },
    ...(member ? [] : [{ label: "Visibility", className: "w-32" }]),
    { label: "Actions", srOnly: true, end: true, className: "w-14" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="flex items-baseline gap-3 text-2xl font-medium text-ink">
          {cfg.label}
          <span className="text-base font-normal text-ink-muted tabular-nums">{openCount} open</span>
        </h1>
        {member ? null : (
          <ButtonLink href={`${base}/new`} variant="primary">
            <span className="sm:hidden">New</span>
            <span className="max-sm:hidden">New {cfg.noun}</span>
          </ButtonLink>
        )}
      </header>

      {rows.length > 0 ? (
        <LocatorToolbar
          kind={kind}
          query={query}
          onQueryChange={setQuery}
          chips={filters}
          active={filter}
          onActiveChange={setFilter}
          countFor={(key) => rows.filter((r) => matchesFilter(r, key)).length}
        />
      ) : null}

      {notice ? <StatusBanner clearParam="notice">{notice}</StatusBanner> : null}

      {rows.length === 0 ? <NoListings kind={kind} member={member} base={base} /> : null}
      {rows.length > 0 && visible.length === 0 ? <NoMatches title={noMatchTitle} onClear={clearFilters} /> : null}
      {visible.length > 0 ? (
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <LocatorSection
              key={section.key}
              id={`sec-${section.key}`}
              label={section.label}
              count={section.rows.length}
              collapsed={section.collapsed}
              showLabel={showPastLabel(kind, section.rows.length)}
              hideLabel={hidePastLabel(kind)}
              caption={`${cfg.label}: ${section.label}`}
              columns={columns}
            >
              {section.rows.map((r) => (
                <LocatorRow
                  key={r.id}
                  row={r}
                  today={today}
                  mode={mode}
                  aiConfigured={aiConfigured}
                  checking={Boolean(checking[r.id])}
                  checkError={checkErrors[r.id] ?? null}
                  onCheck={() => runCheck(r.id)}
                  onDelete={() => setDeleting(r)}
                />
              ))}
            </LocatorSection>
          ))}
        </div>
      ) : null}

      {member ? null : (
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
          <p>
            Removes this {cfg.noun} from Locator. Eligibility checks for it are removed too. This can&apos;t be undone.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
