// SPARC data layer — types.
//
// Source of truth: supabase/migrations/0001_cms.sql. Field names mirror the
// columns (snake_case, same nullability, same array columns) except where the
// data layer resolves a reference for the page:
//   * image columns (`*_media_id`) become `ImageRef` objects,
//   * `events.starts_at` becomes a real `Date` (an instant),
//   * date-only columns stay `DateOnly` strings ('YYYY-MM-DD') end to end and
//     are formatted with formatDateOnly() — never through `new Date(str)`.
// Bookkeeping columns (`created_at`, `updated_at`, `published`, request and
// approval metadata) are omitted: public pages only ever see published rows.

/** A resolved `media` row, ready for next/image. */
export type ImageRef = {
  /** public URL of the full image (long edge ≤ 2000px) */
  src: string;
  /** public URL of the 640px variant; equals `src` when there is none */
  thumb: string;
  width: number;
  height: number;
  /** ~24px data: URL for placeholder="blur", or null */
  blur: string | null;
  alt: string;
};

/** A calendar date with no time or zone: 'YYYY-MM-DD'. */
export type DateOnly = string;

/** `create type member_status as enum ('current', 'alumni')` */
export type MemberStatus = "current" | "alumni";

/** `create type project_kind as enum ('team', 'personal')` */
export type ProjectKind = "team" | "personal";

/** `create type project_status as enum ('proposed', 'in_progress', 'completed', 'archived')`.
 *  'proposed' = a pending request; never returned by getProjects(). */
export type ProjectStatus = "proposed" | "in_progress" | "completed" | "archived";

/** `create type methodology as enum ('kanban', 'scrumban', 'scrum', 'safe')` */
export type Methodology = "kanban" | "scrumban" | "scrum" | "safe";

/** `create type supervisor_kind as enum ('faculty', 'student')` */
export type SupervisorKind = "faculty" | "student";

/** Mirrors `members`. */
export type Member = {
  id: string;
  /** unique — 'kanan-guliyev' */
  slug: string;
  name: string;
  /** 'Monty' */
  nickname: string | null;
  photo: ImageRef | null;
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
  /** E-Board flag (replaces the old `sort_order < 100` convention). */
  eboard: boolean;
  /** display order, ascending */
  sort_order: number;
};

/** Who supervises a project. `name` is resolved: the linked member card's name
 *  when `member_id` is set, otherwise `projects.supervisor_name`. */
export type Supervisor = {
  kind: SupervisorKind;
  name: string;
  member_id: string | null;
};

/** Mirrors `projects`. */
export type Project = {
  id: string;
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
  cover: ImageRef | null;
  /** ordered; 6–10 shots enable the strip layout */
  gallery: ImageRef[];
  /** the GitHub link */
  repo_url: string | null;
  live_url: string | null;
  sort_order: number;
  methodology: Methodology;
  supervisor: Supervisor | null;
};

/** Mirrors `events`. */
export type SparcEvent = {
  id: string;
  /** unique — '#01' */
  ref: string;
  slug: string;
  title: string;
  /** repo values: 'Development' | 'Panel' | 'Guest' */
  kind: string;
  /**
   * A real Date (an instant), so upcoming-vs-past is derived from the data and
   * never from a hardcoded term string. Format with formatInstant(), which pins
   * America/New_York.
   */
  starts_at: Date;
  location: string | null;
  description: string | null;
  recording_url: string | null;
  cover: ImageRef | null;
};

/** Mirrors `recordings` — Zoom recordings, optionally attached to an event. */
export type Recording = {
  id: string;
  title: string;
  recorded_on: DateOnly;
  /** 'Zoom Recording' */
  kind: string;
  url: string;
  description: string | null;
  event_id: string | null;
  sort_order: number;
};

/** Mirrors `news` — the home-page news cards. Every card links to /events. */
export type News = {
  id: string;
  slug: string;
  title: string;
  published_on: DateOnly;
  image: ImageRef;
};

/** Mirrors `photos` — the curated gallery. */
export type Photo = {
  id: string;
  image: ImageRef;
  caption: string | null;
  taken_on: DateOnly | null;
  /** The About page photo is the first featured photo. */
  featured: boolean;
  sort_order: number;
};

/** Mirrors `links` — the /links page. */
export type Link = {
  id: string;
  label: string;
  url: string;
  description: string | null;
  /** lucide-react icon name */
  icon: string | null;
  sort_order: number;
};
