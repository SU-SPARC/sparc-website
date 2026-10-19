"use client";

/* LocatorToolbar — the Locator list's search input and status FilterChips
 * (with counts), any labelled chip rows under them (internships: "Type" and
 * "Term"), then the "Search elsewhere" links carrying the query. The list
 * owns the query and each row's active chip; one chip is active per row. */

import { Input } from "@/components/forms/input";
import { FilterChip } from "@/components/ui/filter-chip";
import { MicroLabel } from "@/components/ui/micro-label";
import { KIND_CONFIG } from "@/lib/data/locator";
import type { OpportunityKind } from "@/lib/data/types";

import { SearchElsewhere } from "./search-elsewhere";

export type Chip = { key: string; label: string };

/** One row of single-select chips with counts. */
export type ChipRow = {
  chips: Chip[];
  active: string;
  onActiveChange: (key: string) => void;
  countFor: (key: string) => number;
};

/** A chip row with a name shown before it ("Type", "Term"). */
export type LabelledChipRow = ChipRow & { id: string; label: string };

/** The row's chips; scrolls sideways on phones, wraps from 640px. */
function Chips({ row, className }: { row: ChipRow; className: string }) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 ${className}`}>
      {row.chips.map((chip) => (
        <FilterChip
          key={chip.key}
          pressed={row.active === chip.key}
          onPressedChange={() => row.onActiveChange(chip.key)}
          count={row.countFor(chip.key)}
          className="flex-none"
        >
          {chip.label}
        </FilterChip>
      ))}
    </div>
  );
}

/** "TYPE  All 40 · Internship 31 · Co-op 6 · New grad 3" as a named group. */
function NamedChips({ row }: { row: LabelledChipRow }) {
  const labelId = `locator-chips-${row.id}`;
  return (
    <div role="group" aria-labelledby={labelId} className="flex items-center gap-3">
      <MicroLabel id={labelId} className="w-12 flex-none">
        {row.label}
      </MicroLabel>
      <Chips row={row} className="-mr-gutter min-w-0 pr-gutter sm:mr-0 sm:pr-0" />
    </div>
  );
}

/** Search input + status chips, the labelled chip rows, then "Search elsewhere". */
export function LocatorToolbar({
  kind,
  query,
  onQueryChange,
  status,
  rows = [],
}: {
  kind: OpportunityKind;
  query: string;
  onQueryChange: (query: string) => void;
  /** All / Published / Hidden / … beside the search box */
  status: ChipRow;
  /** rows under the search box, in order */
  rows?: LabelledChipRow[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-72 sm:flex-none">
          <label htmlFor="locator-search" className="sr-only">
            Search {KIND_CONFIG[kind].plural}
          </label>
          <Input
            id="locator-search"
            type="search"
            placeholder="Search…"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
          />
        </div>
        <Chips row={status} className="-mx-gutter px-gutter sm:mx-0 sm:px-0" />
      </div>
      {rows.map((row) => (
        <NamedChips key={row.id} row={row} />
      ))}
      <SearchElsewhere kind={kind} query={query} />
    </div>
  );
}
