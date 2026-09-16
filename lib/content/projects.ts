// SPARC content layer — projects.
//
// Source of truth: app/projects/page.tsx (the `projects` array, lines 13–56).
// Every value is copy-paste traceable; do not edit by memory. Shape mirrors
// `create table projects` in supabase/schema.sql.
//
// Field mapping from the repo's array:
//   name → title · timeframe → term · description → summary · highlights →
//   highlights · image → cover (same basename, .webp re-export in public/images/)
//   · status "Completed" → 'completed' on all three.
//
// link → repo_url when it is a github.com URL, live_url otherwise. SP-001's
// link is a GitHub repo; SP-002 and SP-003 are live sites.
//
// ref: accession order by term — Spring 2025, Fall 2025, Spring 2026 (SPEC
// "/projects": "Accession IDs SP-001… plus semester"). sort_order follows ref.
// slug: kebab-case of the title — apostrophes removed, then every run of
// remaining non-alphanumerics becomes a single hyphen ("Smart Campus Navigator
// & Club Finder" → 'smart-campus-navigator-club-finder').

import type { Project } from "./types";

export const projects: Project[] = [
  {
    ref: "SP-001",
    slug: "smart-campus-navigator-club-finder",
    title: "Smart Campus Navigator & Club Finder",
    // all three are club group projects per their repo descriptions; no
    // personal projects exist yet.
    kind: "team",
    status: "completed",
    term: "Spring 2025",
    summary:
      "Our first ever group project focused on creating a smart campus navigation system and club finder to enhance student experience.",
    highlights: [
      "Built an interactive campus map and place search experience.",
      "Added club discovery and matching based on student interests.",
      "Presented a complete working prototype with team documentation.",
    ],
    cover: "/images/campus-map-home.webp",
    // TODO(content): 6–10 screenshots per project enable the strip layout (SPEC).
    gallery: [],
    repo_url: "https://github.com/MohammedAlTal/Suffolk_CSMA",
    live_url: null,
    sort_order: 10,
  },
  {
    ref: "SP-002",
    slug: "collegiatex-mobile-app",
    title: "CollegiateX Mobile App",
    kind: "team",
    status: "completed",
    term: "Fall 2025",
    summary:
      "In the fall 2025, Mohammed, the president of SPARC, collaborated with CollegiateX and granted everyone at the club an internship to build their mobile app.",
    highlights: [
      "Collaborated with an external startup in a real internship setting.",
      "Contributed features and UX flows for the CollegiateX mobile app.",
      "Practiced agile teamwork, code reviews, and stakeholder feedback cycles.",
    ],
    cover: "/images/collegiatex-pc-home.webp",
    // TODO(content): 6–10 screenshots per project enable the strip layout (SPEC).
    gallery: [],
    repo_url: null,
    live_url: "https://collegiatex.com/",
    sort_order: 20,
  },
  {
    ref: "SP-003",
    slug: "sparc-website",
    title: "SPARC Website",
    kind: "team",
    status: "completed",
    term: "Spring 2026",
    summary:
      "A group of SPARC members is proposing to build and maintain a public website for the club, showcasing our mission, team, projects, and resources for members. This would be a great opportunity to learn web development and create something that represents SPARC to the wider community.",
    highlights: [
      "Defined the site information architecture and page structure.",
      "Implemented reusable UI components with responsive design.",
      "Planned long-term maintenance and contribution workflow for members.",
    ],
    cover: "/images/sparc-website-home.webp",
    // TODO(content): 6–10 screenshots per project enable the strip layout (SPEC).
    gallery: [],
    repo_url: null,
    live_url: "https://sparc-su.vercel.app",
    sort_order: 30,
  },
];
