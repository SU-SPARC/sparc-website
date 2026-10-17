import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LocatorList } from "@/components/locator/locator-list";
import { editorPage } from "@/lib/actions/queries";
import { aiConfigured } from "@/lib/ai/client";
import { isoDateOnly } from "@/lib/data/dates";
import { KIND_CONFIG, kindFromSlug, kindPath } from "@/lib/data/locator";
import { listOpportunities } from "@/lib/data/opportunities";

type Params = { params: Promise<{ kind: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const kind = kindFromSlug((await params).kind);
  return { title: kind ? KIND_CONFIG[kind].label : "Locator" };
}

export default async function LocatorListPage({
  params,
  searchParams,
}: Params & { searchParams: Promise<{ notice?: string }> }) {
  const kind = kindFromSlug((await params).kind) ?? notFound();
  const me = await editorPage(kindPath(kind));
  if (!me) return null;
  const { notice } = await searchParams;
  const rows = await listOpportunities(kind);
  return (
    <LocatorList kind={kind} rows={rows} today={isoDateOnly(new Date())} notice={notice} aiConfigured={aiConfigured()} />
  );
}
