"use client";

import { Button } from "@/components/forms/button";

export default function ProjectsError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-medium text-ink">Couldn&apos;t load projects.</h1>
      <p className="text-xs text-ink-muted">{error.message}</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
