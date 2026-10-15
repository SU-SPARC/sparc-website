"use client";

/* The pending-request cards on /admin/projects/requests: everything inline,
 * no expand. A one-line status banner reports the last approve/decline. */

import * as React from "react";

import { EmptyState } from "@/components/forms/empty-state";
import { StatusBanner } from "@/components/forms/status-banner";
import { TimeAgo } from "@/components/forms/time-ago";
import { MicroLabel } from "@/components/ui/micro-label";
import { SurfaceCard } from "@/components/ui/surface-card";
import type { MemberCardOption, PendingRequest } from "@/lib/data/pm";

import { GithubLink, KindChip, METHODOLOGY_LABEL, MethodologyPill, PersonAvatar } from "./meta";
import { RequestReview } from "./request-review";

export function RequestsList({
  requests,
  nextRef,
  cards,
}: {
  requests: PendingRequest[];
  nextRef: string;
  cards: MemberCardOption[];
}) {
  const [message, setMessage] = React.useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {message ? (
        <StatusBanner key={message} onDismiss={() => setMessage(null)}>
          {message}
        </StatusBanner>
      ) : null}
      {requests.length === 0 ? (
        <EmptyState title="No pending requests.">
          Members request projects from their dashboard. New requests show up here.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-4">
          {requests.map((r) => (
            <li key={r.id}>
              <SurfaceCard as="article" aria-labelledby={`req-${r.id}`} className="flex flex-col gap-4 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <MicroLabel>
                      {r.kind === "team" ? "Team" : "Personal"} project · requested <TimeAgo date={r.createdAt} />
                    </MicroLabel>
                    <h2 id={`req-${r.id}`} className="text-lg font-medium text-ink [overflow-wrap:anywhere]">
                      {r.title}
                    </h2>
                  </div>
                  <RequestReview request={r} nextRef={nextRef} cards={cards} onDone={setMessage} />
                </div>
                {r.summary ? <p className="text-sm text-ink">{r.summary}</p> : null}
                {r.highlights.length ? (
                  <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
                    {r.highlights.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                ) : null}
                <dl className="grid gap-x-6 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-1">
                    <MicroLabel as="dt">Requester</MicroLabel>
                    <dd className="flex items-center gap-2">
                      {r.requester ? (
                        <>
                          <PersonAvatar name={r.requester.name} photo={r.requester.photo} />
                          {r.requester.name}
                        </>
                      ) : (
                        <span className="text-ink-muted">Deleted account</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <MicroLabel as="dt">Methodology</MicroLabel>
                    <dd>
                      <MethodologyPill methodology={r.methodology} />
                      <span className="sr-only"> ({METHODOLOGY_LABEL[r.methodology]})</span>
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <MicroLabel as="dt">Proposed supervisor</MicroLabel>
                    <dd className="flex flex-wrap items-center gap-2">
                      {r.supervisorKind && r.supervisorName ? (
                        <>
                          {r.supervisorName}
                          <KindChip kind={r.supervisorKind} />
                        </>
                      ) : (
                        <span className="text-ink-muted">None proposed</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex flex-col gap-1">
                    <MicroLabel as="dt">Repo</MicroLabel>
                    <dd className="flex min-w-0 items-center gap-2">
                      {r.repoUrl ? (
                        <>
                          <GithubLink href={r.repoUrl} label={`${r.title} on GitHub`} className="m-0 -ml-3" />
                          <span className="truncate text-ink-muted">{r.repoUrl.replace(/^https:\/\/github\.com\//, "")}</span>
                        </>
                      ) : (
                        <span className="text-ink-muted">Not yet</span>
                      )}
                    </dd>
                  </div>
                </dl>
              </SurfaceCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
