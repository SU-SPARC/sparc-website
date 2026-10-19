/* /links — the link-in-bio page.
 *
 * Phone first: most visits are a tap from the Instagram or Discord bio. One
 * 30rem column at every breakpoint; desktop only centres it. Every link gets
 * the same treatment, in the database's sort_order — no featured link, no
 * accent fill, no per-link brand colour, no social icon row (Discord, GitHub
 * and email are entries in the list).
 *
 * Entries come from the links table via getLinks() (published only). The
 * icon column holds a kebab-case lucide name ("message-circle"); unknown or
 * empty names fall back to a plain link glyph rather than failing the page.
 * This is a server component, so the icon lookup costs the browser nothing.
 */

import {
  ArrowUpRight,
  icons,
  Link as LinkIcon,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import NextLink from "next/link";

import { SparcMark } from "@/components/ui/sparc-mark";
import { getLinks } from "@/lib/data";

export const metadata: Metadata = {
  title: "Links",
  description:
    "SPARC's links: Discord, applications, GitHub, LinkedIn and email.",
};

/* ISR: a safety net; admin saves revalidate on demand. */
export const revalidate = 300;

/* The site description (app/layout.tsx), trimmed to its first clause. */
const TAGLINE = "A student-led club at Suffolk University.";

/* "message-circle" → "MessageCircle", then a lookup in lucide's own map. */
function iconFor(name: string | null): LucideIcon {
  if (!name) return LinkIcon;
  const key = name
    .trim()
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join("") as keyof typeof icons;
  return icons[key] ?? LinkIcon;
}

const isExternal = (url: string) => /^https?:\/\//i.test(url);

/* min-h-14 is the 56px target; py-3 lets a two-line row grow past it. */
const ROW =
  "lift flex min-h-14 w-full items-center gap-3 rounded-control border border-line bg-surface-1 px-4 py-3 text-ink transition-colors duration-200 ease-out hover:border-line-strong";

export default async function LinksPage() {
  const links = await getLinks();

  return (
    <main className="mx-auto w-full max-w-[30rem] px-gutter py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <SparcMark className="size-12 text-accent" />
        <h1 className="text-xl font-semibold">SPARC</h1>
        <p className="text-sm text-ink-muted">{TAGLINE}</p>
      </header>

      {links.length > 0 ? (
        <ul className="mt-8 flex flex-col gap-3">
          {links.map((link) => {
            const Icon = iconFor(link.icon);
            const external = isExternal(link.url);
            const body = (
              <>
                <Icon aria-hidden="true" className="size-5 shrink-0" />
                <span className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="text-base font-medium [overflow-wrap:anywhere]">
                    {link.label}
                  </span>
                  {link.description ? (
                    <span className="text-xs text-ink-muted">
                      {link.description}
                    </span>
                  ) : null}
                </span>
                {external ? (
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-ink-muted"
                  />
                ) : null}
              </>
            );
            return (
              <li key={link.id}>
                {link.url.startsWith("/") ? (
                  <NextLink href={link.url} className={ROW}>
                    {body}
                  </NextLink>
                ) : (
                  <a
                    href={link.url}
                    className={ROW}
                    {...(external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    {body}
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 border-y border-line py-4 text-center text-sm text-ink-muted">
          No links right now.{" "}
          <NextLink
            href="/join"
            className="text-accent-text underline underline-offset-4"
          >
            Join SPARC
          </NextLink>
        </p>
      )}
    </main>
  );
}
