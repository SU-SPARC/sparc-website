"use client";

/* LocatorSection — one section of the Locator list: a MicroLabel heading
 * with its count, then the rows in a ListTable. A collapsed section (Past,
 * Deadline passed) keeps its rows in the shared Expand behind a text button: "Show 12 past hackathons" /
 * "Hide past hackathons". */

import * as React from "react";

import { Button } from "@/components/forms/button";
import { type ListColumn, ListTable } from "@/components/forms/list";
import { MicroLabel } from "@/components/ui/micro-label";
import { Expand } from "@/components/ui/expand";

export interface LocatorSectionProps {
  /** Unique within the page; used for the heading and panel ids. */
  id: string;
  label: string;
  count: number;
  collapsed: boolean;
  /** "Show 12 past hackathons" */
  showLabel: string;
  /** "Hide past hackathons" */
  hideLabel: string;
  caption: string;
  columns: ListColumn[];
  children: React.ReactNode;
}

export function LocatorSection({
  id,
  label,
  count,
  collapsed,
  showLabel,
  hideLabel,
  caption,
  columns,
  children,
}: LocatorSectionProps) {
  const [open, setOpen] = React.useState(false);
  const headingId = `${id}-heading`;
  const panelId = `${id}-rows`;
  // Fixed layout: column widths come from `columns`, so a long meta line
  // truncates instead of widening the table.
  const table = (
    <ListTable caption={caption} columns={columns} className="table-fixed">
      {children}
    </ListTable>
  );
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <MicroLabel as="h2" id={headingId} className="flex items-baseline gap-2">
        {label}
        <span className="tabular-nums">{count}</span>
      </MicroLabel>
      {collapsed ? (
        <>
          <Button
            variant="text"
            size="sm"
            className="-ml-3 self-start"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen(!open)}
          >
            {open ? hideLabel : showLabel}
          </Button>
          <Expand open={open} id={panelId}>
            {table}
          </Expand>
        </>
      ) : (
        table
      )}
    </section>
  );
}
