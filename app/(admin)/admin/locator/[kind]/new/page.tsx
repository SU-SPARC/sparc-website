import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EditHeader } from "@/components/admin/edit-layout";
import { NewOpportunity } from "@/components/locator/import-from-url";
import { editorPage } from "@/lib/actions/queries";
import { aiConfigured } from "@/lib/ai/client";
import { KIND_CONFIG, kindFromSlug, kindPath } from "@/lib/data/locator";

type Params = { params: Promise<{ kind: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const kind = kindFromSlug((await params).kind);
  return { title: kind ? `New ${KIND_CONFIG[kind].noun}` : "Locator" };
}

export default async function NewOpportunityPage({ params }: Params) {
  const kind = kindFromSlug((await params).kind) ?? notFound();
  const me = await editorPage(`${kindPath(kind)}/new`);
  if (!me) return null;
  const cfg = KIND_CONFIG[kind];
  return (
    <>
      <EditHeader section={cfg.label} sectionHref={kindPath(kind)} title={`New ${cfg.noun}`} />
      <NewOpportunity kind={kind} aiConfigured={aiConfigured()} />
    </>
  );
}
