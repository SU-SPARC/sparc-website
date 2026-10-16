"use client";

import { ListError } from "@/components/admin/list-states";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return <ListError what="members" error={error} reset={reset} />;
}
