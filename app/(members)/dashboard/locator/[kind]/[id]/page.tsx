/* Members' read-only listing (docs/LOCATOR.md, "Members view"): the facts
 * in OpportunityDetail, "View posting" as the main action, and the
 * eligibility card in the rail. Published rows only; an unpublished or
 * unknown id is a 404 for everyone, editors included. */

import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { EditColumns } from "@/components/admin/edit-layout";
import { buttonClasses } from "@/components/forms/button";
import { EligibilityCard } from "@/components/locator/eligibility-card";
import { OpportunityDetail } from "@/components/locator/opportunity-detail";
import { aiConfigured, LOCATOR_MODEL } from "@/lib/ai/client";
import { inputsHash } from "@/lib/ai/locator";
import { requireUser } from "@/lib/auth";
import { isoDateOnly } from "@/lib/data/dates";
import { KIND_CONFIG, kindFromSlug, kindPath } from "@/lib/data/locator";
import { getCareerProfile, getOpportunity } from "@/lib/data/opportunities";

type Params = { params: Promise<{ kind: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { kind: slug, id } = await params;
  const kind = kindFromSlug(slug);
  if (!kind) return { title: "Locator" };
  const found = await getOpportunity(id, { publishedOnly: true });
  return { title: found ? found.title : KIND_CONFIG[kind].label };
}

export default async function MemberOpportunityPage({ params }: Params) {
  const { kind: slug, id } = await params;
  const kind = kindFromSlug(slug) ?? notFound();
  await requireUser(`${kindPath(kind, "member")}/${id}`);
  const [found, profile] = await Promise.all([getOpportunity(id, { publishedOnly: true }), getCareerProfile()]);
  if (!found) notFound();
  // A listing opened under the wrong kind goes to its own URL.
  if (found.kind !== kind) redirect(`${kindPath(found.kind, "member")}/${found.id}`);

  const { check, ...opportunity } = found;
  const cfg = KIND_CONFIG[kind];
  const currentHash = profile ? inputsHash(opportunity, profile, LOCATOR_MODEL) : null;

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="text-sm text-ink-muted">
          <Link href={kindPath(kind, "member")} className="hover:text-ink hover:underline">
            {cfg.label}
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="[overflow-wrap:anywhere]">{opportunity.title}</span>
        </p>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <h1 className="text-2xl font-medium text-ink [overflow-wrap:anywhere]">{opportunity.title}</h1>
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: "primary" })}
          >
            View posting
            <ArrowUpRight aria-hidden="true" className="size-4" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <p className="text-sm text-ink-muted">
          {opportunity.organizer_url ? (
            <a
              href={opportunity.organizer_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline-offset-4 hover:underline"
            >
              {opportunity.organizer}
            </a>
          ) : (
            <span className="text-ink">{opportunity.organizer}</span>
          )}
          {opportunity.organizer_blurb ? <> · {opportunity.organizer_blurb}</> : null}
        </p>
      </header>

      <EditColumns
        rail={
          <EligibilityCard
            opportunityId={opportunity.id}
            initial={check}
            currentHash={currentHash}
            aiConfigured={aiConfigured()}
            hasProfile={profile !== null}
            mode="member"
          />
        }
      >
        <OpportunityDetail opportunity={opportunity} today={isoDateOnly(new Date())} />
      </EditColumns>
    </>
  );
}
