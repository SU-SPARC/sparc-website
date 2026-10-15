// SPARC content layer — events and recordings.
//
// Source of truth: app/events/page.tsx (`pastHighlights` lines 23–48,
// `pastRecordings` lines 50–72). Every value is copy-paste traceable; do not
// edit by memory. Shape mirrors `create table events` in supabase/schema.sql.
//
// Field mapping from the repo's arrays: title → title · type → kind ·
// location → location · description → description (verbatim, not rewritten) ·
// date → starts_at.
//
// ref: '#01'–'#03' ascending by date, so the list reads as a record that
// continues (SPEC "/events"). Feb 5 → #01, Feb 12 → #02, Mar 31 → #03. The
// repo lists them newest-first; this array is in ref order.
//
// slug: kebab-case of the title — apostrophes removed, then every run of
// remaining non-alphanumerics becomes a single hyphen ("Professor Z. Huang's
// Guest Lecture on ML" → 'professor-z-huangs-guest-lecture-on-ml').

import type { Recording, SparcEvent } from "./types";

export const events: SparcEvent[] = [
  {
    ref: "#01",
    slug: "professor-z-huangs-guest-lecture-on-ml",
    title: "Professor Z. Huang's Guest Lecture on ML",
    kind: "Guest",
    // TODO(content): time-of-day unknown; repo records dates only. Midnight
    // local keeps ordering and upcoming-vs-past derivation correct. Built with
    // the Date constructor, not an ISO string parse — an ISO date-only string
    // parses as UTC and can shift the calendar day.
    starts_at: new Date(2026, 1, 5),
    location: "73 Tremont Room 8065",
    description:
      "We had the privilege of having Professor Z. Huang, a professor in the Computer Science department, for a guest lecture on machine learning research. Professor Huang shared insights from their latest work in natural language processing and engaged in a lively Q&A session with our members. It was an inspiring event that sparked great discussions and motivated many of us to dive deeper into ML research.",
    // no recording is attributably linked to any event; see recordings[] below.
    recording_url: null,
  },
  {
    ref: "#02",
    slug: "sparc-website-intro-panel",
    title: "SPARC Website Intro Panel",
    kind: "Panel",
    // TODO(content): time-of-day unknown; repo records dates only.
    starts_at: new Date(2026, 1, 12),
    location: "73 Tremont Room 8065",
    description:
      "Join us for an introductory panel discussion about the SPARC website and how members can get involved.",
    // no recording is attributably linked to any event; see recordings[] below.
    recording_url: null,
  },
  {
    ref: "#03",
    slug: "sparc-website-development-i",
    title: "SPARC Website Development I",
    kind: "Development",
    // TODO(content): time-of-day unknown; repo records dates only.
    starts_at: new Date(2026, 2, 31),
    location: "73 Tremont Room 8065",
    description:
      "Part 1: Join us for a dev discussion on the development of the SPARC website, where members will share their ideas and plans for building and maintaining the site. This is a great opportunity to get involved in web development and contribute to our online presence!",
    // no recording is attributably linked to any event; see recordings[] below.
    recording_url: null,
  },
];

/**
 * The three Zoom recordings, verbatim from `pastRecordings`. They ship as their
 * own list rather than on `events.recording_url`: their dates (Feb 26 / Mar 24 /
 * Apr 3) match none of the three events (Feb 5 / Feb 12 / Mar 31) and nothing
 * in the repo maps one to the other. Attaching them would be a guess.
 */
export const recordings: Recording[] = [
  {
    title: "Meeting 1",
    // TODO(content): time-of-day unknown; repo records dates only.
    date: new Date(2026, 1, 26),
    kind: "Zoom Recording",
    link: "https://suffolk.zoom.us/rec/play/YM0vPAyEnmg06qQFb73LIOqeUnd9X67yeQSyNJXdzkEwY0vVwo9RndIrFkl0rmV4UJTNAsH_mx9T8jj5.YWen7KysJWaujsOP?eagerLoadZvaPages=sidemenu.billing.plan_management&accessLevel=meeting&canPlayFromShare=true&from=share_recording_detail&continueMode=true&oldStyle=true&componentName=rec-play&originRequestUrl=https%3A%2F%2Fsuffolk.zoom.us%2Frec%2Fshare%2FjGnuwrQ-G0zXyDXA59_caQ3csajOglqWP7PbkDq0uKWIp-dY-Ty_vTLrIay41wCv.f6L6cPvH2Zs29L60",
    description:
      "Development meeting recording covering project updates and implementation discussion.",
  },
  {
    title: "Meeting 2",
    // TODO(content): time-of-day unknown; repo records dates only.
    date: new Date(2026, 2, 24),
    kind: "Zoom Recording",
    link: "https://suffolk.zoom.us/rec/play/OVjfXxrQKRNvOOhjp7zAcx5pHCTUHQ3w2FhEN0SRORkWo7BcFtoH3edi0NKLOeO4xyrcy3jBIX4PxW_n.9Wg9uEz-vEWMVDfa?eagerLoadZvaPages=sidemenu.billing.plan_management&accessLevel=meeting&canPlayFromShare=true&from=share_recording_detail&continueMode=true&oldStyle=true&componentName=rec-play&originRequestUrl=https%3A%2F%2Fsuffolk.zoom.us%2Frec%2Fshare%2FdTUmT8tGpGdRxRpJPIiAIOEHpPA9us7CADcmqsHNAOmGqovD0qOOh9ZsQA_VcujY.BjJrVRW8NNpaCBAk",
    description:
      "Development meeting recording focused on planning and next milestones.",
  },
  {
    title: "Meeting 3",
    // TODO(content): time-of-day unknown; repo records dates only.
    date: new Date(2026, 3, 3),
    kind: "Zoom Recording",
    link: "https://suffolk.zoom.us/rec/share/6FIftvYGrz3OemUrGQOm-ShzaOKu4hJSZqD75zzHDJvbY33wlDhM50ceavXfR_jW.JF2MxqyOxNq1Aks3",
    description:
      "Coding and implementation meeting recording where we worked on the website's frontend development tasks.",
  },
];

// ── derived helpers ──────────────────────────────────────────────────────
// Pure, and `now` is always a parameter. Never call Date.now() at module scope:
// these run at build time in a static export, so a module-scope clock would bake
// the build date into the output.

/** Events at or after `now`, soonest first. */
export function upcoming(list: SparcEvent[], now: Date): SparcEvent[] {
  return list
    .filter((event) => event.starts_at.getTime() >= now.getTime())
    .sort((a, b) => a.starts_at.getTime() - b.starts_at.getTime());
}

/** Events before `now`, most recent first. */
export function past(list: SparcEvent[], now: Date): SparcEvent[] {
  return list
    .filter((event) => event.starts_at.getTime() < now.getTime())
    .sort((a, b) => b.starts_at.getTime() - a.starts_at.getTime());
}

/**
 * A "Spring 2026"-style label derived from a Date, so the empty state never
 * hardcodes a term (SPEC "/events": hardcoded, it will say "Fall 2026" in 2028).
 * Spring and Fall are the only two labels the repo's own data uses
 * (app/projects/page.tsx: "Spring 2025", "Fall 2025", "Spring 2026"); the split
 * is at August, when the academic year turns over.
 */
export function currentTerm(now: Date): string {
  const term = now.getMonth() >= 7 ? "Fall" : "Spring";
  return `${term} ${now.getFullYear()}`;
}
