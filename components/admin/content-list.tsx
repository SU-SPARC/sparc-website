"use client";

/* ContentList — the shared admin list for every
 * content type: header (h1 + count + "New x"), toolbar (search filtering
 * client-side + FilterChips: All / Published / Hidden + type extras),
 * status banner slot, then the ListTable with thumb, title-as-link, meta,
 * state pill, optional up/down order buttons and the ⋯ menu ("View on
 * site ↗", Publish/Unpublish, Delete…). Delete opens a ConfirmDialog;
 * the delete action redirects back here with ?notice=….
 *
 * Rows are plain data from the server page; actions are server actions
 * passed as props. */

import * as React from "react";

import { ButtonLink, Button } from "@/components/forms/button";
import { ConfirmDialog } from "@/components/forms/confirm-dialog";
import { EmptyState } from "@/components/forms/empty-state";
import { Input } from "@/components/forms/input";
import { ListRow, ListTable, ListThumb, StatePill } from "@/components/forms/list";
import { ActionMenu, type ActionMenuItem } from "@/components/forms/action-menu";
import { StatusBanner } from "@/components/forms/status-banner";
import { UpDownButtons } from "@/components/forms/up-down-buttons";
import { FilterChip } from "@/components/ui/filter-chip";

export type ContentRow = {
  id: string;
  title: string;
  href: string;
  meta?: string;
  thumb?: string | null;
  /** Initials fallback for the thumb (people). */
  thumbName?: string;
  published: boolean;
  /** Extra filter keys this row matches (e.g. "current", "upcoming"). */
  tags?: string[];
  /** Lowercased text matched by the search box. */
  search: string;
  /** Public page for "View on site ↗". */
  siteHref?: string;
  /** One or two lines for the delete dialog. */
  deleteNote?: string;
  /** Type-to-confirm string for the delete dialog (projects). */
  confirmText?: string;
};

export type ContentFilter = { key: string; label: string };

export interface ContentListProps {
  /** "event" — used in "New event", "Delete event", empty states. */
  noun: string;
  /** "Events" — the h1. */
  title: string;
  /** "events" — "No events yet." */
  plural: string;
  /** One line on what this type is for (empty state). */
  purpose: string;
  newHref: string;
  rows: ContentRow[];
  extraFilters?: ContentFilter[];
  notice?: string;
  orderable?: boolean;
  moveAction?: (id: string, dir: "up" | "down") => Promise<void>;
  publishAction: (id: string, published: boolean) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
  /** sr-only label of the title column ("Event"). */
  titleColumn?: string;
}

export function ContentList({
  noun,
  title,
  plural,
  purpose,
  newHref,
  rows,
  extraFilters = [],
  notice,
  orderable,
  moveAction,
  publishAction,
  deleteAction,
  titleColumn,
}: ContentListProps) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("all");
  const [deleting, setDeleting] = React.useState<ContentRow | null>(null);
  const [, startTransition] = React.useTransition();

  const filters: ContentFilter[] = [
    { key: "all", label: "All" },
    { key: "published", label: "Published" },
    { key: "hidden", label: "Hidden" },
    ...extraFilters,
  ];
  const matchesFilter = (r: ContentRow, key: string) =>
    key === "all" || (key === "published" ? r.published : key === "hidden" ? !r.published : (r.tags ?? []).includes(key));

  const q = query.trim().toLowerCase();
  const visible = rows.filter((r) => matchesFilter(r, filter) && (!q || r.search.includes(q)));
  const filtered = filter !== "all" || q !== "";
  const Noun = noun.charAt(0).toUpperCase() + noun.slice(1);
  const activeLabel = filters.find((f) => f.key === filter)?.label.toLowerCase();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="flex items-baseline gap-3 text-2xl font-medium text-ink">
          {title}
          <span className="text-base font-normal text-ink-muted tabular-nums">{rows.length}</span>
        </h1>
        <ButtonLink href={newHref} variant="primary">
          <span className="sm:hidden">New</span>
          <span className="max-sm:hidden">New {noun}</span>
        </ButtonLink>
      </header>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-72">
            <label htmlFor="list-search" className="sr-only">
              Search {plural}
            </label>
            <Input
              id="list-search"
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
      ) : null}

      {notice ? <StatusBanner clearParam="notice">{notice}</StatusBanner> : null}

      {rows.length === 0 ? (
        <EmptyState
          title={`No ${plural} yet.`}
          action={
            <ButtonLink href={newHref} variant="outline">
              New {noun}
            </ButtonLink>
          }
        >
          {purpose}
        </EmptyState>
      ) : visible.length === 0 ? (
        <EmptyState
          title={filter !== "all" && !q ? `No ${activeLabel} ${plural}.` : `No ${plural} match “${query.trim()}”.`}
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
        <ListTable
          caption={title}
          columns={[
            { label: "Image", srOnly: true },
            { label: titleColumn ?? Noun },
            { label: "Status" },
            { label: "Actions", srOnly: true, end: true },
          ]}
        >
          {visible.map((r) => {
            const index = rows.indexOf(r);
            const items: ActionMenuItem[] = [
              ...(r.siteHref ? [{ label: "View on site", href: r.siteHref, external: true }] : []),
              {
                label: r.published ? "Unpublish" : "Publish",
                onSelect: () => startTransition(() => publishAction(r.id, !r.published)),
              },
              { type: "divider" as const },
              { label: "Delete…", tone: "danger" as const, onSelect: () => setDeleting(r) },
            ];
            return (
              <ListRow
                key={r.id}
                thumb={<ListThumb src={r.thumb} name={r.thumbName} />}
                title={r.title}
                href={r.href}
                meta={r.meta}
                state={<StatePill published={r.published} />}
                controls={
                  <>
                    {orderable && moveAction ? (
                      <UpDownButtons
                        itemLabel={r.title}
                        isFirst={index === 0}
                        isLast={index === rows.length - 1}
                        disabled={filtered}
                        onMove={(dir) => moveAction(r.id, dir)}
                      />
                    ) : null}
                    <ActionMenu label={`Actions for ${r.title}`} items={items} />
                  </>
                }
              />
            );
          })}
        </ListTable>
      )}
      {orderable && filtered && visible.length > 0 ? (
        <p className="text-xs text-ink-muted">Clear the search and filters to reorder.</p>
      ) : null}

      <ConfirmDialog
        open={deleting !== null && rows.some((r) => r.id === deleting.id)}
        onOpenChange={(o) => {
          if (!o) setDeleting(null);
        }}
        title={deleting ? `Delete ${deleting.title}?` : ""}
        confirmLabel={`Delete ${noun}`}
        pendingLabel="Deleting…"
        confirmText={deleting?.confirmText}
        onConfirm={async () => {
          if (deleting) await deleteAction(deleting.id);
        }}
      >
        <p>{deleting?.deleteNote ?? `Removes this ${noun} from the site. This can't be undone.`}</p>
      </ConfirmDialog>
    </div>
  );
}
