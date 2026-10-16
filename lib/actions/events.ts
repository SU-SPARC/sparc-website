"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { clubLocalToInstant, editorSession, revalidateSite, takenBy } from "./content-helpers";
import { ok, withNotice, zDateOnly, zodFail, zOptText, zOptUrl, zText } from "./form-data";
import type { FormState } from "./form-state";
import { cleanupMedia, imageFieldError, readImageField, resolveImageField } from "./media-helpers";

const EventShape = z.object({
  ref: z
    .string()
    .transform((v) => v.trim().replace(/^#/, ""))
    .pipe(z.string().regex(/^[0-9A-Za-z-]{1,8}$/, { error: "Use digits, e.g. 07." })),
  slug: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Lowercase letters, digits and dashes only." })),
  title: zText("a title", 160),
  kind: zText("a kind", 40),
  date: zDateOnly,
  time: z
    .string()
    .optional()
    .transform((v) => (v ?? "").trim())
    .pipe(z.union([z.literal("").transform(() => null), z.string().regex(/^\d{2}:\d{2}$/, { error: "Use a time like 18:30." })])),
  location: zOptText,
  description: zOptText.pipe(z.string().max(4000).nullable()),
  recording_url: zOptUrl,
  published: z.string().optional().transform((v) => v === "true" || v === "on"),
});

export async function saveEvent(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await editorSession();
  const id = (fd.get("id") as string | null) || null;
  const parsed = EventShape.safeParse(Object.fromEntries(fd));
  const cover = readImageField(fd, "cover");
  const coverError = imageFieldError(cover, false);
  if (!parsed.success) return zodFail(parsed.error, coverError ? { cover: [coverError] } : undefined);
  if (coverError) return { fieldErrors: { cover: [coverError] } };
  const v = parsed.data;
  const ref = `#${v.ref}`;

  const [refTaken, slugTaken] = await Promise.all([
    takenBy(supabase, "events", "ref", ref, id, (r) => String(r.title)),
    takenBy(supabase, "events", "slug", v.slug, id, (r) => String(r.title)),
  ]);
  if (refTaken || slugTaken) {
    return { fieldErrors: { ...(refTaken ? { ref: [refTaken] } : {}), ...(slugTaken ? { slug: [slugTaken] } : {}) } };
  }

  let oldCover: string | null = null;
  if (id) {
    const { data } = await supabase.from("events").select("cover_media_id").eq("id", id).maybeSingle();
    oldCover = data?.cover_media_id ?? null;
  }
  const media = cover === undefined || cover === "invalid" ? { id: oldCover } : await resolveImageField(supabase, cover, "events", { updateExistingAlt: true });
  if ("error" in media) return { fieldErrors: { cover: [media.error] } };

  const row = {
    ref,
    slug: v.slug,
    title: v.title,
    kind: v.kind,
    starts_at: clubLocalToInstant(v.date, v.time),
    location: v.location,
    description: v.description,
    recording_url: v.recording_url,
    cover_media_id: media.id,
    published: v.published,
  };

  if (id) {
    const { error } = await supabase.from("events").update(row).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
    if (oldCover && oldCover !== media.id) await cleanupMedia(supabase, [oldCover]);
    revalidateSite();
    return ok();
  }
  const { data, error } = await supabase.from("events").insert(row).select("id").single();
  if (error) return { error: `Couldn't create the event: ${error.message}` };
  revalidateSite();
  redirect(withNotice(`/admin/events/${data.id}`, `Created '${v.title}'.`));
}

export async function setEventPublished(id: string, published: boolean): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("events").update({ published }).eq("id", id);
  revalidateSite();
}

export async function deleteEvent(id: string): Promise<void> {
  const { supabase } = await editorSession();
  const { data } = await supabase.from("events").select("title, cover_media_id").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/events");
  // Recordings of this event go with it (the brief's delete copy says so);
  // the FK alone would only detach them.
  await supabase.from("recordings").delete().eq("event_id", id);
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) redirect(withNotice(`/admin/events/${id}`, `Couldn't delete: ${error.message}`));
  await cleanupMedia(supabase, [data.cover_media_id]);
  revalidateSite();
  redirect(withNotice("/admin/events", `Deleted '${data.title}'.`));
}
