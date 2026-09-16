/* /join — the merged join + contact page. Server component, no client JS.
 *
 * /contact is deleted; next.config.ts redirects it here (owned by the
 * orchestrator, not touched from this file).
 *
 * CONTENT RULE. Every visible string on this page is lifted from the two
 * pages this one replaces — app/join/page.tsx and app/contact/page.tsx as
 * they stood before this rewrite — or from the approved provenance list
 * (biweekly cadence, "73 Tremont, Room 8065", the Discord invite). Copy is
 * TRIMMED in places; nothing is reworded and nothing is written. Line
 * references below are to those two files at their pre-rewrite state.
 *
 * Two deletions worth naming:
 *  - "…for Spring 2026" is gone from the recruiting line (join:28). The term
 *    was already stale and this page prerenders, so deriving one via
 *    currentTerm() would just bake the build date in instead. The sentence
 *    minus the term is the same sentence.
 *  - "Our regular meeting times are still being finalized" (contact:122) is
 *    stale — the club confirmed biweekly meetings in 73 Tremont, Room 8065,
 *    which is what the primary panel now states. The rest of that paragraph
 *    ("we will share meeting details once they join") went with it for the
 *    same reason.
 *
 * HIERARCHY. Discord is the dominant call to action and the form is
 * subordinate to it, per SPEC "/join": the Discord panel is full-width,
 * accent-tinted, carries the page's only accent-filled control at text-lg,
 * and sits directly under the lead. The Google Form and the questions
 * mailto follow it as small outline links at text-sm — after it, never
 * above it, never filled.
 *
 * The panel is a plain div rather than <SurfaceCard>: cn() is a plain join
 * with no conflict resolution (see components/ui/surface-card.tsx), so a
 * bg-accent-quiet passed through className would race the card's own
 * bg-surface-1 in the cascade rather than beat it. Cards that want the
 * default surface still use the primitive.
 *
 * MOTION. Hover states only, per SPEC. Everything here is a CSS transition,
 * so the universal prefers-reduced-motion block in globals.css already
 * covers it, and Tailwind v4 wraps `hover:` in (hover: hover) and
 * (pointer: fine) itself. No JS-driven motion, no expand — nothing on this
 * page hides content behind a disclosure.
 */

import type { Metadata } from "next";
import Image from "next/image";
import { FaDiscord } from "react-icons/fa";

import { MicroLabel } from "@/components/ui/micro-label";
import { Pill } from "@/components/ui/pill";
import { SurfaceCard } from "@/components/ui/surface-card";

const DISCORD_INVITE = "https://discord.gg/W8veDYAku6";
const CLUB_EMAIL = "sparc@studentorgs.suffolk.edu";
const ADVISOR_EMAIL = "argentilucci@suffolk.edu";
const GITHUB = "https://github.com/SU-SPARC";
/* Verbatim from app/join/page.tsx:33, query string included. */
const FORM =
  "https://docs.google.com/forms/d/e/1FAIpQLScYYJFywXjQNGTlct-dIeZEdtWD25A9lmVbTzhxZm4nOpmlDg/viewform?usp=publish-editor";

export const metadata: Metadata = {
  title: "Join",
  /* app/join/page.tsx:21, verbatim. */
  description:
    "Join SPARC to build and ship real software, explore AI agentic coding, stay on top of tech, and access internship opportunities. All experience levels welcome.",
};

/* The secondary routes and the quiet destinations share one link treatment:
   outline, surface-1, small. It is the not-found route chip, which is
   already the site's "this is a link, not a call to action" control. */
const quietLink =
  "inline-flex items-center gap-2 rounded-control border border-line bg-surface-1 px-4 py-2.5 text-sm text-ink transition-colors duration-200 ease-out hover:border-line-strong";

export default function JoinPage() {
  return (
    <main className="mx-auto flex max-w-page flex-col gap-section px-gutter py-section">
      {/* ── hero ─────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          {/* join:18 */}
          <h1 className="text-3xl font-medium">Join SPARC</h1>
          {/* join:21 */}
          <p className="prose-block text-ink-muted">
            Join SPARC to build and ship real software, explore AI agentic
            coding, stay on top of tech, and access internship opportunities.
            All experience levels welcome.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {/* join:26 */}
            <Pill>Recruiting</Pill>
            {/* join:28, minus the hardcoded term. */}
            <span className="text-sm text-ink-muted">
              We are openly recruiting new members.
            </span>
          </div>
        </div>

        {/* Primary destination. The only accent fill on the page. */}
        <div className="rounded-card bg-accent-quiet p-6 sm:p-8">
          <div className="grid gap-6 md:grid-cols-[3fr_2fr] md:items-start">
            <div className="flex flex-col items-start gap-4">
              {/* contact:54 */}
              <h2 className="text-xl font-medium">Community Server</h2>
              {/* contact:59, trimmed to the destinations it names — the club
                  no longer "planned to start up" a server, it has one. */}
              <p className="max-w-text text-ink-muted">
                Community discussions, project collaboration, and event
                announcements.
              </p>
              {/* contact:62 */}
              <a
                href={DISCORD_INVITE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 rounded-control bg-accent px-6 py-4 text-lg text-on-accent transition-colors duration-200 ease-out hover:bg-accent-hover"
              >
                <FaDiscord aria-hidden className="size-6" />
                Join Discord
              </a>
            </div>

            {/* Cadence and room sit beside the CTA, per SPEC. Both are
                club-confirmed facts, not repo copy. */}
            <div className="flex flex-col gap-3 md:border-l md:border-line md:pl-6">
              {/* Two facts, no invented category words around them, and no
                  colour override on the primitive: cn() is a plain join, so a
                  text-ink passed here would race MicroLabel's own
                  text-ink-muted in the cascade rather than beat it. Muted is
                  the primitive's deliberate default and measures 6.3:1. */}
              <MicroLabel as="p">Biweekly meetings</MicroLabel>
              <MicroLabel as="p">73 Tremont, Room 8065</MicroLabel>
              {/* contact:122, first clause only — the "still being finalized"
                  sentence that followed it is stale and is not carried over. */}
              <p className="text-xs text-ink-muted">
                We typically hold meetings in person on campus, but we are also
                open to virtual or hybrid formats depending on member
                preferences and needs.
              </p>
            </div>
          </div>
        </div>

        {/* Secondary routes: subordinate to Discord by size, weight, fill and
            position. join:37 and join:42. */}
        <div className="flex flex-wrap gap-3">
          <a href={FORM} target="_blank" rel="noreferrer" className={quietLink}>
            Apply
          </a>
          <a href={`mailto:${CLUB_EMAIL}`} className={quietLink}>
            Email us with questions
          </a>
        </div>
      </section>

      {/* ── routed destinations ──────────────────────────────────── */}
      <section className="flex flex-col gap-6">
        {/* contact:18 */}
        <MicroLabel as="h2">Contact</MicroLabel>
        {/* contact:20, trimmed of its opening exclamation. */}
        <p className="prose-block text-ink-muted">
          Whether you have questions about joining, want to propose a project,
          or just want to connect, feel free to reach out through any of the
          channels below.
        </p>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Sponsor / partner routes to the club address by decision, not by
              default: the client confirmed (Aug 2026) that
              sparc@studentorgs.suffolk.edu IS the sponsor/partner contact.
              This is no longer a placeholder. If a president's address is ever
              supplied it is a one-string swap — CLUB_EMAIL above is shared
              with the Press route, so give the sponsor route its own constant
              rather than editing that one. */}
          <SurfaceCard as="li" className="lift flex flex-col gap-3">
            <h3 className="text-base font-medium">Sponsor / partner</h3>
            <p className="flex-1 text-sm text-ink-muted">{CLUB_EMAIL}</p>
            {/* contact:45 */}
            <a href={`mailto:${CLUB_EMAIL}`} className={quietLink}>
              Email SPARC
            </a>
          </SurfaceCard>

          <SurfaceCard as="li" className="lift flex flex-col gap-3">
            <h3 className="text-base font-medium">Press</h3>
            {/* contact:43 */}
            <p className="flex-1 text-sm text-ink-muted">
              Contact us anytime at our official club email address:{" "}
              {CLUB_EMAIL}
            </p>
            {/* contact:45 */}
            <a href={`mailto:${CLUB_EMAIL}`} className={quietLink}>
              Email SPARC
            </a>
          </SurfaceCard>

          <SurfaceCard as="li" className="lift flex flex-col gap-3">
            {/* contact:71 */}
            <h3 className="text-base font-medium">GitHub</h3>
            {/* contact:76 */}
            <p className="flex-1 text-sm text-ink-muted">
              Check out our projects and contribute!
            </p>
            {/* contact:79 */}
            <a
              href={GITHUB}
              target="_blank"
              rel="noreferrer"
              className={quietLink}
            >
              Contribute
            </a>
          </SurfaceCard>

          <SurfaceCard as="li" className="sm:col-span-2 lg:col-span-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="relative size-24 shrink-0 overflow-hidden rounded-card">
                <Image
                  src="/images/professor-anthony.webp"
                  alt="Professor Anthony Gentilucci"
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col items-start gap-3">
                {/* contact:88 */}
                <h3 className="text-base font-medium">Club Advisor</h3>
                {/* contact:103 */}
                <p className="max-w-text text-sm text-ink-muted">
                  Reach out to our club advisor, Professor Anthony Gentilucci
                  for any questions related to club operations, event planning,
                  or general inquiries about SPARC.
                </p>
                {/* contact:108 */}
                <a href={`mailto:${ADVISOR_EMAIL}`} className={quietLink}>
                  Email Professor Gentilucci
                </a>
              </div>
            </div>
          </SurfaceCard>
        </ul>
      </section>

      {/* ── what joining involves ────────────────────────────────── */}
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 border-t border-line pt-6">
          {/* join:60 */}
          <h2 className="text-xl font-medium">Recruitment Process</h2>
          {/* join:61 */}
          <MicroLabel as="p">How joining works</MicroLabel>
          {/* join:65 */}
          <p className="prose-block text-ink-muted">
            Simply fill out our application form with some basic info about
            yourself, your interests, and any relevant experience. Our
            leadership team will review applications on a rolling basis and
            follow up with next steps. We typically hold an info session and/or
            interview to get to know applicants better and answer any
            questions. We want to make the process as welcoming and
            low-pressure as possible, so don&apos;t worry about having tons of
            experience, we value curiosity and enthusiasm above all.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SurfaceCard className="flex flex-col gap-3">
            {/* join:74 */}
            <h2 className="text-base font-medium">Who should apply</h2>
            {/* join:77 */}
            <p className="text-sm text-ink-muted">
              Join SPARC if you want to build real software, work with AI tools,
              stay current with tech, or break into the industry through
              internships. We welcome students from all majors, interest and
              drive matter more than background.
            </p>
          </SurfaceCard>

          <SurfaceCard className="flex flex-col gap-3">
            {/* join:82 */}
            <h2 className="text-base font-medium">Time commitment</h2>
            {/* join:85 */}
            <p className="text-sm text-ink-muted">
              We understand everyone has different schedules and commitments, so
              we don&apos;t require a specific time commitment. We encourage
              members to get involved in whatever way works best for them,
              whether that&apos;s attending meetings, contributing to projects,
              or just participating in discussions. We do ask that members stay
              engaged and communicate with the team about their availability and
              interests.
            </p>
          </SurfaceCard>

          <SurfaceCard className="flex flex-col gap-3">
            {/* join:90 */}
            <h2 className="text-base font-medium">Accessibility</h2>
            {/* join:93 */}
            <p className="text-sm text-ink-muted">
              SPARC is committed to being welcoming and accessible to all
              students. No prior experience is required to join, and we offer
              recorded sessions and mentorship to support your learning and
              growth.
            </p>
          </SurfaceCard>
        </div>
      </section>
    </main>
  );
}
