/* Minimal chrome for sign-in, forgot password and set password
 * (docs/DESIGN-BRIEF.md §10): no navbar, a "← SPARC" link top-left, the
 * mark above a centred card. Under 640px the card loses its border and
 * background so fields run edge to edge within the gutter. */

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { SparcMark } from "@/components/ui/sparc-mark";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative min-h-dvh">
      <Link
        href="/"
        className="absolute top-4 left-4 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-sm text-ink-muted hover:text-ink sm:top-6 sm:left-6"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        SPARC
      </Link>
      <main className="grid min-h-dvh place-items-center px-gutter py-16">
        <div className="flex w-full max-w-[24rem] flex-col items-center gap-6">
          <SparcMark className="h-8 w-auto text-accent" />
          <div className="w-full sm:rounded-card sm:border sm:border-line sm:bg-surface-1 sm:p-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
