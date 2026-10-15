/* /preview — static sample records for the design catalogue.
 *
 * The catalogue must render with no database: it is how the next e-board sees
 * what the design system contains, including on a fresh clone with no
 * Supabase running. So the exhibits read these typed fixtures, never lib/data
 * getters. Copied from the club's real content (the seed source) as of
 * October 2026; they are specimens, not the live roster, and do not need to
 * follow later edits.
 *
 * Shapes are the data layer's own types (lib/data/types), so a schema change
 * that breaks a component breaks this file's typecheck too.
 *
 * Photos: the one portrait that stays in the repo (public/advisor.webp)
 * stands in for every member photo, so no exhibit depends on Storage or on an
 * asset slated for deletion. Event instants carry an explicit New York offset
 * (midnight, EST), so they are the same instant on the server and in the
 * browser. */

import type { ImageRef, Member, Project, SparcEvent } from "@/lib/data/types";

const PORTRAIT: ImageRef = {
  src: "/advisor.webp",
  thumb: "/advisor.webp",
  width: 400,
  height: 400,
  blur: null,
  alt: "",
};

export const members: Member[] = [
  {
    id: "fixture-member-1",
    slug: "montasir-moyen",
    name: "Montasir Moyen",
    nickname: "Monty",
    photo: PORTRAIT,
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
    eboard: true,
    sort_order: 20,
  },
  {
    id: "fixture-member-2",
    slug: "mohammed-al-tal",
    name: "Mohammed Al-Tal",
    nickname: null,
    photo: PORTRAIT,
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
    eboard: false,
    sort_order: 100,
  },
  {
    id: "fixture-member-3",
    slug: "sarmad-shah",
    name: "Sarmad Shah",
    nickname: null,
    photo: null,
    class_year: 2026,
    status: "alumni",
    role: "Vice-President",
    role_term: "2025",
    role_history: [],
    badges: ["founding"],
    participated: [2025, 2026],
    bio: "Hey, I'm a Computer Science Student at Suffolk University.",
    linkedin: "https://www.linkedin.com/in/sarmadshah03/",
    website: null,
    eboard: false,
    sort_order: 110,
  },
];

export const events: SparcEvent[] = [
  {
    id: "fixture-event-1",
    ref: "#01",
    slug: "professor-z-huangs-guest-lecture-on-ml",
    title: "Professor Z. Huang's Guest Lecture on ML",
    kind: "Guest",
    starts_at: new Date("2026-02-05T00:00:00-05:00"),
    location: "73 Tremont Room 8065",
    description:
      "We had the privilege of having Professor Z. Huang, a professor in the Computer Science department, for a guest lecture on machine learning research. Professor Huang shared insights from their latest work in natural language processing and engaged in a lively Q&A session with our members. It was an inspiring event that sparked great discussions and motivated many of us to dive deeper into ML research.",
    recording_url: null,
    cover: null,
  },
  {
    id: "fixture-event-2",
    ref: "#02",
    slug: "sparc-website-intro-panel",
    title: "SPARC Website Intro Panel",
    kind: "Panel",
    starts_at: new Date("2026-02-12T00:00:00-05:00"),
    location: "73 Tremont Room 8065",
    description:
      "Join us for an introductory panel discussion about the SPARC website and how members can get involved.",
    recording_url: null,
    cover: null,
  },
  {
    id: "fixture-event-3",
    ref: "#03",
    slug: "sparc-website-development-i",
    title: "SPARC Website Development I",
    kind: "Development",
    starts_at: new Date("2026-03-31T00:00:00-04:00"),
    location: "73 Tremont Room 8065",
    description:
      "Part 1: Join us for a dev discussion on the development of the SPARC website, where members will share their ideas and plans for building and maintaining the site.",
    recording_url: null,
    cover: null,
  },
];

export const projects: Project[] = [
  {
    id: "fixture-project-1",
    ref: "SP-001",
    slug: "smart-campus-navigator-club-finder",
    title: "Smart Campus Navigator & Club Finder",
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
    cover: null,
    gallery: [],
    repo_url: "https://github.com/MohammedAlTal/Suffolk_CSMA",
    live_url: null,
    sort_order: 10,
    methodology: "kanban",
    supervisor: null,
  },
  {
    id: "fixture-project-2",
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
    ],
    cover: null,
    gallery: [],
    repo_url: null,
    live_url: "https://collegiatex.com/",
    sort_order: 20,
    methodology: "kanban",
    supervisor: null,
  },
];
