/* /projects — server shell.
 *
 * Carries the metadata, the heading, the CTA and the ordering; everything that
 * needs an event handler lives in ./project-index.
 *
 * CONTENT RULE. Nothing on this page is written from memory. The three
 * projects come from lib/content/projects.ts; the two blocks of prose below
 * are lifted from the page this replaces (see the SOURCE comments). The old
 * page's second lede ("Catalog" + "What we have built so far…", old lines
 * 79–82) restated the first, and its /sparc-projects banner was scenery for a
 * card grid, so both are dropped — no copy is rewritten, only unused.
 */

import type { Metadata } from "next";

import { MicroLabel } from "@/components/ui/micro-label";
import { SurfaceCard } from "@/components/ui/surface-card";
import { projects } from "@/lib/content/projects";

import { ProjectIndex } from "./project-index";

/* SOURCE: app/projects/page.tsx@f4c7e1a:63-65 (the page lede). Doubles as the
   meta description — it is the sentence the club already uses to describe this
   page, so the two cannot drift. */
const LEDE =
  "Software built and shipped by SPARC members. Every project is a real product with real users, we collaborate, iterate, and launch things that live beyond the classroom.";

/* SOURCE: app/projects/page.tsx@f4c7e1a:147-158 — title, description line,
   body and mailto, verbatim. Kept because it is a working call to action. */
const PROPOSE = {
  title: "Propose a Project",
  kicker: "How members can pitch ideas",
  body: "Have an idea for a product or tool? We encourage all members to pitch projects, whether it's a small utility, a mobile app, or something bigger. Email us with your idea and a brief motivation. We review proposals on a rolling basis and help you turn ideas into shipped software.",
  action: "Email SPARC",
  href: "mailto:sparc@studentorgs.suffolk.edu",
};

export const metadata: Metadata = {
  title: "Projects",
  description: LEDE,
};

export default function ProjectsPage() {
  /* Accession order — SP-001 first. sort_order is defined to follow ref, so
     sorting on it is sorting on the accession id without parsing a string. */
  const catalogue = [...projects].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <main className="mx-auto max-w-page px-gutter py-section">
      <header className="max-w-text">
        <h1 className="text-2xl font-medium sm:text-3xl">Projects</h1>
        <p className="mt-4 text-ink-muted">{LEDE}</p>
      </header>

      {/* TODO(content): filter row (Team/Personal) returns when a personal
          project exists — FilterChip is ready. Omitted rather than built:
          every project is kind:'team' today, so PERSONAL would read (0) and
          SPEC hides a zero filter, which leaves a lone TEAM chip that filters
          nothing. Adding it back is a render change, not a data change. */}

      <div className="mt-12 lg:mt-16">
        <ProjectIndex projects={catalogue} />
      </div>

      {/* SurfaceCard takes no landmark element, so the <section> is outside it.
          padded={false} + p-6 rather than className="p-6": cn() is a plain
          join, so a padding class passed alongside the default p-4 would race
          it in the cascade. */}
      <section className="mt-section">
        <SurfaceCard padded={false} className="p-6">
          <MicroLabel as="p">{PROPOSE.kicker}</MicroLabel>
          <h2 className="mt-2 text-xl font-medium">{PROPOSE.title}</h2>
          <p className="mt-3 max-w-text text-sm text-ink-muted">
            {PROPOSE.body}
          </p>
          <p className="mt-4">
            <a
              href={PROPOSE.href}
              className="text-sm text-accent-text underline underline-offset-4"
            >
              {PROPOSE.action}
            </a>
          </p>
        </SurfaceCard>
      </section>
    </main>
  );
}
