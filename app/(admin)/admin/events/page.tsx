import type { Metadata } from "next";

import { ContentList, type ContentRow } from "@/components/admin/content-list";
import { deleteEvent, setEventPublished } from "@/lib/actions/events";
import { editorPage } from "@/lib/actions/queries";
import { formatInstant } from "@/lib/data/dates";
import { createClient } from "@/lib/supabase/server";
import { publicUrl } from "@/lib/supabase/storage";

export const metadata: Metadata = { title: "Events" };

function isUpcoming(iso: string): boolean {
  return new Date(iso).getTime() >= Date.now();
}

export default async function EventsAdmin({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const me = await editorPage("/admin/events");
  if (!me) return null;
  const { notice } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, ref, title, kind, starts_at, location, published, cover:media!events_cover_media_id_fkey(path, thumb_path), recordings(count)")
    .order("starts_at", { ascending: false });
  if (error) throw new Error(error.message);

  const rows: ContentRow[] = data.map((e) => {
    const when = formatInstant(new Date(e.starts_at), { month: "short", day: "numeric", year: "numeric" });
    const recs = (e.recordings as unknown as { count: number }[])[0]?.count ?? 0;
    return {
      id: e.id,
      title: e.title,
      href: `/admin/events/${e.id}`,
      meta: [e.ref, when, e.location].filter(Boolean).join(" · "),
      thumb: e.cover ? publicUrl(e.cover.thumb_path ?? e.cover.path) : null,
      published: e.published,
      tags: [isUpcoming(e.starts_at) ? "upcoming" : "past"],
      search: `${e.title} ${e.ref} ${e.kind} ${e.location ?? ""}`.toLowerCase(),
      siteHref: "/events",
      deleteNote:
        recs > 0
          ? `Removes this event and its ${recs === 1 ? "recording" : `${recs} recordings`} from the site.`
          : "Removes this event from the site.",
    };
  });

  return (
    <ContentList
      noun="event"
      title="Events"
      plural="events"
      purpose="Talks, panels and build nights. They appear on /events, newest first, upcoming on top."
      newHref="/admin/events/new"
      rows={rows}
      extraFilters={[
        { key: "upcoming", label: "Upcoming" },
        { key: "past", label: "Past" },
      ]}
      notice={notice}
      publishAction={setEventPublished}
      deleteAction={deleteEvent}
    />
  );
}
