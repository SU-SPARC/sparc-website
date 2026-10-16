import type { Metadata } from "next";

import { EditHeader } from "@/components/admin/edit-layout";
import { EventForm } from "@/components/admin/forms/event-form";
import { nextRef } from "@/lib/actions/content-helpers";
import { editorPage } from "@/lib/actions/queries";
import { isoDateOnly } from "@/lib/data/dates";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New event" };

export default async function NewEvent() {
  const me = await editorPage("/admin/events/new");
  if (!me) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("ref");
  const proposed = nextRef((data ?? []).map((r) => r.ref), "#", 2).slice(1);

  return (
    <>
      <EditHeader section="Events" sectionHref="/admin/events" title="New event" />
      <EventForm
        proposedRef={proposed}
        d={{
          id: null,
          ref: proposed,
          slug: "",
          title: "",
          kind: "Development",
          date: isoDateOnly(new Date()),
          time: "18:00",
          location: "73 Tremont Room 8065",
          description: "",
          recording_url: "",
          published: true,
          cover: null,
          created_at: null,
          updated_at: null,
        }}
      />
    </>
  );
}
