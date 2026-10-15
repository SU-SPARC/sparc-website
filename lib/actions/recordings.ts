"use server";

/* Recordings, edited inside an event's form (or standalone, event_id null). */

import { z } from "zod";

import { editorSession, moveInOrder, nextSortOrder, revalidateSite } from "./content-helpers";
import { ok, zDateOnly, zodFail, zOptText, zText, zUrl } from "./form-data";
import type { FormState } from "./form-state";

const RecordingShape = z.object({
  title: zText("a title", 200),
  recorded_on: zDateOnly,
  kind: zOptText.transform((v) => v ?? "Zoom Recording"),
  url: zUrl,
  description: zOptText.pipe(z.string().max(2000).nullable()),
  published: z.string().optional().transform((v) => v === "true" || v === "on"),
});

export async function saveRecording(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await editorSession();
  const id = (fd.get("id") as string | null) || null;
  const eventId = (fd.get("event_id") as string | null) || null;
  const parsed = RecordingShape.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodFail(parsed.error);

  if (id) {
    const { error } = await supabase.from("recordings").update(parsed.data).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
  } else {
    const sort_order = await nextSortOrder(supabase, "recordings");
    const { error } = await supabase.from("recordings").insert({ ...parsed.data, event_id: eventId, sort_order });
    if (error) return { error: `Couldn't add the recording: ${error.message}` };
  }
  revalidateSite();
  return ok();
}

export async function deleteRecording(id: string): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("recordings").delete().eq("id", id);
  revalidateSite();
}

export async function moveRecording(id: string, eventId: string | null, dir: "up" | "down"): Promise<void> {
  const { supabase } = await editorSession();
  await moveInOrder(supabase, "recordings", id, dir, { column: "event_id", value: eventId });
  revalidateSite();
}
