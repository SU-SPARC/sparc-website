/* Row → page-type mappers. The only place DB rows are turned into the types
 * in ./types.ts. */

import type { Tables } from "@/lib/supabase/database.types";
import { mediaToImageRef, type MediaLike } from "@/lib/supabase/storage";

import type { ImageRef, Link, Member, News, Photo, Project, Recording, SparcEvent } from "./types";

/** A `media` row → ImageRef (src/thumb public URLs, blur, alt). */
export function toImageRef(row: MediaLike): ImageRef {
  return mediaToImageRef(row);
}

export function toImageRefOrNull(row: MediaLike | null | undefined): ImageRef | null {
  return row ? toImageRef(row) : null;
}

type MemberRow = Tables<"members"> & { photo: MediaLike | null };

export function toMember(row: MemberRow): Member {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nickname: row.nickname,
    photo: toImageRefOrNull(row.photo),
    class_year: row.class_year,
    status: row.status,
    role: row.role,
    role_term: row.role_term,
    role_history: row.role_history,
    badges: row.badges,
    participated: row.participated,
    bio: row.bio,
    linkedin: row.linkedin,
    website: row.website,
    eboard: row.eboard,
    sort_order: row.sort_order,
  };
}

type ProjectRow = Tables<"projects"> & {
  cover: MediaLike | null;
  gallery: { sort_order: number; media: MediaLike | null }[];
  supervisor_member: { name: string } | null;
};

export function toProject(row: ProjectRow): Project {
  const supervisorName = row.supervisor_member?.name ?? row.supervisor_name;
  return {
    id: row.id,
    ref: row.ref,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    status: row.status,
    term: row.term,
    summary: row.summary,
    highlights: row.highlights,
    cover: toImageRefOrNull(row.cover),
    gallery: [...row.gallery]
      .sort((a, b) => a.sort_order - b.sort_order)
      .flatMap((g) => (g.media ? [toImageRef(g.media)] : [])),
    repo_url: row.repo_url,
    live_url: row.live_url,
    sort_order: row.sort_order,
    methodology: row.methodology,
    supervisor:
      row.supervisor_kind && supervisorName
        ? { kind: row.supervisor_kind, name: supervisorName, member_id: row.supervisor_member_id }
        : null,
  };
}

type EventRow = Tables<"events"> & { cover: MediaLike | null };

export function toEvent(row: EventRow): SparcEvent {
  return {
    id: row.id,
    ref: row.ref,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    starts_at: new Date(row.starts_at),
    location: row.location,
    description: row.description,
    recording_url: row.recording_url,
    cover: toImageRefOrNull(row.cover),
  };
}

export function toRecording(row: Tables<"recordings">): Recording {
  return {
    id: row.id,
    title: row.title,
    recorded_on: row.recorded_on,
    kind: row.kind,
    url: row.url,
    description: row.description,
    event_id: row.event_id,
    sort_order: row.sort_order,
  };
}

type NewsRow = Tables<"news"> & { image: MediaLike | null };

/** Returns null when the image row is not readable (never for valid data:
 *  news.media_id is not null and media is publicly readable). */
export function toNews(row: NewsRow): News | null {
  if (!row.image) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    published_on: row.published_on,
    image: toImageRef(row.image),
  };
}

type PhotoRow = Tables<"photos"> & { image: MediaLike | null };

export function toPhoto(row: PhotoRow): Photo | null {
  if (!row.image) return null;
  return {
    id: row.id,
    image: toImageRef(row.image),
    caption: row.caption,
    taken_on: row.taken_on,
    featured: row.featured,
    sort_order: row.sort_order,
  };
}

export function toLink(row: Tables<"links">): Link {
  return {
    id: row.id,
    label: row.label,
    url: row.url,
    description: row.description,
    icon: row.icon,
    sort_order: row.sort_order,
  };
}
