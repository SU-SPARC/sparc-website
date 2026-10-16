import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DangerZone } from "@/components/admin/edit-client";
import { StatusBanner } from "@/components/forms/status-banner";
import { EligibilityCard } from "@/components/locator/eligibility-card";
import { OpportunityForm } from "@/components/locator/opportunity-form";
import { deleteOpportunity } from "@/lib/actions/opportunities";
import { editorPage } from "@/lib/actions/queries";
import { aiConfigured, LOCATOR_MODEL } from "@/lib/ai/client";
import { inputsHash } from "@/lib/ai/locator";
import { KIND_CONFIG, kindFromSlug, kindPath } from "@/lib/data/locator";
import { getCareerProfile, getOpportunity } from "@/lib/data/opportunities";

type Params = { params: Promise<{ kind: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const kind = kindFromSlug((await params).kind);
  return { title: kind ? `Edit ${KIND_CONFIG[kind].noun}` : "Locator" };
}

export default async function EditOpportunityPage({
  params,
  searchParams,
}: Params & { searchParams: Promise<{ notice?: string }> }) {
  const { kind: slug, id } = await params;
  const kind = kindFromSlug(slug) ?? notFound();
  const me = await editorPage(`${kindPath(kind)}/${id}`);
  if (!me) return null;
  const { notice } = await searchParams;
  const [found, profile] = await Promise.all([getOpportunity(id), getCareerProfile()]);
  if (!found) notFound();
  // A listing opened under the wrong kind goes to its own URL.
  if (found.kind !== kind) redirect(`${kindPath(found.kind)}/${found.id}`);

  const { check, ...opportunity } = found;
  const cfg = KIND_CONFIG[kind];
  const currentHash = profile ? inputsHash(opportunity, profile, LOCATOR_MODEL) : null;

  return (
    <>
      {notice ? (
        <StatusBanner clearParam="notice" className="mb-6">
          {notice}
        </StatusBanner>
      ) : null}
      <header className="mb-8 flex flex-col gap-2">
        <p className="text-sm text-ink-muted">
          <Link href={kindPath(kind)} className="hover:text-ink hover:underline">
            {cfg.label}
          </Link>
          <span aria-hidden="true"> / </span>
          <span className="[overflow-wrap:anywhere]">{opportunity.title}</span>
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h1 className="text-2xl font-medium text-ink [overflow-wrap:anywhere]">{opportunity.title}</h1>
          <a
            href={opportunity.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink hover:underline"
          >
            View posting <ArrowUpRight aria-hidden="true" className="size-4" />
          </a>
        </div>
        <p className="text-sm text-ink-muted">
          {opportunity.organizer}
          {opportunity.organizer_blurb ? <> · {opportunity.organizer_blurb}</> : null}
        </p>
      </header>
      <OpportunityForm
        kind={kind}
        opportunity={opportunity}
        eligibility={
          <EligibilityCard
            opportunityId={opportunity.id}
            initial={check}
            currentHash={currentHash}
            aiConfigured={aiConfigured()}
            hasProfile={profile !== null}
          />
        }
      />
      <DangerZone
        noun={cfg.noun}
        itemName={opportunity.title}
        description={`Removes this ${cfg.noun} from Locator. Eligibility checks for it are removed too.`}
        deleteAction={deleteOpportunity.bind(null, opportunity.id)}
      />
    </>
  );
}
