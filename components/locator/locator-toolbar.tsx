"use client";

/* LocatorToolbar — the Locator list's search input and FilterChips (with
 * counts), then the "Search elsewhere" links carrying the query
 * (docs/LOCATOR.md, "List screen"). The list owns the query and the
 * active chip. */

import { Input } from "@/components/forms/input";
import { FilterChip } from "@/components/ui/filter-chip";
import { KIND_CONFIG } from "@/lib/data/locator";
import type { OpportunityKind } from "@/lib/data/types";

import { SearchElsewhere } from "./search-elsewhere";

export type Chip = { key: string; label: string };

/** Search input + FilterChips with counts, then "Search elsewhere". */
export function LocatorToolbar({
  kind,
  query,
  onQueryChange,
  chips,
  active,
  onActiveChange,
  countFor,
}: {
  kind: OpportunityKind;
  query: string;
  onQueryChange: (query: string) => void;
  chips: Chip[];
  active: string;
  onActiveChange: (key: string) => void;
  countFor: (key: string) => number;
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
        <div className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {chips.map((chip) => (
            <FilterChip
              key={chip.key}
              pressed={active === chip.key}
              onPressedChange={() => onActiveChange(chip.key)}
              count={countFor(chip.key)}
              className="flex-none"
            >
              {chip.label}
            </FilterChip>
          ))}
        </div>
      </div>
      <SearchElsewhere kind={kind} query={query} />
    </div>
  );
}
