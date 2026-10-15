import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DangerZone } from "@/components/admin/edit-client";
import { EditHeader } from "@/components/admin/edit-layout";
import { EventForm } from "@/components/admin/forms/event-form";
import { RecordingsEditor } from "@/components/admin/recordings-editor";
import { StatusBanner } from "@/components/forms/status-banner";
import { instantToClubLocal, nextRef } from "@/lib/actions/content-helpers";
import { deleteEvent } from "@/lib/actions/events";
import { editorPage, MEDIA_COLS, toExistingImage, type MediaCols } from "@/lib/actions/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEvent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ notice?: string }>;
}) {
  const { id } = await params;
  const { notice } = await searchParams;
  const me = await editorPage(`/admin/events/${id}`);
  if (!me) return null;
  const supabase = await createClient();
  const [{ data: e }, { data: refs }, { data: recs }] = await Promise.all([
    supabase
      .from("events")
      .select(`*, cover:media!events_cover_media_id_fkey(${MEDIA_COLS})`)
      .eq("id", id)
      .maybeSingle(),
    supabase.from("events").select("ref"),
    supabase
      .from("recordings")
      .select("id, title, recorded_on, kind, url, description, published")
      .eq("event_id", id)
      .order("sort_order")
      .order("created_at"),
  ]);
  if (!e) notFound();
  const local = instantToClubLocal(e.starts_at);
  const recordings = recs ?? [];

  return (
    <>
      {notice ? <StatusBanner clearParam="notice" className="mb-6">{notice}</StatusBanner> : null}
      <EditHeader section="Events" sectionHref="/admin/events" title={e.title} siteHref={e.published ? "/events" : null} />
      <EventForm
        proposedRef={nextRef((refs ?? []).map((r) => r.ref), "#", 2).slice(1)}
        d={{
          id: e.id,
          ref: e.ref.replace(/^#/, ""),
          slug: e.slug,
          title: e.title,
          kind: e.kind,
          date: local.date,
          time: local.time === "00:00" ? "" : local.time,
          location: e.location ?? "",
          description: e.description ?? "",
          recording_url: e.recording_url ?? "",
          published: e.published,
          cover: toExistingImage(e.cover as MediaCols | null),
          created_at: e.created_at,
          updated_at: e.updated_at,
        }}
      />
      <RecordingsEditor eventId={e.id} rows={recordings} defaultDate={local.date} />
      <DangerZone
        noun="event"
        itemName={e.title}
        description={
          recordings.length > 0
            ? `Removes this event and its ${recordings.length === 1 ? "recording" : `${recordings.length} recordings`} from the site.`
            : "Removes this event from the site."
        }
        deleteAction={deleteEvent.bind(null, e.id)}
      />
    </>
  );
}
