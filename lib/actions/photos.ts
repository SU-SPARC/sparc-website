"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { editorSession, moveInOrder, nextSortOrder, revalidateSite } from "./content-helpers";
import { ok, withNotice, zodFail, zOptDateOnly, zOptText } from "./form-data";
import type { FormState } from "./form-state";
import { cleanupMedia, imageFieldError, readImageField, resolveImageField } from "./media-helpers";

const PhotoShape = z.object({
  caption: zOptText.pipe(z.string().max(300, { error: "Keep it under 300 characters." }).nullable()),
  taken_on: zOptDateOnly,
  featured: z.string().optional().transform((v) => v === "true" || v === "on"),
  published: z.string().optional().transform((v) => v === "true" || v === "on"),
});

export async function savePhoto(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await editorSession();
  const id = (fd.get("id") as string | null) || null;
  const parsed = PhotoShape.safeParse(Object.fromEntries(fd));
  const image = readImageField(fd, "image");
  const imageError = imageFieldError(image, true);
  if (!parsed.success) return zodFail(parsed.error, imageError ? { image: [imageError] } : undefined);
  if (imageError || !image || image === "invalid") return { fieldErrors: { image: [imageError ?? "Add an image."] } };

  let oldMedia: string | null = null;
  if (id) {
    const { data } = await supabase.from("photos").select("media_id").eq("id", id).maybeSingle();
    oldMedia = data?.media_id ?? null;
  }
  const media = await resolveImageField(supabase, image, "photos", { updateExistingAlt: true });
  if ("error" in media) return { fieldErrors: { image: [media.error] } };
  const row = { ...parsed.data, media_id: media.id as string };

  if (id) {
    const { error } = await supabase.from("photos").update(row).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
    if (oldMedia && oldMedia !== media.id) await cleanupMedia(supabase, [oldMedia]);
    revalidateSite();
    return ok();
  }
  const sort_order = await nextSortOrder(supabase, "photos");
  const { data, error } = await supabase.from("photos").insert({ ...row, sort_order }).select("id").single();
  if (error) return { error: `Couldn't add the photo: ${error.message}` };
  revalidateSite();
  redirect(withNotice(`/admin/photos/${data.id}`, "Photo added."));
}

export async function setPhotoPublished(id: string, published: boolean): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("photos").update({ published }).eq("id", id);
  revalidateSite();
}

export async function movePhoto(id: string, dir: "up" | "down"): Promise<void> {
  const { supabase } = await editorSession();
  await moveInOrder(supabase, "photos", id, dir);
  revalidateSite();
}

export async function deletePhoto(id: string): Promise<void> {
  const { supabase } = await editorSession();
  const { data } = await supabase.from("photos").select("caption, media_id").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/photos");
  const { error } = await supabase.from("photos").delete().eq("id", id);
  if (error) redirect(withNotice(`/admin/photos/${id}`, `Couldn't delete: ${error.message}`));
  await cleanupMedia(supabase, [data.media_id]);
  revalidateSite();
  redirect(withNotice("/admin/photos", data.caption ? `Deleted '${data.caption}'.` : "Deleted the photo."));
}
