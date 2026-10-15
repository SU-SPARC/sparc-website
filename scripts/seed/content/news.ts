// SPARC content layer — news.
//
// Source of truth: the `newsletter` array in the pre-S4-rewrite home page,
// app/page.tsx lines 8–23, recovered with:
//
//     git show 0799ca5^:app/page.tsx
//
// (0799ca5 is "S4 home: orbit draw into a scroll-linked bolt travel, then photo
// drift", the commit that deleted the section.) Every value is copy-paste
// traceable to that blob; do not edit by memory.
//
// News has no table in supabase/schema.sql — see the `News` type in ./types.ts.
//
// date: the repo stored a display string ('Fri, 24 Apr 2026'). Stored here as a
// local-midnight Date via the constructor, never an ISO date-only string parse,
// which resolves as UTC and can shift the calendar day. The weekday named in
// each repo string was checked against the constructed date and all three
// agree: 24 Apr 2026 is a Friday, 21 Apr 2026 a Tuesday, 14 Mar 2026 a
// Saturday. Render the weekday from the Date rather than re-typing it.
//
// image: same basename as the repo's `image` field, pointing at the .webp
// re-exports in public/images/ (/sparc-vc-5.jpeg → /images/sparc-vc-5.webp).
// All three targets verified present.
//
// slug: kebab-case of the title — apostrophes removed, then every run of
// remaining non-alphanumerics becomes a single hyphen.
//
// Order: newest first, exactly as the old array was ordered.

import type { News } from "./types";

export const news: News[] = [
  {
    slug: "sparc-hosts-vibe-coding-contest",
    title: "SPARC hosts vibe coding contest",
    // repo string: "Fri, 24 Apr 2026" — verified Friday.
    date: new Date(2026, 3, 24),
    image: "/images/sparc-vc-5.webp",
  },
  {
    slug: "sparc-elections-held-for-2026-2027",
    title: "SPARC elections held for 2026-2027",
    // repo string: "Tue, 21 Apr 2026" — verified Tuesday.
    date: new Date(2026, 3, 21),
    image: "/images/sparc-vc-10.webp",
  },
  {
    // The client's mockup shortens this to "Members working on AI projects".
    // The repo string wins — the title is verbatim from the recovered array.
    slug: "sparc-members-working-on-ai-projects",
    title: "SPARC members working on AI projects",
    // repo string: "Sat, 14 Mar 2026" — verified Saturday.
    date: new Date(2026, 2, 14),
    image: "/images/sparc-vc-9.webp",
  },
];
