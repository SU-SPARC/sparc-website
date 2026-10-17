"use client";

/* Admin shell navigation (docs/DESIGN-BRIEF.md §1).
 *
 * ≥1024px: 15rem sticky sidebar — head (mark, SPARC, ADMIN), groups
 * Overview / Content / Locator / Review / People, foot with "View site ↗",
 * "Dashboard" and the account block (email, role pill, Sign out POST).
 * <1024px: a 56px sticky top bar (mark, "Admin", current section, Menu)
 * opening the same nav in the shared <Expand>; it closes on navigation.
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
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { Expand } from "@/components/ui/expand";
import { MicroLabel } from "@/components/ui/micro-label";
import { Pill } from "@/components/ui/pill";
import { SparcMark } from "@/components/ui/sparc-mark";
import { signOut } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: LucideIcon; exact?: boolean; count?: number };
type Group = { label: string; items: Item[] };

const WIDTH_NORMAL: React.CSSProperties = { fontVariationSettings: '"wdth" var(--wdth-normal)' };

export interface AdminSidebarProps {
  email: string;
  role: "editor" | "admin";
  pendingRequests: number;
}

function groups(role: "editor" | "admin", pending: number): Group[] {
  const g: Group[] = [
    { label: "Overview", items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true }] },
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
        { href: "/admin/locator/internships", label: "Internships", icon: Briefcase },
        { href: "/admin/locator/conferences", label: "Conferences", icon: Presentation },
        { href: "/admin/locator/networking", label: "Networking", icon: Handshake },
        { href: "/admin/locator/hackathons", label: "Hackathons", icon: Trophy },
        { href: "/admin/locator/profile", label: "Locator profile", icon: UserRound },
      ],
    },
    // /admin/projects/requests is agent G's page.
    { label: "Review", items: [{ href: "/admin/projects/requests", label: "Requests", icon: Inbox, count: pending }] },
  ];
  if (role === "admin") g.push({ label: "People", items: [{ href: "/admin/accounts", label: "Accounts", icon: UserCog }] });
  return g;
}

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
        <div key={group.label} className="flex flex-col gap-1">
          <MicroLabel as="h2" className="px-3">
            {group.label}
          </MicroLabel>
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
    <aside className="sticky top-0 hidden h-dvh w-60 flex-none flex-col overflow-y-auto border-r border-line bg-surface-1 lg:flex">
      <Link href="/admin" className="flex items-center gap-2 px-6 pt-6 pb-5 text-ink">
        <SparcMark className="h-6 w-auto text-accent" />
        <span className="text-sm font-semibold" style={WIDTH_NORMAL}>
          SPARC
        </span>
        <MicroLabel>Admin</MicroLabel>
      </Link>
      <nav aria-label="Admin" className="flex-1 px-3">
        <NavGroups role={role} pending={pendingRequests} />
      </nav>
      <div className="flex flex-col gap-3 border-t border-line px-3 py-4">
        <FootLinks />
        <AccountBlock email={email} role={role} />
      </div>
    </aside>
  );
}

const SECTION_NAMES: Array<[string, string]> = [
  ["/admin/projects/requests", "Requests"],
  ["/admin/members", "Members"],
  ["/admin/projects", "Projects"],
  ["/admin/events", "Events"],
  ["/admin/news", "News"],
  ["/admin/photos", "Photos"],
  ["/admin/links", "Links"],
  ["/admin/locator/profile", "Locator profile"],
  ["/admin/locator/internships", "Internships"],
  ["/admin/locator/conferences", "Conferences"],
  ["/admin/locator/networking", "Networking"],
  ["/admin/locator/hackathons", "Hackathons"],
  ["/admin/accounts", "Accounts"],
];

export function AdminTopbar({ email, role, pendingRequests }: AdminSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [lastPath, setLastPath] = React.useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  const section = SECTION_NAMES.find(([p]) => pathname === p || pathname.startsWith(`${p}/`))?.[1] ?? "Overview";

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
          aria-expanded={open}
          aria-controls="admin-nav-panel"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto min-h-11 rounded-control border border-line px-3 text-label text-ink-muted hover:border-line-strong hover:text-ink"
          style={WIDTH_NORMAL}
        >
          MENU
        </button>
      </div>
      <Expand open={open} id="admin-nav-panel" className="px-gutter">
        <nav aria-label="Admin menu" className="flex flex-col gap-4 border-t border-line pt-4 pb-5">
          <NavGroups role={role} pending={pendingRequests} block />
          <div className="flex flex-col gap-3 border-t border-line pt-3">
            <FootLinks block />
            <AccountBlock email={email} role={role} block />
          </div>
        </nav>
      </Expand>
    </header>
  );
}
