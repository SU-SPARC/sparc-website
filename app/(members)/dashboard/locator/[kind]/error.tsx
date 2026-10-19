"use client";

import { useParams } from "next/navigation";

import { ListError } from "@/components/admin/list-states";
import { KIND_CONFIG, kindFromSlug } from "@/lib/data/locator";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ kind: string }>();
  const kind = kindFromSlug(params.kind ?? "");
  return <ListError what={kind ? KIND_CONFIG[kind].plural : "listings"} error={error} reset={reset} />;
}
