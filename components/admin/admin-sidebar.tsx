"use client";

/* Admin shell navigation (docs/DESIGN-BRIEF.md §1).
 *
 * ≥1024px: 15rem sticky sidebar — head (mark, SPARC, ADMIN), "Overview" as
 * a bare first item, then the labelled groups Content / Locator / Review /
 * People in a nav that scrolls on its own. The foot stays pinned: "View
 * site ↗", "Dashboard", the one-line Theme row (§16) and the account block
 * (email, role pill, Sign out POST).
 * <1024px: a 56px sticky top bar (mark, "Admin", current section, MENU)
 * opening the same nav in a left drawer — a native <dialog> via showModal()
 * with its own scroll region. It used to open inside the sticky top bar
 * through <Expand>, and a sticky header taller than the viewport cannot
 * scroll, so Theme, the account block and Sign out were unreachable on
 * phones. Esc, the backdrop, ×, navigation and the viewport growing past
 * 1024px all close it; the page behind is locked while it is open (iOS
 * Safari excepted); focus returns to MENU.
 *
 * Locator items come from KINDS / KIND_CONFIG / kindPath, so a kind renamed
 * in the data layer renames here too, and the top bar's section name is
 * derived from the groups rather than kept by hand.
 *
 * Current item: aria-current="page", bg-surface-2 — matched by prefix, so
 * /admin/events/<id> highlights Events (and /admin/projects/requests
 * highlights Requests, not Projects). */

import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  FolderKanban,
  Handshake,
  Images,
  Inbox,
  LayoutDashboard,
  Link2,
  Newspaper,
  Presentation,
  Trophy,
  UserCog,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { ThemeSwitch } from "@/components/theme-switch";
import { MicroLabel } from "@/components/ui/micro-label";
import { Pill } from "@/components/ui/pill";
import { SparcMark } from "@/components/ui/sparc-mark";
import { signOut } from "@/lib/actions/auth";
import { KIND_CONFIG, KINDS, kindPath, profilePath } from "@/lib/data/locator";
import type { OpportunityKind } from "@/lib/data/types";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; count?: number };
/* No label: a bare top-level item (Overview), rendered without a heading. */
type Group = { label?: string; items: Item[] };

const WIDTH_NORMAL: React.CSSProperties = { fontVariationSettings: '"wdth" var(--wdth-normal)' };

const KIND_ICONS: Record<OpportunityKind, LucideIcon> = {
  internship: Briefcase,
  conference: Presentation,
  networking: Handshake,
  hackathon: Trophy,
};

export interface AdminSidebarProps {
  email: string;
  role: "editor" | "admin";
  pendingRequests: number;
}

function groups(role: "editor" | "admin", pending: number): Group[] {
  const g: Group[] = [
    { items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }] },
    {
      label: "Content",
      items: [
        { href: "/admin/members", label: "Members", icon: Users },
        { href: "/admin/projects", label: "Projects", icon: FolderKanban },
        { href: "/admin/events", label: "Events", icon: CalendarDays },
        { href: "/admin/news", label: "News", icon: Newspaper },
        { href: "/admin/photos", label: "Photos", icon: Images },
        { href: "/admin/links", label: "Links", icon: Link2 },
      ],
    },
    {
      label: "Locator",
      items: [
        ...KINDS.map((k): Item => ({ href: kindPath(k), label: KIND_CONFIG[k].label, icon: KIND_ICONS[k] })),
        { href: profilePath(), label: "Locator profile", icon: UserRound },
      ],
    },
    // /admin/projects/requests is agent G's page.
    { label: "Review", items: [{ href: "/admin/projects/requests", label: "Requests", icon: Inbox, count: pending }] },
  ];
  if (role === "admin") g.push({ label: "People", items: [{ href: "/admin/accounts", label: "Accounts", icon: UserCog }] });
  return g;
}

/* Top-bar section name: the item whose href prefixes the path, longest href
   first so /admin/projects/requests wins over /admin/projects. Built from the
   full (admin) menu so it never drifts from the groups; the exact "/admin"
   item is left out and falls through to "Overview". */
const SECTION_NAMES: Array<[string, string]> = groups("admin", 0)
  .flatMap((group) => group.items)
  .filter((item) => !item.exact)
  .map((item): [string, string] => [item.href, item.label])
  .sort((a, b) => b[0].length - a[0].length);

function useActive() {
  const pathname = usePathname();
  return (item: Item) => {
    if (item.exact) return pathname === item.href;
    if (item.href === "/admin/projects" && pathname.startsWith("/admin/projects/requests")) return false;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };
}

function NavGroups({ role, pending, block }: { role: "editor" | "admin"; pending: number; block?: boolean }) {
  const isActive = useActive();
  return (
    <div className="flex flex-col gap-5">
      {groups(role, pending).map((group) => (
        <div key={group.label ?? "home"} className="flex flex-col gap-1">
          {group.label ? (
            <MicroLabel as="h2" className="px-3">
              {group.label}
            </MicroLabel>
          ) : null}
          <ul className="flex flex-col">
            {group.items.map((item) => {
              const active = isActive(item);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-control px-3 text-sm transition-colors",
                      block ? "min-h-11" : "min-h-9",
                      active ? "bg-surface-2 font-medium text-ink" : "text-ink-muted hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4 flex-none" />
                    <span className="flex-1">{item.label}</span>
                    {item.count ? (
                      <span className="rounded-pill bg-accent-quiet px-2 text-label leading-6 text-accent-text tabular-nums">
                        {item.count}
                        <span className="sr-only"> pending</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function AccountBlock({ email, role, block }: { email: string; role: string; block?: boolean }) {
  return (
    <div className="flex flex-col gap-2 px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm text-ink" title={email}>
          {email}
        </span>
        <Pill className="flex-none uppercase">{role}</Pill>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          className={cn(
            "-ml-2 rounded-control px-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink",
            block ? "min-h-11" : "min-h-8",
          )}
        >
          Sign out
        </button>
      </form>
    </div>
  );
}

/* "Theme" + the Light / Dim / Dark switch (§16). `compact`: one line, label
   at the left and the icon-only switch at the right (the desktop foot);
   otherwise the label sits above a full-width labelled switch (the drawer).
   The label is aria-hidden because the switch is its own "Theme" radiogroup. */
function ThemeBlock({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center justify-between px-3">
        <MicroLabel as="p" aria-hidden="true">
          Theme
        </MicroLabel>
        <ThemeSwitch compact />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <MicroLabel as="p" aria-hidden="true" className="px-3">
        Theme
      </MicroLabel>
      <ThemeSwitch className="w-full" />
    </div>
  );
}

function FootLinks({ block }: { block?: boolean }) {
  const cls = cn(
    "flex items-center gap-2 rounded-control px-3 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink",
    block ? "min-h-11" : "min-h-9",
  );
  return (
    <ul className="flex flex-col">
      <li>
        <Link href="/" className={cls}>
          View site <ArrowUpRight aria-hidden="true" className="size-4" />
        </Link>
      </li>
      <li>
        <Link href="/dashboard" className={cls}>
          Dashboard
        </Link>
      </li>
    </ul>
  );
}

export function AdminSidebar({ email, role, pendingRequests }: AdminSidebarProps) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 flex-none flex-col border-r border-line bg-surface-1 lg:flex">
      <Link href="/admin" className="flex flex-none items-center gap-2 px-6 pt-6 pb-5 text-ink">
        <SparcMark className="h-6 w-auto text-accent" />
        <span className="text-sm font-semibold" style={WIDTH_NORMAL}>
          SPARC
        </span>
        <MicroLabel>Admin</MicroLabel>
      </Link>
      {/* The nav is the scroll region; the head above and foot below stay put. */}
      <nav aria-label="Admin" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <NavGroups role={role} pending={pendingRequests} />
      </nav>
      <div className="flex flex-none flex-col gap-3 border-t border-line px-3 py-4">
        <FootLinks />
        <ThemeBlock compact />
        <AccountBlock email={email} role={role} />
      </div>
    </aside>
  );
}

export function AdminTopbar({ email, role, pendingRequests }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [lastPath, setLastPath] = React.useState(pathname);
  // Navigation closes the drawer: the effect below turns this into close().
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const returnFocus = React.useRef<HTMLElement | null>(null);
  const dialogId = React.useId();
  const section = SECTION_NAMES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] ?? "Overview";

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      // Start on the current page's item (else the first item), not the home link.
      (dialog.querySelector<HTMLElement>('[aria-current="page"]') ?? dialog.querySelector<HTMLElement>("nav a"))?.focus();
    }
    // Lock the page behind the drawer (the backdrop is inert either way; iOS
    // Safari still lets a touch scroll it); the drawer scrolls on its own.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    // The header is display:none from 1024px (lg), and a modal dialog inside
    // a hidden header stays open but invisible — an iPad rotated to landscape
    // would be stuck with an inert page. Close it when the sidebar takes over.
    const wide = window.matchMedia("(min-width: 64rem)");
    const onWide = () => {
      if (wide.matches) dialog.close();
    };
    wide.addEventListener("change", onWide);
    return () => {
      wide.removeEventListener("change", onWide);
      root.style.overflow = previousOverflow;
    };
  }, [open]);

  // Fires for every close path (Esc, backdrop, ×, navigation).
  const handleClose = () => {
    setOpen(false);
    const target = returnFocus.current;
    if (target?.isConnected) setTimeout(() => target.focus(), 0);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface lg:hidden">
      <div className="flex h-14 items-center gap-2 px-gutter">
        <Link href="/admin" className="flex items-center gap-2 text-ink">
          <SparcMark className="h-6 w-auto text-accent" />
          <span className="text-sm font-semibold" style={WIDTH_NORMAL}>
            Admin
          </span>
        </Link>
        <span aria-hidden="true" className="text-ink-faint">
          /
        </span>
        <span className="min-w-0 truncate text-sm text-ink-muted">{section}</span>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={dialogId}
          onClick={() => setOpen((v) => !v)}
          className="ml-auto min-h-11 rounded-control border border-line px-3 text-label text-ink-muted hover:border-line-strong hover:text-ink"
          style={WIDTH_NORMAL}
        >
          MENU
        </button>
      </div>
      {/* Left drawer. The inner panel is the scroll region (not the dialog,
          so a click on its scrollbar is not a backdrop click), and the whole
          menu is reachable however short the viewport. The slide-in is a CSS
          transition from @starting-style; reduced motion is covered by the
          universal prefers-reduced-motion block in globals.css, which
          flattens every transition-duration, so no JS guard is needed here. */}
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-label="Admin menu"
        onClose={handleClose}
        onClick={(e) => {
          // p-0 and a panel that fills the dialog: only a backdrop click has
          // the dialog element itself as its target.
          if (e.target === e.currentTarget) e.currentTarget.close();
        }}
        className={cn(
          "fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(20rem,85vw)] max-w-none overflow-hidden",
          "border-r border-line bg-surface-1 p-0 text-ink backdrop:bg-ink/40 dark:backdrop:bg-surface/75",
          "transition-transform duration-300 ease-drawer translate-x-0 starting:open:-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col overflow-y-auto overscroll-contain">
          <div className="flex h-14 flex-none items-center gap-2 border-b border-line px-gutter">
            <Link href="/admin" className="flex items-center gap-2 text-ink">
              <SparcMark className="h-6 w-auto text-accent" />
              <span className="text-sm font-semibold" style={WIDTH_NORMAL}>
                Admin
              </span>
            </Link>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => dialogRef.current?.close()}
              className="ml-auto grid size-11 place-items-center rounded-control text-ink-muted hover:bg-surface-2 hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          <nav aria-label="Admin" className="flex flex-col gap-4 px-3 py-4">
            <NavGroups role={role} pending={pendingRequests} block />
          </nav>
          <div className="mt-auto flex flex-col gap-3 border-t border-line px-3 py-4">
            <FootLinks block />
            <ThemeBlock />
            <AccountBlock email={email} role={role} block />
          </div>
        </div>
      </dialog>
    </header>
  );
}
