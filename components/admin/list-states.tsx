"use client";

/* loading.tsx / error.tsx bodies for admin lists (brief §2): the header,
 * then five static rows of the real row height (no shimmer); errors say
 * what failed, show the message, and offer "Try again" (reset()). */

import { Button } from "@/components/forms/button";

export function ListLoading({ title }: { title: string }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <h1 className="text-2xl font-medium text-ink">{title}</h1>
      <p className="sr-only" role="status">
        Loading {title.toLowerCase()}…
      </p>
      <div className="flex flex-col gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-16 rounded-control bg-surface-1" />
        ))}
      </div>
    </div>
  );
}

export function ListError({ what, error, reset }: { what: string; error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3" role="alert">
      <h1 className="text-2xl font-medium text-ink">Couldn't load {what}.</h1>
      <p className="text-xs text-ink-muted">{error.message}</p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
