"use client";

/* Navbar — mark + wordmark + club name, four links, theme control.
 *
 * Translated from design/nav-and-photo-motion.html. That file's custom
 * property names drifted from the token layer (see the correction table in
 * design/COMPONENTS.md); the real semantic tokens are used here.
 *
 * THE MARK IS A LANDING TARGET, NOT DECORATION.
 * S4 flies the hero bolt into [data-nav-mark], so that slot's position must
 * not move for any reason the animation cannot see:
 *   - the header row is a fixed h-16, so the slot is vertically centred at a
 *     constant offset no matter what the lockup text does;
 *   - there is no scroll listener and no scrolled/unscrolled variant, so the
 *     header never changes size or padding as the page moves;
 *   - the subtitle hides under 640px inside the lockup only — the row height
 *     is set by the h-16, not by its contents, so nothing shifts;
 *   - the mobile panel opens BELOW the row, never inside it.
 * [data-nav-wordmark] is the "SPARC" text S4 fades in at ~80% of the travel.
 *
 * The old nav's hover preview cards are gone on purpose: seven routes with
 * an image panel each became five routes, and a preview panel that opens on
 * hover has no touch equivalent.
 *
 * Motion here is transitions on colour only, which the global
 * prefers-reduced-motion block in globals.css already flattens; the panel is
 * the shared <Expand>, whose motion is likewise all-CSS. No JS motion lives
 * in this file — the hero travel is S4's.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Expand } from "@/components/ui/expand";
import { SparcMark } from "@/components/ui/sparc-mark";
import { cn } from "@/lib/utils";

/* The five routes that exist after the merge. Home is the lockup itself, so
   it is listed only for the mobile panel. */
const HOME = { href: "/", label: "Home" };
const LINKS = [
  { href: "/about", label: "About" },
  { href: "/projects", label: "Projects" },
  { href: "/events", label: "Events" },
  { href: "/join", label: "Join" },
];

const PANEL_ID = "nav-menu-panel";

/* globals.css exposes the width axis as a token but no utility for it. */
const WIDTH_NORMAL: React.CSSProperties = {
  fontVariationSettings: '"wdth" var(--wdth-normal)',
};
const WIDTH_CONDENSED: React.CSSProperties = {
  fontVariationSettings: '"wdth" var(--wdth-condensed)',
};

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  /* Close the panel when the route changes — otherwise it stays open over
     the new page after a tap. */
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface">
      <div className="mx-auto max-w-page px-4 sm:px-6 lg:px-8">
        {/* Fixed row height: this is what keeps [data-nav-mark] still. */}
        <div className="flex h-16 items-center gap-4">
          <Link
            href="/"
            aria-current={isActive("/") ? "page" : undefined}
            className="flex min-w-0 shrink-0 items-center gap-[11px] text-ink"
          >
            <span
              data-nav-mark
              className="flex h-[34px] w-auto shrink-0 items-center text-accent"
            >
              <SparcMark className="h-[34px] w-auto" />
            </span>
            <span className="flex min-w-0 flex-col gap-[2px]">
              <span
                data-nav-wordmark
                className="text-base font-semibold leading-none tracking-[0.01em]"
                style={WIDTH_NORMAL}
              >
                SPARC
              </span>
              {/* 11.5px is the ONE sanctioned sub-13px size in the whole
                  site, specified by SPEC for this subtitle only. The 13px
                  floor stands everywhere else — use text-label there. */}
              <span
                className="hidden text-[11.5px] leading-[1.25] tracking-[-0.01em] text-ink-muted sm:block"
                style={WIDTH_CONDENSED}
              >
                Suffolk Programming, AI &amp; Research Club
              </span>
            </span>
          </Link>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:gap-4">
            <nav aria-label="Main" className="hidden lg:block">
              <ul className="flex items-center gap-1">
                {LINKS.map((item) => (
                  <li key={item.href}>
                    <NavLink {...item} active={isActive(item.href)} />
                  </li>
                ))}
              </ul>
            </nav>

            <ThemeToggle />

            {/* Text label, not a hamburger: five destinations do not need an
                icon metaphor. */}
            <button
              type="button"
              aria-expanded={open}
              aria-controls={PANEL_ID}
              onClick={() => setOpen((v) => !v)}
              className="rounded-control border border-line px-3 py-2 text-label text-ink-muted transition-colors hover:border-line-strong hover:text-ink lg:hidden"
              style={WIDTH_NORMAL}
            >
              MENU
            </button>
          </div>
        </div>

        {/* THE shared expand — components/ui/expand.tsx. Not a second one. */}
        <Expand open={open} id={PANEL_ID} className="lg:hidden">
          <nav aria-label="Site" className="pb-4">
            <ul className="flex flex-col gap-1 border-t border-line pt-3">
              {[HOME, ...LINKS].map((item) => (
                <li key={item.href}>
                  <NavLink
                    {...item}
                    active={isActive(item.href)}
                    block
                    onClick={() => setOpen(false)}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </Expand>
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
  block,
  onClick,
}: {
  href: string;
  label: string;
  active: boolean;
  block?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative rounded-control text-sm leading-none transition-colors",
        block ? "flex items-center px-3 py-3" : "inline-flex px-3 py-[9px]",
        active ? "text-ink" : "text-ink-muted hover:bg-surface-1 hover:text-ink",
      )}
    >
      {label}
      {/* Visible active state, paired with aria-current above. */}
      {active && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute rounded-pill bg-accent",
            block
              ? "left-0 top-1/2 h-4 w-[2px] -translate-y-1/2"
              : "inset-x-3 bottom-[3px] h-[2px]",
          )}
        />
      )}
    </Link>
  );
}
