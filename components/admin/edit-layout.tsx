/* Building blocks of the admin edit page (docs/DESIGN-BRIEF.md §3).
 *
 *   <EditHeader section="Events" sectionHref="/admin/events" title="Fall kickoff" siteHref="/events" />
 *   <EditForm …>
 *     <EditColumns rail={<><PublishCard …/><RecordCard …/></>}>
 *       <FormSection title="Basics">…</FormSection>
 *     </EditColumns>
 *   </EditForm>
 *   <DangerZone …/>   (after the form, still in the main column width)
 *
 * Main column max-w-text; an 18rem rail ≥1024px. Below 1024px the rail
 * blocks move above the fields (Publish first). Server-safe except the
 * client pieces imported from ./edit-client. */

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { TimeAgo } from "@/components/forms/time-ago";
import { MicroLabel } from "@/components/ui/micro-label";
import { SurfaceCard } from "@/components/ui/surface-card";

export function EditHeader({
  section,
  sectionHref,
  title,
  siteHref,
}: {
  section: string;
  sectionHref: string;
  title: string;
  siteHref?: string | null;
}) {
  return (
    <header className="mb-8 flex flex-col gap-2">
      <p className="text-sm text-ink-muted">
        <Link href={sectionHref} className="hover:text-ink hover:underline">
          {section}
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="[overflow-wrap:anywhere]">{title}</span>
      </p>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h1 className="text-2xl font-medium text-ink [overflow-wrap:anywhere]">{title}</h1>
        {siteHref ? (
          <a
            href={siteHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink hover:underline"
          >
            View on site <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        ) : null}
      </div>
    </header>
  );
}

export function EditColumns({ rail, children }: { rail: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,44rem)_18rem] lg:items-start lg:gap-8">
      <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:order-2">{rail}</div>
      <div className="flex min-w-0 flex-col gap-6 lg:order-1">{children}</div>
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <SurfaceCard as="div" className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <MicroLabel as="h2">{title}</MicroLabel>
        {description ? <p className="text-sm text-ink-muted">{description}</p> : null}
      </div>
      {children}
    </SurfaceCard>
  );
}

export function RailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SurfaceCard as="div" className="flex flex-col gap-3">
      <MicroLabel as="h2">{title}</MicroLabel>
      {children}
    </SurfaceCard>
  );
}

export function RecordCard({
  createdAt,
  updatedAt,
  createdBy,
}: {
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: string | null;
}) {
  if (!createdAt) return null;
  return (
    <RailCard title="Record">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-ink-muted">Created</dt>
        <dd className="text-ink">
          <TimeAgo date={createdAt} />
        </dd>
        {updatedAt ? (
          <>
            <dt className="text-ink-muted">Updated</dt>
            <dd className="text-ink">
              <TimeAgo date={updatedAt} />
            </dd>
          </>
        ) : null}
        {createdBy ? (
          <>
            <dt className="text-ink-muted">By</dt>
            <dd className="truncate text-ink">{createdBy}</dd>
          </>
        ) : null}
      </dl>
    </RailCard>
  );
}
