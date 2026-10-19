"use client";

/* SourceCard — the edit page's Source rail card: where the listing came
 * from, its links, the sync's dates, and "Mark reviewed" for sync rows. Sits under Verified. */

import { ArrowUpRight } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { RailCard } from "@/components/admin/edit-layout";
import { Button } from "@/components/forms/button";
import { TimeAgo } from "@/components/forms/time-ago";
import { markOpportunityReviewed } from "@/lib/actions/opportunities";
import { sourceLabel } from "@/lib/data/locator";
import type { Opportunity } from "@/lib/data/types";

function OutLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-ink underline-offset-4 hover:underline"
    >
      {children}
      <ArrowUpRight aria-hidden="true" className="size-4 text-ink-muted" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

export function SourceCard({ opportunity: o }: { opportunity: Opportunity }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const sync = o.source === "sync";
  const dates = (
    [
      ["Posted", o.posted_at],
      ["First seen", o.first_seen_at],
      ["Last seen", o.last_seen_at],
      ["Closed", o.closed_at],
    ] as [string, string | null | undefined][]
  ).filter((d): d is [string, string] => Boolean(d[1]));

  return (
    <RailCard title="Source">
      <p className="text-sm text-ink [overflow-wrap:anywhere]">{sourceLabel(o)}</p>
      <div className="flex flex-col gap-1">
        {o.source_url ? <OutLink href={o.source_url}>Open source</OutLink> : null}
        <OutLink href={o.url}>Open posting</OutLink>
      </div>
      {o.external_id ? (
        <p className="font-mono text-xs text-ink-muted [overflow-wrap:anywhere]">{o.external_id}</p>
      ) : null}
      {dates.length ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {dates.map(([label, at]) => (
            <React.Fragment key={label}>
              <dt className="text-ink-muted">{label}</dt>
              <dd className="text-ink">
                <TimeAgo date={at} />
              </dd>
            </React.Fragment>
          ))}
        </dl>
      ) : null}
      {sync ? (
        o.reviewed_at ? (
          <p className="text-sm text-ink">
            Reviewed <TimeAgo date={o.reviewed_at} />
          </p>
        ) : (
          <div>
            <Button
              variant="outline"
              size="sm"
              pending={pending}
              pendingLabel="Marking…"
              onClick={() =>
                startTransition(async () => {
                  await markOpportunityReviewed(o.id);
                  router.refresh();
                })
              }
            >
              Mark reviewed
            </Button>
          </div>
        )
      ) : null}
    </RailCard>
  );
}
