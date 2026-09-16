/* 404. Server component.
 *
 * Martian only — no poster face. Ultra's three sanctioned appearances are the
 * hero, the footer wordmark and the /about statement; a 404 is not one of
 * them, and the /preview exemption covers the specimen page only.
 *
 * Copy is factual UI chrome and nothing else: no tagline, no joke, no invented
 * voice. The route list is the site's five real pages.
 *
 * No metadata export — not-found.tsx does not support one. The root layout's
 * title template covers it.
 */

import Link from "next/link";

import { MicroLabel } from "@/components/ui/micro-label";

const ROUTES = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/events", label: "Events" },
  { href: "/projects", label: "Projects" },
  { href: "/join", label: "Join" },
];

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-page flex-col justify-center px-gutter py-section">
      <MicroLabel as="p" className="block">
        404
      </MicroLabel>
      <h1 className="mt-2 text-3xl font-medium">Page not found</h1>
      <p className="mt-3 max-w-text text-ink-muted">
        This URL does not match any page on this site.
      </p>

      <nav aria-label="Site" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          {ROUTES.map((route) => (
            <li key={route.href}>
              <Link
                href={route.href}
                className="inline-block rounded-control border border-line bg-surface-1 px-3 py-2 text-sm text-ink transition-colors duration-200 ease-out hover:border-line-strong"
              >
                {route.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
