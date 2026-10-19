/* "Search elsewhere:" — outbound links that carry the list's current query.
 * Server-safe; the list renders it. */

import { ArrowUpRight } from "lucide-react";

import { searchElsewhere } from "@/lib/data/locator";
import type { OpportunityKind } from "@/lib/data/types";

export function SearchElsewhere({ kind, query }: { kind: OpportunityKind; query: string }) {
  const links = searchElsewhere(kind, query);
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
      <span>Search elsewhere:</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-0.5 rounded-control underline-offset-4 hover:text-ink hover:underline"
        >
          {l.label}
          <ArrowUpRight aria-hidden="true" className="size-3" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </p>
  );
}
