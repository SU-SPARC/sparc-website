// SPARC content layer — types.
//
// Source of truth: supabase/schema.sql. Every field name below mirrors a column
// in that file exactly (snake_case, same nullability, same array columns), so
// swapping these modules for a live Supabase read is one change per module
// rather than a rewrite. The db-only columns `id` and `created_at` are omitted.
//
// Provenance rule for the data modules that use these types: every value is
// copy-paste traceable to app/team/page.tsx, app/events/page.tsx or
// app/projects/page.tsx. Do not edit by memory. Unknown fields ship empty with a
// visible TODO(content) comment — a plausible placeholder is worse than a gap.

/** schema.sql: `create type member_status as enum ('current', 'alumni')` */
export type MemberStatus = "current" | "alumni";

/** schema.sql: `create type project_kind as enum ('team', 'personal')` */
export type ProjectKind = "team" | "personal";

/** schema.sql: `create type project_status as enum ('completed', 'in_progress', 'archived')` */
export type ProjectStatus = "completed" | "in_progress" | "archived";

/** Mirrors `create table members`. */
export type Member = {
  /** unique — 'kanan-guliyev' */
  slug: string;
  name: string;
  /** 'Monty' */
  nickname: string | null;
  /** '/images/kanan.webp' */
  photo: string | null;
  class_year: number;
  status: MemberStatus;

  /** 'President'; null = general member */
  role: string | null;
  /** '2026' */
  role_term: string | null;
  /** {'Founding Member'} */
  role_history: string[];

  /** Free-form. Known values: 'founding', 'collegiatex' */
  badges: string[];
  /** Years participated: {2025, 2026} */
  participated: number[];

  bio: string | null;
  linkedin: string | null;
  website: string | null;
  /** e-board first, then the repo's own order */
  sort_order: number;
};

/** Mirrors `create table projects`. */
export type Project = {
  /** unique accession id, shown on the page — 'SP-001' */
  ref: string;
  slug: string;
  title: string;
  kind: ProjectKind;
  status: ProjectStatus;
  /** 'Spring 2025' */
  term: string;
  summary: string | null;
  highlights: string[];
  /** hover preview on the index */
  cover: string | null;
  /** 6–10 shots enable the strip layout */
  gallery: string[];
  repo_url: string | null;
  live_url: string | null;
  sort_order: number;
};

/** Mirrors `create table events`. */
export type SparcEvent = {
  /** unique — '#01' */
  ref: string;
  slug: string;
  title: string;
  /** repo values: 'Development' | 'Panel' | 'Guest' */
  kind: string;
  /**
   * A real Date, so upcoming-vs-past is derived from the data and never from a
   * hardcoded term string.
   */
  starts_at: Date;
  location: string | null;
  description: string | null;
  recording_url: string | null;
};

/**
 * Recordings are NOT a table in schema.sql — the schema models a recording as
 * `events.recording_url`, i.e. one recording attached to one event. The repo's
 * three Zoom recordings (Meeting 1/2/3, Feb 26 / Mar 24 / Apr 3 2026) do not
 * correspond to the three events (Feb 5 / Feb 12 / Mar 31), and nothing in the
 * repo maps one to the other. Per the orchestrator's decision they therefore
 * ship as their own list with `recording_url` null on every event; attaching
 * them would be a guess.
 */
export type Recording = {
  title: string;
  date: Date;
  /** repo value: 'Zoom Recording' (the repo field is named `type`) */
  kind: string;
  link: string;
  description: string;
};

/**
 * Like Recording, news has NO counterpart in schema.sql — there is no `news`
 * table. It is a site-content list recovered from the pre-S4 home page, and it
 * ships as its own module for the same reason the recordings do: the shape is
 * real and in use, but nothing in the schema models it yet. If news later earns
 * a table, this type is what that table should mirror.
 */
export type News = {
  slug: string;
  title: string;
  /**
   * A real Date, built local-midnight. The repo stored a display string
   * ('Fri, 24 Apr 2026'); the weekday in each string was checked against the
   * constructed date — see lib/content/news.ts.
   */
  date: Date;
  /** '/images/sparc-vc-5.webp' */
  image: string;
};
