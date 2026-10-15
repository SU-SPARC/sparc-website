"use client";

import Link from "next/link";

import { Button } from "@/components/forms/button";

export default function BoardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-medium text-ink">Couldn&apos;t load this board.</h1>
      <p className="text-xs text-ink-muted">{error.message}</p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
        <Link href="/dashboard/projects" className="self-center text-sm text-ink underline underline-offset-4">
          All projects
        </Link>
      </div>
    </div>
  );
}
