/* Members' Locator shell: the
 * "Dashboard / Locator" line, then the kind tabs; each page renders its own
 * h1 below. The members layout above already requires a session. */

import Link from "next/link";

import { LocatorMemberNav } from "@/components/locator/member-nav";

export default function LocatorLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <p className="text-sm text-ink-muted">
          <Link href="/dashboard" className="hover:text-ink hover:underline">
            Dashboard
          </Link>
          <span aria-hidden="true"> / </span>
          Locator
        </p>
        <LocatorMemberNav />
      </div>
      {children}
    </div>
  );
}
