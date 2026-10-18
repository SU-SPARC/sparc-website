"use client";

/* Signed-in members shell top bar (docs/DESIGN-BRIEF.md §6): 56px, sticky.
 * Mark + "SPARC" → /dashboard; Dashboard · Projects · Locator · Profile
 * (+ Admin for editors) with the public navbar's active style; right:
 * "View site", the icon-only theme switch (§16) and the account menu.
 * ≤1023px the nav collapses into the shared <Expand>, with the labelled
 * theme switch at the bottom.
 *
 * Active matching: /dashboard is exact; the others match by prefix, so
 * /dashboard/projects/<id> highlights Projects. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { ThemeSwitch } from "@/components/theme-switch";
import { Expand } from "@/components/ui/expand";
import { MicroLabel } from "@/components/ui/micro-label";
import { SparcMark } from "@/components/ui/sparc-mark";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

import { AccountMenu } from "./account-menu";

const WIDTH_NORMAL: React.CSSProperties = { fontVariationSettings: '"wdth" var(--wdth-normal)' };
const PANEL_ID = "members-nav-panel";

export function MembersTopbar({ email, role, isEditor }: { email: string; role: string; isEditor: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [lastPath, setLastPath] = React.useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  const links = [
    { href: "/dashboard", label: "Dashboard", exact: true },
    // /dashboard/projects is built by agent G (project boards); it 404s
    // until that lands.
    { href: "/dashboard/projects", label: "Projects" },
    // Read-only Locator for every member (docs/LOCATOR.md, "Members view").
    { href: "/dashboard/locator", label: "Locator" },
    { href: "/dashboard/profile", label: "Profile" },
    ...(isEditor ? [{ href: "/admin", label: "Admin" }] : []),
  ];
  const isActive = (l: { href: string; exact?: boolean }) =>
    l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <div className="mx-auto max-w-page px-gutter">
        <div className="flex h-14 items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 text-ink">
            <SparcMark className="h-6 w-auto text-accent" />
            <span className="text-sm font-semibold" style={WIDTH_NORMAL}>
              SPARC
            </span>
          </Link>
          <nav aria-label="Members" className="ml-4 hidden lg:block">
            <ul className="flex items-center gap-1">
              {links.map((l) => (
                <li key={l.href}>
                  <NavItem href={l.href} label={l.label} active={isActive(l)} />
                </li>
              ))}
            </ul>
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/"
              className="hidden min-h-9 items-center rounded-control px-3 text-sm text-ink-muted hover:bg-surface-1 hover:text-ink sm:inline-flex"
            >
              View site
            </Link>
            <div className="hidden items-center gap-1 lg:flex">
              <ThemeSwitch compact />
              <AccountMenu email={email} role={role} />
            </div>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={PANEL_ID}
              onClick={() => setOpen((v) => !v)}
              className="min-h-11 rounded-control border border-line px-3 text-label text-ink-muted hover:border-line-strong hover:text-ink lg:hidden"
              style={WIDTH_NORMAL}
            >
              MENU
            </button>
          </div>
        </div>
        <Expand open={open} id={PANEL_ID} className="lg:hidden">
          <nav aria-label="Members menu" className="pb-4">
            <ul className="flex flex-col gap-1 border-t border-line pt-3">
              {links.map((l) => (
                <li key={l.href}>
                  <NavItem href={l.href} label={l.label} active={isActive(l)} block />
                </li>
              ))}
              <li>
                <NavItem href="/" label="View site" active={false} block />
              </li>
            </ul>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <span className="min-w-0 truncate text-sm text-ink-muted" title={email}>
                {email}
              </span>
              <SignOutButton />
            </div>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
              <MicroLabel as="p" aria-hidden="true">
                Theme
              </MicroLabel>
              <ThemeSwitch />
            </div>
          </nav>
        </Expand>
      </div>
    </header>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="min-h-11 rounded-control px-3 text-sm text-ink-muted hover:bg-surface-1 hover:text-ink"
      >
        Sign out
      </button>
    </form>
  );
}

function NavItem({ href, label, active, block }: { href: string; label: string; active: boolean; block?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-control text-sm leading-none transition-colors",
        block ? "flex min-h-11 items-center px-3" : "inline-flex px-3 py-[9px]",
        active ? "text-ink" : "text-ink-muted hover:bg-surface-1 hover:text-ink",
      )}
    >
      {label}
      {active ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute rounded-pill bg-accent",
            block ? "top-1/2 left-0 h-4 w-[2px] -translate-y-1/2" : "inset-x-3 bottom-[3px] h-[2px]",
          )}
        />
      ) : null}
    </Link>
  );
}
