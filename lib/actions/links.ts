"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { editorSession, moveInOrder, nextSortOrder, revalidateSite } from "./content-helpers";
import { ok, withNotice, zodFail, zOptText, zText } from "./form-data";
import type { FormState } from "./form-state";

const LinkShape = z.object({
  label: zText("a label", 80),
  url: z
    .string()
    .transform((v) => v.trim())
    .pipe(
      z.union([
        z.url({ protocol: /^https?$/, error: "Enter a full link starting with https:// (or mailto:)." }),
        z.string().regex(/^mailto:[^\s@]+@[^\s@]+$/, { error: "Enter a full link starting with https:// (or mailto:)." }),
      ]),
    ),
  description: zOptText.pipe(z.string().max(160, { error: "Keep it under 160 characters." }).nullable()),
  icon: zOptText.pipe(
    z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: "Use a lucide icon name like message-circle." })
      .nullable(),
  ),
  published: z.string().optional().transform((v) => v === "true" || v === "on"),
});

export async function saveLink(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase } = await editorSession();
  const id = (fd.get("id") as string | null) || null;
  const parsed = LinkShape.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return zodFail(parsed.error);

  if (id) {
    const { error } = await supabase.from("links").update(parsed.data).eq("id", id);
    if (error) return { error: `Couldn't save: ${error.message}` };
    revalidateSite();
    return ok();
  }
  const sort_order = await nextSortOrder(supabase, "links");
  const { data, error } = await supabase.from("links").insert({ ...parsed.data, sort_order }).select("id").single();
  if (error) return { error: `Couldn't create the link: ${error.message}` };
  revalidateSite();
  redirect(withNotice(`/admin/links/${data.id}`, `Created '${parsed.data.label}'.`));
}

export async function setLinkPublished(id: string, published: boolean): Promise<void> {
  const { supabase } = await editorSession();
  await supabase.from("links").update({ published }).eq("id", id);
  revalidateSite();
}

export async function moveLink(id: string, dir: "up" | "down"): Promise<void> {
  const { supabase } = await editorSession();
  await moveInOrder(supabase, "links", id, dir);
  revalidateSite();
}

export async function deleteLink(id: string): Promise<void> {
  const { supabase } = await editorSession();
  const { data } = await supabase.from("links").select("label").eq("id", id).maybeSingle();
  if (!data) redirect("/admin/links");
  const { error } = await supabase.from("links").delete().eq("id", id);
  if (error) redirect(withNotice(`/admin/links/${id}`, `Couldn't delete: ${error.message}`));
  revalidateSite();
  redirect(withNotice("/admin/links", `Deleted '${data.label}'.`));
}
