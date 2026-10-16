"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { editorSession, revalidateSite, takenBy } from "./content-helpers";
import { ok, withNotice, zDateOnly, zodFail, zText } from "./form-data";
import type { FormState } from "./form-state";
import { cleanupMedia, imageFieldError, readImageField, resolveImageField } from "./media-helpers";

const NewsShape = z.object({
  slug: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Lowercase letters, digits and dashes only." })),
  title: zText("a title", 200),
  published_on: zDateOnly,
  published: z.string().optional().transform((v) => v === "true" || v === "on"),
});

export async function saveNews(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await editorSession();
  const id = (fd.get("id") as string | null) || null;
  const parsed = NewsShape.safeParse(Object.fromEntries(fd));
  const image = readImageField(fd, "image");
  const imageError = imageFieldError(image, true);
  if (!parsed.success) return zodFail(parsed.error, imageError ? { image: [imageError] } : undefined);
  if (imageError || !image || image === "invalid") return { fieldErrors: { image: [imageError ?? "Add an image."] } };
  const v = parsed.data;

  const slugTaken = await takenBy(supabase, "news", "slug", v.slug, id, (r) => String(r.title));
  if (slugTaken) return { fieldErrors: { slug: [slugTaken] } };

  let oldMedia: string | null = null;
  if (id) {
    const { data } = await supabase.from("news").select("media_id").eq("id", id).maybeSingle();
    oldMedia = data?.media_id ?? null;
  }
  const media = await resolveImageField(supabase, image, "news", { updateExistingAlt: true });
  if ("error" in media) return { fieldErrors: { image: [media.error] } };
  const row = { ...v, media_id: media.id as string };

  if (id) {
    const { error } = await supabase.from("news").update(row).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
    if (oldMedia && oldMedia !== media.id) await cleanupMedia(supabase, [oldMedia]);
    revalidateSite();
    return ok();
  }
  const { data, error } = await supabase.from("news").insert(row).select("id").single();
  if (error) return { error: `Couldn't create the news item: ${error.message}` };
  revalidateSite();
  redirect(withNotice(`/admin/news/${data.id}`, `Created '${v.title}'.`));
}

export async function setNewsPublished(id: string, published: boolean): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("news").update({ published }).eq("id", id);
  revalidateSite();
}

export async function deleteNews(id: string): Promise<void> {
  const { supabase } = await editorSession();
  const { data } = await supabase.from("news").select("title, media_id").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/news");
  const { error } = await supabase.from("news").delete().eq("id", id);
  if (error) redirect(withNotice(`/admin/news/${id}`, `Couldn't delete: ${error.message}`));
  await cleanupMedia(supabase, [data.media_id]);
  revalidateSite();
  redirect(withNotice("/admin/news", `Deleted '${data.title}'.`));
}
