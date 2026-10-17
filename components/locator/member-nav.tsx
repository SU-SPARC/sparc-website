"use client";

/* LocatorMemberNav — the four kinds + "My Locator profile" as a tab row
 * under the "Dashboard / Locator" line (docs/LOCATOR.md, "Members view").
 * Kinds match by prefix so a listing highlights its kind; the profile
 * matches exactly. Same active style as the members top bar. */

import Link from "next/link";
import { usePathname } from "next/navigation";

import { KIND_CONFIG, KINDS, kindPath, profilePath } from "@/lib/data/locator";
import { cn } from "@/lib/utils";

export function LocatorMemberNav() {
  const pathname = usePathname();
  const links = [
    ...KINDS.map((k) => ({ href: kindPath(k, "member"), label: KIND_CONFIG[k].label, exact: false })),
    { href: profilePath("member"), label: "My Locator profile", exact: true },
  ];
  return (
    <nav aria-label="Locator sections" className="border-b border-line">
      <ul className="-mx-gutter flex gap-1 overflow-x-auto px-gutter sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {links.map((l) => {
          const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
          return (
            <li key={l.href} className="flex-none">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex rounded-control px-3 py-[9px] text-sm leading-none whitespace-nowrap transition-colors",
                  active ? "text-ink" : "text-ink-muted hover:bg-surface-1 hover:text-ink",
                )}
              >
                {l.label}
                {active ? (
                  <span aria-hidden="true" className="absolute inset-x-3 -bottom-px h-[2px] rounded-pill bg-accent" />
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
