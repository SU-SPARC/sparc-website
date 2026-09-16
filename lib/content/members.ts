// SPARC content layer — members.
//
// Source of truth: app/team/page.tsx. Every value is copy-paste traceable; do
// not edit by memory. Shape mirrors `create table members` in supabase/schema.sql.
//
// MERGE: the live /team page renders 18 cards for 12 people — Kanan, Montasir,
// Bexultan, Endi, Allan and Margulan each appear in BOTH the `team` array
// (heading "Team of 2025", page.tsx:244) and the `team2026` array (heading
// "Team of 2026", page.tsx:162). They are merged to one entry each:
//   • `role` / `role_term` come from team2026 ('2026' is the heading's own year
//     string — not '2026–27', which came from the deleted, wrong SQL seed).
//   • their 2025 role from `team` moves into `role_history`.
//
// role_history format: a term-bound office is stored as '<role>, 2025' (year
// from the "Team of 2025" heading). 'Founding Member' is stored bare, matching
// the schema's own example (`role_history text[] ... -- {'Founding Member'}`);
// it is a standing status, not an office held in a particular year.
//
// badges: club-supplied, NOT derived from the repo — see the provenance note at
// the bottom of this header.
//
// photo: same basename as the repo's `image` field, with the .webp re-exports
// in public/images/ (e.g. /mo.jpeg → /images/mo.webp, /monty.png →
// /images/monty.webp). All 12 targets verified present.
//
// class_year: parsed from the 'Class of 20XX' half of the repo's role string.
// slug: kebab-case of `name`.
// sort_order: the six e-board members first, in team2026's own order
// (10,20,30,40,50,60), then everyone else in the `team` array's own order
// (100,110,…160) — less 140, vacated when Margulan moved up to the e-board.
//
// status: club-supplied, confirmed Aug 2026 via the orchestrator (resolves
// PLAN.md §5.1). The four Class-of-2026 members — Mohammed, Sarmad, Kyle and
// Anthony — are alumni; everyone else is current. This is SOURCED DATA, not
// inference from class years: a future member classed 2026 would NOT
// automatically be alumni, so do not derive this field — read it.
//
// badges + participated: club-supplied, confirmed Aug 2026 via the orchestrator
// (resolves the SPEC "Content that does not exist yet" item). Three facts:
//   • all 12 members are founding members;
//   • all 12 except Allan Nguyen did the CollegiateX internship;
//   • all 12 participated in 2025 and 2026.
//
// 'founding' is now CLUB-SUPPLIED STATUS and is no longer derived from the repo
// role strings. This matters, because for five people the two disagree: the repo
// role for Mohammed, Sarmad, Kyle, Endi and Montasir reads President /
// Vice-President / Treasurer / Secretary / Project Lead (Website), never
// "Founding Member". They carry the badge on the club's word, not the repo's.
// Do not "correct" this back to the repo strings, and do not re-derive the field
// from `role` or `role_history` — read it.

import type { Member } from "./types";

export const members: Member[] = [
  // ── e-board, "Team of 2026" (app/team/page.tsx:120–145) ──────────────────
  {
    slug: "kanan-guliyev",
    name: "Kanan Guliyev",
    nickname: null,
    photo: "/images/kanan.webp",
    class_year: 2027,
    status: "current",
    role: "President",
    role_term: "2026",
    role_history: ["Founding Member"],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hey, I'm a Computer Science Student at Suffolk University.",
    linkedin: "https://www.linkedin.com/in/kananguliyev/",
    website: null,
    sort_order: 10,
  },
  {
    slug: "montasir-moyen",
    name: "Montasir Moyen",
    nickname: "Monty",
    photo: "/images/monty.webp",
    class_year: 2027,
    status: "current",
    role: "Vice-President & Project Lead",
    role_term: "2026",
    role_history: ["Project Lead (Website), 2025"],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hello, I'm a Computer Science student at Suffolk University and a Software Developer & Engineer, check out my blogs: montasirmoyen.com/blog",
    linkedin: "https://www.linkedin.com/in/montasirmoyen/",
    website: "https://montasirmoyen.com/",
    sort_order: 20,
  },
  {
    slug: "bexultan-abila",
    name: "Bexultan Abila",
    nickname: null,
    photo: "/images/bex.webp",
    class_year: 2027,
    status: "current",
    role: "Treasurer",
    role_term: "2026",
    role_history: ["Founding Member"],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Aspiring software engineer focused on scalable architecture, clean code, and continuous technical growth.",
    linkedin: "https://www.linkedin.com/in/beksabila/",
    website: null,
    sort_order: 30,
  },
  {
    slug: "endi-fejzollari",
    name: "Endi Fejzollari",
    nickname: null,
    photo: "/images/endi.webp",
    class_year: 2027,
    status: "current",
    role: "Secretary",
    role_term: "2026",
    role_history: ["Secretary, 2025"],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hey, I'm a Computer Science Student at Suffolk University.",
    linkedin: "https://www.linkedin.com/in/endi-fejzollari-716aab181/",
    website: null,
    sort_order: 40,
  },
  {
    slug: "allan-nguyen",
    name: "Allan Nguyen",
    nickname: null,
    photo: "/images/allan.webp",
    class_year: 2027,
    status: "current",
    role: "Social Media Manager",
    role_term: "2026",
    role_history: ["Founding Member"],
    // the one member without the CollegiateX internship (club, Aug 2026)
    badges: ["founding"],
    participated: [2025, 2026],
    bio: "Hey, I'm a Computer Science Student at Suffolk University.",
    linkedin: "https://www.linkedin.com/in/allan-nguyen-b2236529b/",
    website: "https://www.allandng.com/",
    sort_order: 50,
  },
  {
    slug: "margulan-kudaibergen",
    name: "Margulan Kudaibergen",
    nickname: null,
    photo: "/images/margulan.webp",
    class_year: 2028,
    status: "current",
    role: "Network Lead",
    role_term: "2026",
    role_history: ["Founding Member"],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hi, I'm a software engineer studying Computer Science at Suffolk University. I am obsessed with building meaningful products that help people.",
    linkedin: "https://www.linkedin.com/in/margulan-kudaibergen/",
    website: null,
    sort_order: 60,
  },

  // ── "Team of 2025" only (app/team/page.tsx:16–118) ───────────────────────
  {
    slug: "mohammed-khodor-firas-al-tal",
    name: "Mohammed Khodor Firas Al-Tal",
    nickname: null,
    photo: "/images/mo.webp",
    class_year: 2026,
    status: "alumni",
    role: "President",
    role_term: "2025",
    role_history: [],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hey there, I'm an undergraduate researcher in Computer Science and Applied Math at Suffolk University, passionate about AI for health, scientific discovery, and public benefit.",
    linkedin: "https://www.linkedin.com/in/mohammed-al-tal/",
    website: "https://mohammedkhodoraltal.com/",
    sort_order: 100,
  },
  {
    slug: "sarmad-shah",
    name: "Sarmad Shah",
    nickname: null,
    photo: "/images/sarmad.webp",
    class_year: 2026,
    status: "alumni",
    role: "Vice-President",
    role_term: "2025",
    role_history: [],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hey, I'm a Computer Science Student at Suffolk University.",
    linkedin: "https://www.linkedin.com/in/sarmadshah03/",
    website: null,
    sort_order: 110,
  },
  {
    slug: "kyle-erhabor",
    name: "Kyle Erhabor",
    nickname: null,
    photo: "/images/kyle.webp",
    class_year: 2026,
    status: "alumni",
    role: "Treasurer",
    role_term: "2025",
    role_history: [],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hi, I'm a software developer studying Computer Science at Suffolk University in Boston, MA. I spend my days studying and developing software.",
    linkedin: "https://www.linkedin.com/in/kyleerhabor/",
    website: "https://kyleerhabor.com/",
    sort_order: 120,
  },
  {
    slug: "andrew-yuen",
    name: "Andrew Yuen",
    nickname: null,
    photo: "/images/andrew.webp",
    class_year: 2027,
    status: "current",
    role: "Founding Member",
    role_term: "2025",
    role_history: [],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hey, I'm a Computer Science Student at Suffolk University.",
    linkedin: "https://www.linkedin.com/in/andrew-yuen-su/",
    website: null,
    sort_order: 130,
  },
  // 140 is intentionally vacant: Margulan moved to the e-board block above
  // when `Add margu` (382b81e) put him in team2026. Everyone else keeps the
  // `team` array's own order, so the numbers stay traceable to it.
  {
    slug: "anthony-sek",
    name: "Anthony Sek",
    nickname: null,
    photo: "/images/anthony.webp",
    class_year: 2026,
    status: "alumni",
    role: "Founding Member",
    role_term: "2025",
    role_history: [],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hey, I'm a Computer Science Student at Suffolk University.",
    linkedin: "https://www.linkedin.com/in/anthony1sek/",
    website: null,
    sort_order: 150,
  },
  {
    slug: "yunus-abdurahman",
    name: "Yunus Abdurahman",
    nickname: null,
    photo: "/images/yunus.webp",
    class_year: 2027,
    status: "current",
    role: "Founding Member",
    role_term: "2025",
    role_history: [],
    badges: ["founding", "collegiatex"],
    participated: [2025, 2026],
    bio: "Hey, I'm a Computer Science Student at Suffolk University.",
    linkedin: "https://www.linkedin.com/in/yunus-abdurahman/",
    website: null,
    sort_order: 160,
  },
];
