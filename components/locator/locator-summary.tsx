/* "Your Locator" in the dashboard's right column: three plain lines, no
 * tiles. "2 enrolling · 3 interested", "4 deadlines in the next 14 days", "Open Locator →". Server-safe.
 *
 * Used by: app/(members)/dashboard/page.tsx, with getLocatorSummary(). */

import Link from "next/link";

import { MicroLabel } from "@/components/ui/micro-label";
import type { LocatorSummary as LocatorSummaryData } from "@/lib/data/calendar";

export interface LocatorSummaryProps {
  summary: LocatorSummaryData;
}

export function LocatorSummary({ summary }: LocatorSummaryProps) {
  return (
    <section aria-labelledby="your-locator" className="flex flex-col gap-3">
      <MicroLabel as="h2" id="your-locator">
        Your Locator
      </MicroLabel>
      <div className="flex flex-col gap-1 text-sm text-ink">
        <p>
          {summary.enrolling} enrolling · {summary.interested} interested
        </p>
        <p>{deadlinesLine(summary.deadlinesSoon)}</p>
        <p>
          <Link href="/dashboard/locator" className="text-ink underline underline-offset-4 hover:text-accent-text">
            Open Locator →
          </Link>
        </p>
      </div>
    </section>
  );
}

/** Internship deadlines: "1 deadline in the next 14 days", "4 deadlines in the next 14 days". */
function deadlinesLine(count: number): string {
  if (count === 1) return "1 deadline in the next 14 days";
  return `${count} deadlines in the next 14 days`;
}
