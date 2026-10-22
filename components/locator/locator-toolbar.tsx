"use client";

/* LocatorToolbar — the Locator list's filter area (docs/LOCATOR.md, "List
 * screen"; docs/DESIGN-BRIEF.md §17), three rows:
 *   1. the status FilterChips with counts (All / Published / Hidden / …),
 *      one active; they scroll sideways on phones and wrap from 640px;
 *   2. the search input, then one FilterMenu per labelled row (internships:
 *      "Type" and "Term", one value each), the multi-select "Place" menu,
 *      and a "Reset filters" button while anything narrows the list;
 *   3. the "Search elsewhere" links carrying the query.
 * The list owns the query, each row's active chips and what clearing does;
 * one chip is active per ChipRow, any number per MultiChipRow. */

import { Button } from "@/components/forms/button";
import { Input } from "@/components/forms/input";
import { FilterChip } from "@/components/ui/filter-chip";
import { FilterMenu, type FilterMenuOption } from "@/components/ui/filter-menu";
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

/** A chip row with a name ("Type", "Term"); shown as a single-select menu. */
export type LabelledChipRow = ChipRow & { id: string; label: string };

/** A named row of toggle chips, any number on at once ("Place"); shown as a multi-select menu. */
export type MultiChipRow = {
  id: string;
  label: string;
  chips: Chip[];
  active: string[];
  onToggle: (key: string) => void;
  countFor: (key: string) => number;
};

/** The status chips; scroll sideways on phones, wrap from 640px. */
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

/** A labelled row's chips as menu options; its "All" chip reads "All types" / "All terms". */
function rowOptions(row: LabelledChipRow): FilterMenuOption[] {
  return row.chips.map((chip) => ({
    key: chip.key,
    label: chip.key === "all" ? `All ${row.label.toLowerCase()}s` : chip.label,
    count: row.countFor(chip.key),
  }));
}

function multiOptions(row: MultiChipRow): FilterMenuOption[] {
  return row.chips.map((chip) => ({ key: chip.key, label: chip.label, count: row.countFor(chip.key) }));
}

/** Status chips; search input + filter menus + "Reset filters"; then "Search elsewhere". */
export function LocatorToolbar({
  kind,
  query,
  onQueryChange,
  status,
  rows = [],
  place,
  active,
  onClear,
}: {
  kind: OpportunityKind;
  query: string;
  onQueryChange: (query: string) => void;
  /** All / Published / Hidden / … — the top row */
  status: ChipRow;
  /** the single-select menus beside the search box, in order */
  rows?: LabelledChipRow[];
  /** the multi-select "Place" menu, after them */
  place?: MultiChipRow;
  /** something narrows the list, so "Reset filters" shows */
  active: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Chips row={status} className="-mx-gutter px-gutter sm:mx-0 sm:px-0" />
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-72 sm:flex-none">
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
        {rows.map((row) => (
          <FilterMenu
            key={row.id}
            label={row.label}
            options={rowOptions(row)}
            select={{ kind: "single", value: row.active, onChange: row.onActiveChange, allKey: "all" }}
          />
        ))}
        {place ? (
          <FilterMenu
            label={place.label}
            options={multiOptions(place)}
            select={{
              kind: "multi",
              values: place.active,
              onToggle: place.onToggle,
              emptyLabel: `Any ${place.label.toLowerCase()}`,
            }}
          />
        ) : null}
        {active ? (
          <Button variant="text" size="sm" onClick={onClear}>
            Reset filters
          </Button>
        ) : null}
      </div>
      <SearchElsewhere kind={kind} query={query} />
    </div>
  );
}
